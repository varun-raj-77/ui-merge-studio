import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import type { CandidateGenerationReport } from '../../packages/candidate-generation/src/types';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { VisualSnapshotAuthority } from '../../apps/studio/visualSnapshotAuthority';
import { VisualReviewAuthority } from '../../apps/studio/visualReviewAuthority';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

const artifactRoots: string[] = [];
afterEach(() => {
  cleanupRepositories();
  for (const root of artifactRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = createRepository({ 'README.md': 'Foundation\n' });
  const baseCommit = git(root, ['rev-parse', 'main']);
  git(root, ['switch', '-c', 'combined-result']);
  writeFiles(root, { 'src/Feature.tsx': 'export function Feature(){return null}\n' });
  const candidateCommit = commit(root, 'feat: candidate');
  const candidateTree = git(root, ['rev-parse', candidateCommit + '^{tree}']);
  git(root, ['switch', 'main']);
  const artifactRoot = mkdtempSync(resolve(tmpdir(), 'ums-local-screenshots-'));
  artifactRoots.push(artifactRoot);
  const generationId = 'e'.repeat(16);
  const planIdentity = 'snapshot-plan-v2';
  const report: CandidateGenerationReport = {
    version: 1, generationId, integrationPlan: { version: 2, identity: planIdentity },
    status: 'succeeded', stage: 'complete', message: 'Verified',
    repository: {
      baseCommit, candidateBranch: 'combined-result', candidateCommit, candidateTree,
      provenance: { generationId, planIdentity, profile: 'phase0' }
    },
    sliceIds: ['slice'], plan: {
      version: 1, status: 'ready', repository: { baseCommit, candidateBranch: 'combined-result' },
      sliceIds: ['slice'], operations: [], conflicts: [], unresolved: []
    },
    appliedOperations: [], excludedSourceChanges: [], conflicts: [],
    verification: [{ name: 'typecheck', command: 'npm run typecheck', status: 'passed', exitCode: 0, outputTail: '' }],
    cleanup: { worktreeRemoved: true, processesStopped: true, detail: 'clean' }, relativePath: 'artifact'
  };
  const reportPath = resolve(artifactRoot, '.ums', 'generation', generationId, 'candidate-report.json');
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report));

  const session = (previewId: string, branch: string, branchCommit: string, port: number) => ({
    previewId, branch, branchCommit, status: 'running', url: 'http://127.0.0.1:' + port + '/catalogue',
    origin: 'http://127.0.0.1:' + port, port
  }) as PreviewSession;
  const current: { left: PreviewSession; right: PreviewSession } = {
    left: session('left', 'branch-a', 'a'.repeat(40), 48210),
    right: session('right', 'branch-b', 'b'.repeat(40), 48211)
  };
  const alive = { left: true, right: true };
  const previews = {
    session: (slot: 'left' | 'right') => current[slot],
    isAlive: (slot: 'left' | 'right') => alive[slot]
  };
  const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
  const capturePair = vi.fn(async (_sourceUrl: string, _candidateUrl: string) => ({ source: png, candidate: png }));
  const authority = new VisualSnapshotAuthority(artifactRoot, new VisualReviewAuthority(root, artifactRoot), previews, capturePair);
  return { root, artifactRoot, generationId, report, candidateCommit, current, alive, session, png, authority, capturePair };
}

