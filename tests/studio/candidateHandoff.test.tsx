// @vitest-environment jsdom
import '../setup';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { CandidateGenerationReport } from '../../packages/candidate-generation/src/types';
import { formatVerifiedCandidateHandoff } from '../../apps/studio/src/candidateHandoff';
import { ResultWorkspace } from '../../apps/studio/src/WorkspaceComponents';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function verifiedReport(): CandidateGenerationReport {
  const identity = 'plan-v2-fixture-verified';
  return {
    version: 1,
    generationId: 'f'.repeat(16),
    integrationPlan: { version: 2, identity },
    status: 'succeeded',
    stage: 'complete',
    message: 'Internal diagnostic SECRET-MESSAGE',
    repository: {
      baseCommit: '1'.repeat(40),
      candidateBranch: 'verified-combined-branch',
      candidateCommit: '2'.repeat(40),
      candidateTree: '3'.repeat(40),
      worktreePath: '/private/worktree/SECRET',
      provenance: { generationId: 'f'.repeat(16), planIdentity: identity, profile: 'phase0' }
    },
    sliceIds: ['slice-a', 'slice-b'],
    plan: {
      version: 1,
      status: 'ready',
      repository: { baseCommit: '1'.repeat(40), candidateBranch: 'verified-combined-branch', foundationRef: 'main' },
      sliceIds: ['slice-a', 'slice-b'],
      operations: [],
      conflicts: [],
      unresolved: []
    },
    appliedOperations: [], excludedSourceChanges: [], conflicts: [],
    verification: [
      { name: 'typecheck', command: 'echo SECRET-COMMAND', status: 'passed', exitCode: 0, outputTail: 'SECRET-LOG' },
      { name: 'production-build', command: 'echo SECRET-COMMAND-2', status: 'passed', exitCode: 0, outputTail: 'SECRET-LOG-2' }
    ],
    cleanup: { worktreeRemoved: true, processesStopped: true, detail: 'SECRET-CLEANUP' },
    relativePath: '/private/SECRET-REPORT.json'
  };
}

test('exports an allowlisted, deterministic local-only handoff with accurate Git and plan evidence', () => {
  const report = verifiedReport();
  const text = formatVerifiedCandidateHandoff(report);
  expect(text).not.toBeNull();
  expect(JSON.parse(text!)).toEqual({
    format: 'ui-merge-studio/verified-candidate-handoff/v1',
    scope: 'local-git-candidate',
    delivery: 'not-pushed-or-deployed',
    branch: 'verified-combined-branch',
    candidateCommit: '2'.repeat(40),
    candidateTree: '3'.repeat(40),
    baseCommit: '1'.repeat(40),
    planIdentity: 'plan-v2-fixture-verified',
    generationId: 'f'.repeat(16),
    profile: 'phase0',
    sourceSlices: 2,
    plannedOperations: 0,
    verification: [{ name: 'typecheck', status: 'passed' }, { name: 'production-build', status: 'passed' }],
    cleanup: { worktreeRemoved: true, processesStopped: true }
  });
  expect(formatVerifiedCandidateHandoff(report)).toBe(text);
  for (const secret of ['SECRET-MESSAGE', 'SECRET-COMMAND', 'SECRET-LOG', 'SECRET-CLEANUP', '/private/', 'worktreePath', 'relativePath']) {
    expect(text).not.toContain(secret);
  }
});

test.each([
  ['failed status', (r: CandidateGenerationReport) => { r.status = 'failed'; }],
  ['incomplete Git commit', (r: CandidateGenerationReport) => { r.repository.candidateCommit = undefined; }],
  ['missing tree', (r: CandidateGenerationReport) => { r.repository.candidateTree = undefined; }],
  ['plan identity mismatch', (r: CandidateGenerationReport) => { r.repository.provenance.planIdentity = 'not-the-plan'; }],
  ['generation mismatch', (r: CandidateGenerationReport) => { r.repository.provenance.generationId = 'not-this-generation'; }],
  ['wrong candidate branch', (r: CandidateGenerationReport) => { r.plan.repository.candidateBranch = 'different'; }],
  ['wrong base commit', (r: CandidateGenerationReport) => { r.plan.repository.baseCommit = 'a'.repeat(40); }],
  ['unresolved plan', (r: CandidateGenerationReport) => { r.plan.status = 'refused'; }],
  ['failed check', (r: CandidateGenerationReport) => { r.verification[0].status = 'failed'; }],
  ['nonzero exit code', (r: CandidateGenerationReport) => { r.verification[0].exitCode = 1; }],
  ['missing verification', (r: CandidateGenerationReport) => { r.verification = []; }],
  ['worktree not cleaned', (r: CandidateGenerationReport) => { r.cleanup.worktreeRemoved = false; }],
  ['process not stopped', (r: CandidateGenerationReport) => { r.cleanup.processesStopped = false; }]
])('refuses to export a purported verified handoff with %s', (_name, corrupt) => {
  const report = verifiedReport();
  corrupt(report);
  expect(formatVerifiedCandidateHandoff(report)).toBeNull();
});

const foundation = { repositoryId: 'test-repository', branchRef: 'main', commitSha: '1'.repeat(40), commonAncestorCommit: '1'.repeat(40), role: 'base' as const };

function showResult(report = verifiedReport()) {
  render(<ResultWorkspace report={report} foundation={foundation} selections={[{ branch: 'branch-a', label: 'Sidebar' }]}
    onOpen={() => undefined} onEvidence={() => undefined} onCopy={() => undefined} onReturn={() => undefined} />);
}

test('copies only after clipboard permission succeeds and shows accessible feedback', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  showResult();
  fireEvent.click(screen.getByRole('button', { name: 'Copy verified handoff' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  expect(JSON.parse(writeText.mock.calls[0][0]).delivery).toBe('not-pushed-or-deployed');
  expect(await screen.findByRole('status')).toHaveTextContent('handoff copied');
});

test('reports a failed clipboard operation without claiming the handoff was copied', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  showResult();
  fireEvent.click(screen.getByRole('button', { name: 'Copy verified handoff' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Could not copy');
  expect(screen.queryByText(/handoff copied/i)).not.toBeInTheDocument();
});

test('does not offer copy action for an unverified result', () => {
  const incomplete = verifiedReport();
  incomplete.cleanup.worktreeRemoved = false;
  showResult(incomplete);
  expect(screen.getByRole('button', { name: 'Copy verified handoff' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('not fully verified');
});
