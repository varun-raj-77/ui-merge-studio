import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const execFileAsync = promisify(execFile);
const fixture = resolve(import.meta.dirname, '../../fixtures/generated/product-catalogue');
const candidateBranch = 'phase0-canonical-e2e-result';

async function git(args: string[]) {
  return (await execFileAsync('git', args, { cwd: fixture, encoding: 'utf8', windowsHide: true })).stdout.trim();
}

async function removeCandidate() {
  const exists = await git(['rev-parse', '--verify', `${candidateBranch}^{commit}`]).then(() => true).catch(() => false);
  if (exists) await git(['branch', '-D', candidateBranch]);
}

async function stopPreviews(request: APIRequestContext) {
  await request.delete('/api/preview').catch(() => undefined);
}

test.beforeEach(async ({ request }) => {
  await stopPreviews(request);
  await removeCandidate();
});

test.afterEach(async ({ request }) => {
  await stopPreviews(request);
  await removeCandidate();
});

test('a rendered two-branch decision causes one canonical plan and a verified real candidate preview', async ({ page, request }) => {
  test.setTimeout(600_000);
  await page.goto('/?mode=local');
  await page.getByRole('button', { name: /Try sample demo/i }).click();

  const leftCard = page.locator('[data-preview-id="left"]');
  const rightCard = page.locator('[data-preview-id="right"]');
  const branchA = page.frameLocator('iframe[title="Category sidebar branch live application"]');
  const branchB = page.frameLocator('iframe[title="Quick-view branch live application"]');
  await expect(leftCard).toContainText('Live and synchronized', { timeout: 120_000 });
  await expect(rightCard).toContainText('Live and synchronized', { timeout: 120_000 });

  await leftCard.getByRole('button', { name: 'Choose feature' }).click();
  const leftAnalysisRequestPromise = page.waitForRequest(request => request.url().endsWith('/api/previews/left/analysis') && request.method() === 'POST');
  await branchA.getByRole('complementary', { name: 'Category sidebar' }).click();
  const leftAnalysisBody = (await leftAnalysisRequestPromise).postDataJSON();
  expect(leftAnalysisBody).toEqual({ selectionReceipt: expect.stringMatching(/^rendered-[A-Za-z0-9_-]{32}$/) });
  expect(JSON.stringify(leftAnalysisBody)).not.toMatch(/repositoryRelativePath|componentName|SourceIdentity|\.tsx/);
  const confirmCategory = leftCard.getByRole('button', { name: 'Confirm selection' });
  await expect(confirmCategory).toBeVisible({ timeout: 30_000 });
  await confirmCategory.click();

  await rightCard.getByRole('button', { name: 'Choose feature' }).click();
  const renderedQuickView = branchB.locator('[data-ums-scope="product-quick-view:p-105"]');
  const rightAnalysisRequestPromise = page.waitForRequest(request => request.url().endsWith('/api/previews/right/analysis') && request.method() === 'POST');
  await renderedQuickView.click({ position: { x: 2, y: 2 } });
  const rightAnalysisBody = (await rightAnalysisRequestPromise).postDataJSON();
  expect(rightAnalysisBody).toEqual({ selectionReceipt: expect.stringMatching(/^rendered-[A-Za-z0-9_-]{32}$/) });
  expect(JSON.stringify(rightAnalysisBody)).not.toMatch(/repositoryRelativePath|componentName|SourceIdentity|\.tsx/);
  const confirmQuickView = rightCard.getByRole('button', { name: 'Confirm selection' });
  await expect(confirmQuickView).toBeVisible({ timeout: 30_000 });

  const preflightResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/candidate/preflight') && response.request().method() === 'POST');
  await confirmQuickView.click();
  const preflightResponse = await preflightResponsePromise;
  expect(preflightResponse.status()).toBe(200);
  const outgoing = preflightResponse.request().postDataJSON() as { plan: { version: number; foundation: { repositoryId: string; branchRef: string; commitSha: string; commonAncestorCommit: string }; selections: { capabilityId: string; sourceBranch: string; sourceCommitSha: string; route: string; pageId: string }[] }; planIdentity: string };
  const preflight = await preflightResponse.json();
  expect(Object.keys(outgoing).sort()).toEqual(['plan', 'planIdentity']);
  expect(outgoing.plan.version).toBe(2);
  expect(outgoing.plan.foundation.branchRef).toBe('main');
  expect(outgoing.plan.foundation.commitSha).toMatch(/^[a-f0-9]{40}$/);
  expect(outgoing.plan.foundation.commonAncestorCommit).toBe(outgoing.plan.foundation.commitSha);
  expect(outgoing.plan.selections).toHaveLength(2);
  expect(outgoing.plan.selections.map(selection => selection.sourceBranch).sort()).toEqual(['branch-a', 'branch-b']);
  expect(outgoing.plan.selections.every(selection => selection.capabilityId.startsWith('analyzed-selection:'))).toBe(true);
  expect(outgoing.plan.selections.every(selection => selection.route === '/catalogue' && selection.pageId === '/catalogue')).toBe(true);
  expect(JSON.stringify(outgoing)).not.toMatch(/repositoryRelativePath|componentName|includedChanges|FeatureSliceArtifact/);
  expect(preflight.integrationPlan.identity).toBe(outgoing.planIdentity);
  expect(preflight.plan.status).toBe('ready');
  expect(preflight.plan.unresolved).toEqual([]);
  const regionOperations = preflight.plan.operations.filter((operation:{kind:string})=>operation.kind==='replace-jsx-region');
  expect(regionOperations).toHaveLength(2);
  expect(regionOperations.every((operation:{jsxProjection?:{mode:string}})=>operation.jsxProjection?.mode==='insert-child')).toBe(true);
  expect(preflight.plan.operations.some((operation:{kind:string;target:{symbol:string|null}})=>operation.kind==='replace-declaration'&&(operation.target.symbol==='CatalogueWorkspace'||operation.target.symbol==='ProductGrid'))).toBe(false);
  await expect(page.locator('.combine-tray')).toHaveAttribute('data-plan-identity', outgoing.planIdentity);
  await expect(page.getByRole('button', { name: 'Create verified branch' })).toBeEnabled();

  const generationResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/candidate/generate') && response.request().method() === 'POST', { timeout: 540_000 });
  await page.getByRole('button', { name: 'Create verified branch' }).click();
  const generationResponse = await generationResponsePromise;
  expect(generationResponse.status()).toBe(200);
  expect(generationResponse.request().postDataJSON()).toEqual(outgoing);
  const report = await generationResponse.json();
  expect(report.status, report.message).toBe('succeeded');
  expect(report.integrationPlan.identity).toBe(outgoing.planIdentity);
  expect(report.repository.baseCommit).toBe(outgoing.plan.foundation.commitSha);
  expect(report.repository.candidateBranch).toBe(candidateBranch);
  expect(report.verification.length).toBeGreaterThanOrEqual(4);
  expect(report.verification.every((gate: { status: string }) => gate.status === 'passed')).toBe(true);
  expect(report.excludedSourceChanges.some((change: { path: string }) => change.path === 'src/features/catalogue/CatalogueHeader.tsx')).toBe(true);
  expect(report.excludedSourceChanges.some((change: { path: string }) => change.path === 'src/utils/inventorySummary.ts')).toBe(true);
  expect(await git(['rev-parse', `${candidateBranch}^`])).toBe(outgoing.plan.foundation.commitSha);

  await page.getByRole('button', { name: 'View combined app' }).click();
  const resultCard = page.locator('[data-preview-id="right"]');
  const candidateFrameElement = page.getByTitle('Combined result live application');
  const candidate = page.frameLocator('iframe[title="Combined result live application"]');
  await expect(resultCard).toHaveAttribute('data-plan-identity', outgoing.planIdentity);
  await expect(resultCard).toHaveAttribute('data-candidate-preview', 'generated-worktree');
  await expect(candidateFrameElement).toHaveAttribute('src', /^http:\/\/127\.0\.0\.1:\d+\/catalogue$/, { timeout: 120_000 });
  await expect(candidateFrameElement).not.toHaveAttribute('srcdoc');
  await expect.poll(async () => {
    const state = await request.get('/api/repository').then(response => response.json()) as { sessions: Array<{ branch: string; branchCommit: string }> };
    return state.sessions.find(session => session.branch === candidateBranch)?.branchCommit ?? null;
  }, { timeout: 120_000 }).toBe(report.repository.candidateCommit);
  await expect(candidate.getByRole('complementary', { name: 'Category sidebar' })).toBeVisible({ timeout: 120_000 });
  await candidate.getByRole('button', { name: 'Desk', exact: true }).click();
  await expect(candidate.getByRole('heading', { name: 'Desk Stand' })).toBeVisible();
  await expect(candidate.getByRole('heading', { name: 'Arc Headphones' })).toHaveCount(0);
  await candidate.getByRole('button', { name: 'Quick view Desk Stand' }).click();
  await expect(candidate.getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();
  await expect(candidate.getByText('Seasonal edit')).toHaveCount(0);
  await expect(candidate.getByText('5 products ready')).toHaveCount(0);

  await stopPreviews(request);
  await removeCandidate();
  const repositoryState = await request.get('/api/repository').then(response => response.json());
  expect(repositoryState.sessions).toEqual([]);
  expect(await git(['status', '--porcelain'])).toBe('');
  expect(await git(['branch', '--list', candidateBranch])).toBe('');
  expect(await git(['worktree', 'list', '--porcelain'])).not.toMatch(/ui-merge-studio-(?:preview|candidate)-/);
});
