import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import type { CandidateGenerationReport } from '../../packages/candidate-generation/src/types';
import { VisualReviewAuthority, VisualReviewError } from '../../apps/studio/visualReviewAuthority';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

const artifactRoots: string[] = [];
afterEach(() => {
  cleanupRepositories();
  for (const root of artifactRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = createRepository({ 'README.md': 'Fixture foundation\n' });
  const baseCommit = git(root, ['rev-parse', 'main']);
  git(root, ['switch', '-c', 'combined-result']);
  writeFiles(root, { 'src/Feature.tsx': 'export function Feature(){return null}\n' });
  const candidateCommit = commit(root, 'feat: bounded candidate');
  const candidateTree = git(root, ['rev-parse', candidateCommit + '^{tree}']);
  git(root, ['switch', 'main']);
  const artifactRoot = mkdtempSync(resolve(tmpdir(), 'ums-visual-review-'));
  artifactRoots.push(artifactRoot);
  const generationId = 'a'.repeat(16);
  const identity = 'review-plan-v2';
  const report: CandidateGenerationReport = {
    version: 1, generationId, integrationPlan: { version: 2, identity },
    status: 'succeeded', stage: 'complete', message: 'Candidate generated.',
    repository: {
      baseCommit, candidateBranch: 'combined-result', candidateCommit, candidateTree,
      provenance: { generationId, planIdentity: identity, profile: 'phase0' }
    },
    sliceIds: ['slice-one'],
    plan: {
      version: 1, status: 'ready',
      repository: { baseCommit, candidateBranch: 'combined-result' },
      sliceIds: ['slice-one'], operations: [], conflicts: [], unresolved: []
    },
    appliedOperations: [], excludedSourceChanges: [], conflicts: [],
    verification: [{ name: 'typecheck', command: 'npm run typecheck', status: 'passed', exitCode: 0, outputTail: '' }],
    cleanup: { worktreeRemoved: true, processesStopped: true, detail: 'clean' },
    relativePath: '.ums/generation/report'
  };
  const reportPath = resolve(artifactRoot, '.ums', 'generation', generationId, 'candidate-report.json');
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report));
  return { root, artifactRoot, generationId, candidateCommit, candidateTree, report, reportPath,
    authority: new VisualReviewAuthority(root, artifactRoot) };
}

test('persists an immutable self-attested review bound to the verified candidate SHA, tree, and plan', async () => {
  const { root, artifactRoot, generationId, candidateCommit, candidateTree, authority } = fixture();
  expect(await authority.get(generationId)).toEqual({ status: 'pending', receipt: null });
  const first = await authority.record(generationId, {
    decision: 'looks-as-intended', notes: 'Sidebar remains aligned with the foundation.'
  });
  expect(first).toMatchObject({
    status: 'recorded',
    receipt: {
      version: 1, scope: 'local-self-attested-visual-review', generationId,
      candidateCommit, candidateTree, planIdentity: 'review-plan-v2',
      candidateBranch: 'combined-result', decision: 'looks-as-intended',
      notes: 'Sidebar remains aligned with the foundation.'
    }
  });
  expect(first.receipt?.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  const restarted = new VisualReviewAuthority(root, artifactRoot);
  expect(await restarted.get(generationId)).toEqual(first);
  expect(await restarted.record(generationId, {
    decision: 'looks-as-intended', notes: 'Sidebar remains aligned with the foundation.'
  })).toEqual(first);
  expect(git(root, ['rev-parse', 'combined-result'])).toBe(candidateCommit);
  expect(git(root, ['status', '--porcelain'])).toBe('');
});

test('preserves the first attestation and refuses a contradictory second decision', async () => {
  const { authority, generationId } = fixture();
  await authority.record(generationId, { decision: 'needs-changes', notes: 'Header overlaps the nearby controls.' });
  await expect(authority.record(generationId, {
    decision: 'looks-as-intended', notes: 'All controls appear to be aligned.'
  })).rejects.toMatchObject({ name: 'VisualReviewError', statusCode: 409 });
  expect((await authority.get(generationId)).receipt?.decision).toBe('needs-changes');
});

test('marks a persisted review stale when the candidate branch moves, and refuses new attestations', async () => {
  const { root, authority, generationId, candidateCommit } = fixture();
  await authority.record(generationId, { decision: 'looks-as-intended', notes: 'Controls look correct in this revision.' });
  git(root, ['switch', 'combined-result']);
  writeFiles(root, { 'src/Feature.tsx': 'export function Feature(){return <div>new revision</div>}\n' });
  commit(root, 'feat: moved candidate head');
  git(root, ['switch', 'main']);
  const snapshot = await authority.get(generationId);
  expect(snapshot).toMatchObject({ status: 'stale', receipt: { candidateCommit }, reason: expect.stringContaining('no longer points') });
  await expect(authority.record(generationId, {
    decision: 'looks-as-intended', notes: 'Controls look correct in this revision.'
  })).rejects.toMatchObject({ statusCode: 409 });
});

test('refuses malformed input, browser-authored candidate identities, and unverified generation artifacts', async () => {
  const { authority, generationId, report, reportPath } = fixture();
  for (const input of [
    { decision: 'looks-as-intended', notes: 'short' },
    { decision: 'approved-by-tests', notes: 'This is not a supported review outcome.' },
    { decision: 'looks-as-intended', notes: 'Looks fine to me.', candidateCommit: 'b'.repeat(40) },
    { decision: 'needs-changes', notes: 'x'.repeat(401) }
  ]) await expect(authority.record(generationId, input)).rejects.toMatchObject({ statusCode: 400 });
  await expect(authority.get('../unsafe')).rejects.toBeInstanceOf(VisualReviewError);
  report.cleanup.worktreeRemoved = false;
  writeFileSync(reportPath, JSON.stringify(report));
  await expect(authority.get(generationId)).rejects.toMatchObject({ statusCode: 409 });
  await expect(authority.record(generationId, {
    decision: 'looks-as-intended', notes: 'This was not fully verified.'
  })).rejects.toMatchObject({ statusCode: 409 });
});