test('captures opt-in real-preview pairs with immutable generation-time A/B pins and local-only PNGs', async () => {
  const f = fixture();
  await f.authority.register(f.report);
  expect((await f.authority.get(f.generationId)).status).toBe('ready');
  f.current.right = f.session('right', 'combined-result', f.candidateCommit, 48212);
  const result = await f.authority.capture(f.generationId, { source: 'A', route: '/catalogue' });
  expect(result.captures.A).toMatchObject({
    generationId: f.generationId, sourceBranch: 'branch-a', sourceCommit: 'a'.repeat(40),
    candidateCommit: f.candidateCommit, viewport: { width: 1280, height: 800 }
  });
  expect(result.captures.B).toBeNull();
  const expectedDigest = createHash('sha256').update(f.png).digest('hex');
  expect(result.captures.A).toMatchObject({
    version: 3, route: '/catalogue', sourceSha256: expectedDigest, candidateSha256: expectedDigest
  });
  expect(f.capturePair).toHaveBeenCalledWith('http://127.0.0.1:48210/catalogue', 'http://127.0.0.1:48212/catalogue');
  expect(await f.authority.image(f.generationId, 'A', 'source')).toEqual(f.png);
  expect(await f.authority.image(f.generationId, 'A', 'candidate')).toEqual(f.png);
  expect((await f.authority.capture(f.generationId, { source: 'A', route: '/catalogue' })).captures.A).toEqual(result.captures.A);
  expect(f.capturePair).toHaveBeenCalledTimes(1);
  // A second source is still bound to the original right-slot SHA after the slot changes.
  f.current.left = f.session('left', 'branch-b', 'b'.repeat(40), 48213);
  const b = await f.authority.capture(f.generationId, { source: 'B', route: '/catalogue' });
  expect(b.captures.B?.sourceCommit).toBe('b'.repeat(40));
  const restarted = new VisualSnapshotAuthority(f.artifactRoot, new VisualReviewAuthority(f.root, f.artifactRoot), {
    session: slot => f.current[slot], isAlive: () => true
  }, f.capturePair);
  expect((await restarted.get(f.generationId)).captures).toEqual(b.captures);
  expect(git(f.root, ['status', '--porcelain'])).toBe('');
});

test('refuses forged URLs, commits, stale preview slots and branch movement', async () => {
  const f = fixture();
  await f.authority.register(f.report);
  f.current.right = f.session('right', 'combined-result', f.candidateCommit, 48212);
  for (const input of [{ source: 'A', route: '/catalogue', url: 'http://example.com' }, { source: 'C', route: '/catalogue' }, { source: 'B', route: '/catalogue', commit: 'c'.repeat(40) }, {},
    ...['https://example.com', '//example.com', '/../../safe', '/%2e%2e/', '/catalogue?mode=1', '/catalogue#x', '/catalogue//item', '/foo\\bar']
      .map(route => ({ source: 'A', route }))]) {
    await expect(f.authority.capture(f.generationId, input)).rejects.toMatchObject({ statusCode: 400 });
  }
  await expect(f.authority.capture('../bad', { source: 'A', route: '/catalogue' })).rejects.toMatchObject({ statusCode: 400 });
  await expect(f.authority.capture(f.generationId, { source: 'B', route: '/catalogue' })).rejects.toMatchObject({ statusCode: 409 });
  f.current.left = f.session('left', 'branch-a', 'a'.repeat(40), 48210);
  f.current.right.url = 'http://example.com/catalogue';
  await expect(f.authority.capture(f.generationId, { source: 'A', route: '/catalogue' })).rejects.toMatchObject({ statusCode: 409 });
  f.current.right = f.session('right', 'combined-result', f.candidateCommit, 48212);
  f.alive.left = false;
  await expect(f.authority.capture(f.generationId, { source: 'A', route: '/catalogue' })).rejects.toMatchObject({ statusCode: 409 });
  f.alive.left = true;
  git(f.root, ['switch', 'combined-result']);
  writeFiles(f.root, { 'src/Feature.tsx': 'export function Feature(){return <div>new</div>}\n' });
  commit(f.root, 'feat: move candidate branch');
  git(f.root, ['switch', 'main']);
  expect((await f.authority.get(f.generationId)).status).toBe('stale');
  await expect(f.authority.capture(f.generationId, { source: 'A', route: '/catalogue' })).rejects.toMatchObject({ statusCode: 409 });
});

test('cannot replace pins or capture a report whose verified candidate identity was altered', async () => {
  const f = fixture();
  await f.authority.register(f.report);
  f.current.left = f.session('left', 'branch-a', 'c'.repeat(40), 48214);
  await expect(f.authority.register(f.report)).rejects.toMatchObject({ statusCode: 409 });
  const path = resolve(f.artifactRoot, '.ums', 'generation', f.generationId, 'candidate-report.json');
  f.report.repository.candidateCommit = 'd'.repeat(40);
  writeFileSync(path, JSON.stringify(f.report));
  await expect(f.authority.get(f.generationId)).rejects.toMatchObject({ statusCode: 409 });
});


