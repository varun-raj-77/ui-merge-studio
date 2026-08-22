import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const foundationBranch = 'prompt014-foundation';
const leftBranch = 'prompt014-workspace-status';
const rightBranch = 'prompt014-revenue-pulse';
const candidateBranch = 'prompt015-external-candidate';
const foundationCommit = '8223897259151c450f954e462c57df3703d5508d';
const externalRepository = resolve(process.env.UI_MERGE_EXTERNAL_REPOSITORY ?? resolve(import.meta.dirname, '../../.validation-worktrees/prompt015-external-vite'));
const card = (page: Page, side: 'left' | 'right') => page.locator(`[data-preview-id="${side}"]`);
const selectedPanel = (version: Locator) => version.locator('.evidence-card').filter({ hasText: 'Selected boundary' });
const field = (panel: Locator, name: string) => panel.locator('dt', { hasText: name }).locator('xpath=following-sibling::dd[1]');

test.afterEach(async ({ request }) => {
  await request.delete('/api/preview').catch(() => undefined);
});

test('projects selected JSX regions without copying co-located or separate unrelated behavior', async ({ page, request }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => {
    const text = message.text();
    if (message.type() === 'error' && !text.startsWith('Warning: [antd:')) consoleErrors.push(text);
  });

  await page.goto('/?mode=local');
  await page.getByRole('button', { name: /Try sample demo/ }).click();
  await expect(page.locator('.workspace-status')).toHaveText('Both live apps are ready to compare', { timeout: 180_000 });
  await expect(card(page, 'left')).toContainText(leftBranch);
  await expect(card(page, 'right')).toContainText(rightBranch);

  const repository = await request.get('/api/repository').then(response => response.json()) as {
    foundation: { branchRef: string; commitSha: string; commonAncestorCommit: string };
    sessions: Array<{ branch: string; branchCommit: string; worktreePath: string }>;
  };
  expect(repository.foundation).toMatchObject({
    branchRef: foundationBranch,
    commitSha: foundationCommit,
    commonAncestorCommit: foundationCommit
  });
  expect(repository.sessions).toHaveLength(2);
  expect(new Set(repository.sessions.map(session => session.worktreePath)).size).toBe(2);

  let leftFrame = page.frameLocator('iframe').nth(0);
  let rightFrame = page.frameLocator('iframe').nth(1);
  await leftFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await rightFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await expect(leftFrame.getByText('Release workspace ready')).toBeVisible();
  await expect(leftFrame.getByText('Experimental density controls enabled')).toBeVisible();
  await expect(rightFrame.getByText('Revenue pulse: healthy')).toBeVisible();
  await expect(rightFrame.getByText(/revenue experiment footer/)).toBeVisible();

  await card(page, 'left').getByRole('button', { name: 'Choose feature' }).click();
  await leftFrame.getByText('Release workspace ready').click();
  await expect(card(page, 'left').locator('.selection-summary')).toBeVisible({ timeout: 120_000 });
  await card(page, 'right').getByRole('button', { name: 'Choose feature' }).click();
  await rightFrame.getByText('Revenue pulse: healthy').click();
  await expect(card(page, 'right').locator('.selection-summary')).toBeVisible({ timeout: 120_000 });

  await page.getByRole('button', { name: 'How are changes identified?' }).click();
  const versions = page.getByRole('dialog').locator('.drawer-version');
  const leftSelection = selectedPanel(versions.nth(0));
  const rightSelection = selectedPanel(versions.nth(1));
  await expect(field(leftSelection, 'Component')).toHaveText('WorkspaceStatusBanner');
  await expect(field(leftSelection, 'Source')).toHaveText(/WorkspaceStatusBanner\.tsx:\d+:\d+/);
  await expect(field(rightSelection, 'Component')).toHaveText('RevenuePulseBadge');
  await expect(field(rightSelection, 'Source')).toHaveText(/RevenuePulseBadge\.tsx:\d+:\d+/);
  await expect(versions.nth(0)).toContainText('Expanded from WorkspaceStatusBanner to PageContent');
  await expect(versions.nth(1)).toContainText('Expanded from RevenuePulseBadge to RevenueTrendChart');
  await expect(versions.nth(0)).toContainText('WorkspaceStatusBanner.module.css');
  await expect(versions.nth(0)).toContainText('useWorkspaceStatus');
  await expect(versions.nth(0)).toContainText('workspaceStatusConfig');
  await expect(versions.nth(1)).toContainText('useRevenuePulse');
  await expect(versions.nth(1)).toContainText('revenuePulseConfig');
  await expect(versions.nth(1)).toContainText('src/components/layout/index.tsx');
  await page.getByRole('button', { name: 'Close technical details' }).click();

  await card(page, 'left').getByRole('button', { name: 'Confirm selection' }).click();
  const preflightResponse = page.waitForResponse(response => response.url().endsWith('/api/candidate/preflight') && response.request().method() === 'POST');
  await card(page, 'right').getByRole('button', { name: 'Confirm selection' }).click();
  const preflight = await preflightResponse.then(async response => ({ request: response.request().postDataJSON(), value: await response.json() }));
  expect(preflight.request.plan.version).toBe(2);
  expect(preflight.request.plan.foundation).toMatchObject({ branchRef: foundationBranch, commitSha: foundationCommit, commonAncestorCommit: foundationCommit });
  expect(preflight.request.plan.selections).toHaveLength(2);
  expect(preflight.value.plan.status, JSON.stringify(preflight.value.plan, null, 2)).toBe('ready');
  const operations = preflight.value.plan.operations as Array<{ kind: string; target: { path: string; symbol: string | null }; jsxProjection?: { mode: string; renderedBoundary: { path: string; symbol: string }; integrationBoundary: { path: string; symbol: string }; excludedSourceSiblingCount: number; anchor: { side: string } } }>;
  expect(operations).toContainEqual(expect.objectContaining({ kind: 'replace-jsx-region', target: expect.objectContaining({ path: 'src/components/layout/contentbar.tsx', symbol: 'PageContent' }), jsxProjection: expect.objectContaining({ mode: 'insert-child', renderedBoundary: { path: 'src/components/layout/workspace-status/WorkspaceStatusBanner.tsx', symbol: 'WorkspaceStatusBanner' }, integrationBoundary: { path: 'src/components/layout/contentbar.tsx', symbol: 'PageContent' }, excludedSourceSiblingCount: 1, anchor: expect.objectContaining({ side: 'before' }) }) }));
  expect(operations).toContainEqual(expect.objectContaining({ kind: 'replace-jsx-region', target: expect.objectContaining({ path: 'src/views/dashboard/index.tsx', symbol: 'RevenueTrendChart' }), jsxProjection: expect.objectContaining({ mode: 'insert-child', renderedBoundary: { path: 'src/views/dashboard/RevenuePulseBadge.tsx', symbol: 'RevenuePulseBadge' }, integrationBoundary: { path: 'src/views/dashboard/index.tsx', symbol: 'RevenueTrendChart' }, excludedSourceSiblingCount: 0, anchor: expect.objectContaining({ side: 'before' }) }) }));
  expect(operations.some(operation => operation.target.path === 'src/components/layout/index.tsx')).toBe(false);

  const generationResponse = page.waitForResponse(response => response.url().endsWith('/api/candidate/generate') && response.request().method() === 'POST', { timeout: 480_000 });
  await page.getByRole('button', { name: 'Create verified branch' }).click();
  const firstReport = await generationResponse.then(response => response.json());
  expect(firstReport.status, firstReport.message).toBe('succeeded');
  expect(firstReport.integrationPlan.identity).toBe(preflight.request.planIdentity);
  expect(firstReport.repository).toMatchObject({ baseCommit: foundationCommit, candidateBranch, idempotent: false });
  expect(firstReport.verification.map((item: { name: string; status: string }) => [item.name, item.status])).toEqual([
    ['install', 'passed'],
    ['lint', 'passed'],
    ['production-build-with-typescript', 'passed']
  ]);

  const secondResponse = await request.post('/api/candidate/generate', { data: preflight.request });
  const secondReport = await secondResponse.json();
  expect(secondReport.status, secondReport.message).toBe('succeeded');
  expect(secondReport.repository.idempotent).toBe(true);
  expect(secondReport.repository.candidateTree).toBe(firstReport.repository.candidateTree);

  const candidateDiff = execFileSync('git', ['diff', `${foundationBranch}..${candidateBranch}`, '--', 'src/components/layout/contentbar.tsx', 'src/components/layout/index.tsx', 'src/views/dashboard/index.tsx'], { cwd: externalRepository, encoding: 'utf8', windowsHide: true });
  expect(candidateDiff).toContain('WorkspaceStatusBanner');
  expect(candidateDiff).toContain('RevenuePulseBadge');
  expect(candidateDiff).not.toContain('Experimental density controls enabled');
  expect(candidateDiff).not.toContain('revenue experiment footer');

  await page.getByRole('button', { name: 'View combined app' }).click();
  await expect(card(page, 'right')).toContainText(candidateBranch);
  rightFrame = page.frameLocator('iframe').nth(1);
  await rightFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await expect(rightFrame.getByText('Release workspace ready')).toBeVisible();
  await expect(rightFrame.getByText('Revenue pulse: healthy')).toBeVisible();
  await expect(rightFrame.getByText('Experimental density controls enabled')).toHaveCount(0);
  await expect(rightFrame.getByText(/revenue experiment footer/)).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
