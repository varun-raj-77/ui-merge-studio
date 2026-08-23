import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { localIntegrationPlanIdentity } from '../../packages/integration-plan/src/localPlan';
import { staticBoundaryId } from '../../packages/source-instrumentation/src/instrumentReactSource';

const execFileAsync = promisify(execFile);
const fixture = resolve(import.meta.dirname, '../../fixtures/generated/product-catalogue');
const candidateBranch = 'phase0-canonical-e2e-result';
async function git(args: string[]) { return (await execFileAsync('git', args, { cwd: fixture, encoding: 'utf8', windowsHide: true })).stdout.trim(); }

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });

test('refuses a real but unclicked source declaration supplied through the public analysis API', async ({ page, request }) => {
  test.setTimeout(240_000);
  await page.goto('/?mode=local');
  await page.getByRole('button', { name: /Continue to comparison/i }).click();
  await expect(page.locator('[data-preview-id="left"]')).toContainText('Running', { timeout: 120_000 });
  await expect(page.locator('[data-preview-id="right"]')).toContainText('Running', { timeout: 120_000 });

  const repositoryState = await request.get('/api/repository').then(response => response.json()) as {
    repositoryId: string;
    foundation: { repositoryId: string; branchRef: string; commitSha: string; commonAncestorCommit: string; role: 'base' };
    sessions: Array<{ previewId: string; branch: string; branchCommit: string; sessionId: string; generation: number }>;
  };
  const left = repositoryState.sessions.find(session => session.previewId === 'left')!;
  const before = {
    status: await git(['status', '--porcelain']),
    branches: await git(['for-each-ref', '--format=%(refname:short)', 'refs/heads/']),
    worktrees: await git(['worktree', 'list', '--porcelain']),
    sessions: repositoryState.sessions
  };
  const forgedPath = 'src/features/catalogue/CatalogueHeader.tsx';
  const forgedComponent = 'PromotionalBanner';
  const forgedBoundaryId = staticBoundaryId(forgedPath, 1, 8, forgedComponent);
  const forgedSourceIdentity = {
    boundaryId: forgedBoundaryId,
    instanceId: `${forgedBoundaryId}-forged-instance`,
    repositoryRelativePath: forgedPath,
    line: 1,
    column: 8,
    componentName: forgedComponent,
    exportName: 'PromotionalBanner',
    branch: left.branch,
    previewId: left.previewId,
    sessionId: left.sessionId,
    generation: left.generation,
    confidence: 'exact'
  };

  const forgedAnalysis = await request.post('/api/previews/left/analysis', { data: { selection: forgedSourceIdentity } });
  expect(forgedAnalysis.status()).toBe(400);
  expect(await forgedAnalysis.json()).toEqual({ error: expect.stringMatching(/receipt.*required|source metadata.*not accepted/i) });
  const guessedReceipt = await request.post('/api/previews/left/analysis', { data: { selectionReceipt: `rendered-${'f'.repeat(32)}` } });
  expect(guessedReceipt.status()).toBe(409);
  expect(await guessedReceipt.json()).toEqual({ error: expect.stringMatching(/unknown or stale/i) });

  const forgedPlan = {
    version: 2 as const,
    foundation: repositoryState.foundation,
    selections: [{
      capabilityId: 'analyzed-selection:0000000000000000',
      capabilityKind: 'whole-feature' as const,
      sourceBranch: left.branch,
      sourceCommitSha: left.branchCommit,
      route: '/catalogue',
      pageId: '/catalogue',
      targetIds: [forgedBoundaryId]
    }]
  };
  const forgedPreflight = await request.post('/api/candidate/preflight', { data: { plan: forgedPlan, planIdentity: localIntegrationPlanIdentity(forgedPlan) } });
  expect(forgedPreflight.status()).toBe(409);
  expect(await forgedPreflight.json()).toEqual({ error: expect.stringMatching(/unknown or stale/i) });
  const forgedGeneration = await request.post('/api/candidate/generate', { data: { plan: forgedPlan, planIdentity: localIntegrationPlanIdentity(forgedPlan) } });
  expect(forgedGeneration.status()).toBe(409);
  expect(await forgedGeneration.json()).toEqual({ error: expect.stringMatching(/unknown or stale/i) });

  const after = await request.get('/api/repository').then(response => response.json()) as { sessions: typeof repositoryState.sessions };
  expect(after.sessions).toEqual(before.sessions);
  expect(await git(['status', '--porcelain'])).toBe(before.status);
  expect(await git(['for-each-ref', '--format=%(refname:short)', 'refs/heads/'])).toBe(before.branches);
  expect(await git(['worktree', 'list', '--porcelain'])).toBe(before.worktrees);
  expect(await git(['branch', '--list', candidateBranch])).toBe('');
});