test('rejects modified, deleted, or replaced local screenshot bytes even when Git pins are unchanged', async () => {
  const f = fixture();
  await f.authority.register(f.report);
  f.current.right = f.session('right', 'combined-result', f.candidateCommit, 48212);
  await f.authority.capture(f.generationId, { source: 'A', route: '/catalogue' });
  const folder = resolve(f.artifactRoot, '.ums', 'visual-snapshots', f.generationId, 'A');
  const manifest = JSON.parse(readFileSync(resolve(folder, 'manifest.json'), 'utf8')) as {
    sourceFile: string; candidateFile: string; sourceSha256: string; candidateSha256: string; version: number;
  };
  expect(manifest.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  const sourcePath = resolve(folder, manifest.sourceFile);
  const candidatePath = resolve(folder, manifest.candidateFile);
  const tamperedPng = Buffer.concat([f.png, Buffer.from('altered')]);
  writeFileSync(sourcePath, tamperedPng);
  await expect(f.authority.get(f.generationId)).rejects.toMatchObject({
    statusCode: 409, message: expect.stringContaining('source A screenshot')
  });
  await expect(f.authority.image(f.generationId, 'A', 'source')).rejects.toMatchObject({ statusCode: 409 });

  writeFileSync(sourcePath, f.png);
  writeFileSync(candidatePath, tamperedPng);
  await expect(f.authority.get(f.generationId)).rejects.toMatchObject({
    statusCode: 409, message: expect.stringContaining('candidate A screenshot')
  });
  writeFileSync(candidatePath, f.png);
  rmSync(candidatePath);
  await expect(f.authority.image(f.generationId, 'A', 'candidate')).rejects.toMatchObject({ statusCode: 409 });
  expect(git(f.root, ['status', '--porcelain'])).toBe('');
});

test('refuses digest-forged or legacy manifests instead of silently blessing old screenshots', async () => {
  const f = fixture();
  await f.authority.register(f.report);
  f.current.right = f.session('right', 'combined-result', f.candidateCommit, 48212);
  await f.authority.capture(f.generationId, { source: 'A', route: '/catalogue' });
  const path = resolve(f.artifactRoot, '.ums', 'visual-snapshots', f.generationId, 'A', 'manifest.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as {
    version: number; sourceSha256: string; candidateSha256: string;
  };
  writeFileSync(path, JSON.stringify({ ...manifest, sourceSha256: '0'.repeat(64) }));
  await expect(f.authority.get(f.generationId)).rejects.toMatchObject({ statusCode: 409 });
  writeFileSync(path, JSON.stringify({ ...manifest, version: 2, route: undefined }));
  await expect(f.authority.get(f.generationId)).rejects.toMatchObject({
    statusCode: 409, message: expect.stringContaining('Legacy screenshots lack exact route provenance')
  });
  writeFileSync(path, JSON.stringify({ ...manifest, version: 1, sourceSha256: undefined, candidateSha256: undefined }));
  await expect(f.authority.get(f.generationId)).rejects.toMatchObject({
    statusCode: 409, message: expect.stringContaining('Legacy screenshots lack exact route provenance')
  });
});


test('preserves the first screenshot and captures two independent additional routes at the exact pinned commits', async () => {
  const f = fixture();
  await f.authority.register(f.report);
  f.current.right = f.session('right', 'combined-result', f.candidateCommit, 48212);
  f.capturePair.mockImplementation(async (sourceUrl, candidateUrl) => ({
    source: Buffer.concat([f.png, Buffer.from(sourceUrl)]),
    candidate: Buffer.concat([f.png, Buffer.from(candidateUrl)])
  }));
  const first = await f.authority.capture(f.generationId, { source: 'A', route: '/products/desk-stand' });
  const original = await f.authority.image(f.generationId, 'A', 'source');
  const second = await f.authority.capture(f.generationId, { source: 'A', route: '/catalogue' });
  expect(second.captures.A).toEqual(first.captures.A);
  expect(second.additionalCaptures?.A).toHaveLength(1);
  expect(second.additionalCaptures?.A[0]).toMatchObject({
    route: '/catalogue', candidateCommit: f.candidateCommit, sourceCommit: 'a'.repeat(40),
    routeKey: createHash('sha256').update('/catalogue').digest('hex').slice(0, 16)
  });
  const secondKey = second.additionalCaptures!.A[0].routeKey;
  expect(await f.authority.image(f.generationId, 'A', 'source', secondKey)).toEqual(
    Buffer.concat([f.png, Buffer.from('http://127.0.0.1:48210/catalogue')])
  );
  expect(await f.authority.image(f.generationId, 'A', 'source')).toEqual(original);
  expect(await f.authority.image(f.generationId, 'A', 'candidate', secondKey)).toEqual(
    Buffer.concat([f.png, Buffer.from('http://127.0.0.1:48212/catalogue')])
  );
  const third = await f.authority.capture(f.generationId, { source: 'A', route: '/products/lamp' });
  expect(third.additionalCaptures?.A.map(capture => capture.route)).toEqual(['/catalogue', '/products/lamp']);
  expect(f.capturePair).toHaveBeenCalledTimes(3);
  expect(await f.authority.capture(f.generationId, { source: 'A', route: '/catalogue' })).toEqual(third);
  await expect(f.authority.capture(f.generationId, { source: 'A', route: '/fourth' })).rejects.toMatchObject({
    statusCode: 409, message: expect.stringContaining('Maximum of three')
  });
  expect(f.capturePair).toHaveBeenCalledTimes(3);
  await expect(f.authority.image(f.generationId, 'A', 'source', 'f'.repeat(16))).rejects.toMatchObject({ statusCode: 404 });
  await expect(f.authority.image(f.generationId, 'A', 'source', '../bad')).rejects.toMatchObject({ statusCode: 400 });
  const restarted = new VisualSnapshotAuthority(f.artifactRoot, new VisualReviewAuthority(f.root, f.artifactRoot), {
    session: slot => f.current[slot], isAlive: () => true
  }, f.capturePair);
  expect((await restarted.get(f.generationId)).additionalCaptures).toEqual(third.additionalCaptures);
  expect(await restarted.image(f.generationId, 'A', 'source')).toEqual(original);
  expect(git(f.root, ['status', '--porcelain'])).toBe('');
});

test('refuses tampered additional PNGs and manifests or a forged route directory', async () => {
  const f = fixture();
  await f.authority.register(f.report);
  f.current.right = f.session('right', 'combined-result', f.candidateCommit, 48212);
  await f.authority.capture(f.generationId, { source: 'A', route: '/catalogue' });
  const state = await f.authority.capture(f.generationId, { source: 'A', route: '/products/lamp' });
  const key = state.additionalCaptures!.A[0].routeKey;
  const folder = resolve(f.artifactRoot, '.ums', 'visual-snapshots', f.generationId, 'A', 'routes', key);
  const path = resolve(folder, 'manifest.json');
  const metadata = JSON.parse(readFileSync(path, 'utf8')) as { sourceFile: string; route: string; sourceSha256: string };
  writeFileSync(resolve(folder, metadata.sourceFile), Buffer.concat([f.png, Buffer.from('changed')]));
  await expect(f.authority.get(f.generationId)).rejects.toMatchObject({ statusCode: 409 });
  await expect(f.authority.image(f.generationId, 'A', 'source', key)).rejects.toMatchObject({ statusCode: 409 });
  writeFileSync(resolve(folder, metadata.sourceFile), f.png);
  writeFileSync(path, JSON.stringify({ ...metadata, route: '/another-route' }));
  await expect(f.authority.get(f.generationId)).rejects.toMatchObject({
    statusCode: 409, message: expect.stringContaining('pinned source, candidate and route')
  });
});
