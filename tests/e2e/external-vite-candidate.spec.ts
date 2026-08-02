import { expect, test, type Locator, type Page } from '@playwright/test';

const leftBranch = 'ui-merge-validation-left-deps';
const rightBranch = 'ui-merge-validation-right-deps';
const candidateBranch = 'ui-merge-validation-combined';
const card = (page: Page, side: 'left' | 'right') => page.locator(`[data-preview-id="${side}"]`);
const selectedPanel = (version: Locator) => version.locator('.evidence-card').filter({ hasText: 'Selected boundary' });
const field = (panel: Locator, name: string) => panel.locator('dt', { hasText: name }).locator('xpath=following-sibling::dd[1]');

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });

test('creates, verifies, relaunches, and deterministically recognizes the external candidate', async ({ page, request }) => {
  test.setTimeout(360_000);
  const consoleErrors: string[] = [];
  page.on('console', message => {
    const text = message.text();
    if (message.type() === 'error' && !text.startsWith('Warning: [antd:')) consoleErrors.push(text);
  });

  await page.goto('/?mode=local');
  await page.getByRole('button', { name: /Try sample demo/ }).click();
  await expect(page.locator('.workspace-status')).toHaveText('Both live apps are ready to compare', { timeout: 120_000 });
  await expect(card(page, 'left')).toContainText(leftBranch);
  await expect(card(page, 'right')).toContainText(rightBranch);
  const sourceSessions = await request.get('/api/repository').then(response => response.json()) as { sessions: Array<{ branch: string; branchCommit: string; worktreePath: string }> };
  expect(sourceSessions.sessions).toHaveLength(2);
  expect(new Set(sourceSessions.sessions.map(session => session.worktreePath)).size).toBe(2);

  let leftFrame = page.frameLocator('iframe').nth(0);
  let rightFrame = page.frameLocator('iframe').nth(1);
  await leftFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await rightFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await expect(leftFrame.getByText('Validation workspace')).toBeVisible();
  await expect(rightFrame.getByText('Validated revenue outlook')).toBeVisible();
  await expect(rightFrame.getByText(/Right preview note/)).toBeAttached();
  await page.screenshot({ path: 'docs/evidence/external-vite/01-external-branches.png', fullPage: false });

  await card(page, 'left').getByRole('button', { name: 'Choose feature' }).click();
  await leftFrame.getByText('Validation workspace').click();
  await expect(card(page, 'left').locator('.selection-summary')).toBeVisible({ timeout: 90_000 });
  await card(page, 'right').getByRole('button', { name: 'Choose feature' }).click();
  await rightFrame.getByText('Validated revenue outlook').click();
  await expect(card(page, 'right').locator('.selection-summary')).toBeVisible({ timeout: 90_000 });

  await page.getByRole('button', { name: 'How are changes identified?' }).click();
  const versions = page.getByRole('dialog').locator('.drawer-version');
  const left = selectedPanel(versions.nth(0));
  const right = selectedPanel(versions.nth(1));
  await expect(field(left, 'Component')).toHaveText('PageContent');
  await expect(field(left, 'Source')).toHaveText(/src\/components\/layout\/contentbar\.tsx:\d+:\d+/);
  await expect(field(right, 'Component')).toHaveText('RevenueTrendChart');
  await expect(field(right, 'Source')).toHaveText(/src\/views\/dashboard\/index\.tsx:\d+:\d+/);
  await expect(versions.nth(0)).toContainText('validationWorkspace');
  await expect(versions.nth(0)).toContainText('validationWorkspaceConfig');
  await expect(versions.nth(0)).toContainText('src/components/layout/headerbar.tsx');
  await expect(versions.nth(1)).toContainText('revenueOutlook');
  await expect(versions.nth(1)).toContainText('revenueOutlookConfig');
  await expect(versions.nth(1)).toContainText('src/components/layout/index.tsx');
  await page.screenshot({ path: 'docs/evidence/external-vite/02-selected-source-evidence.png', fullPage: false });
  await page.getByRole('button', { name: 'Close technical details' }).click();

  await card(page, 'left').getByRole('button', { name: 'Confirm selection' }).click();
  const preflightResponse = page.waitForResponse(response => response.url().endsWith('/api/candidate/preflight') && response.request().method() === 'POST');
  await card(page, 'right').getByRole('button', { name: 'Confirm selection' }).click();
  const preflight = await preflightResponse.then(async response => ({ request: response.request().postDataJSON(), value: await response.json() }));
  expect(preflight.value.plan.status, JSON.stringify(preflight.value.plan, null, 2)).toBe('ready');
  const plannedPaths = new Set(preflight.value.plan.operations.map((operation: { target: { path: string } }) => operation.target.path));
  expect(plannedPaths).toEqual(new Set([
    'src/components/layout/contentbar.tsx',
    'src/components/layout/validationWorkspace.ts',
    'src/components/layout/validationWorkspaceConfig.ts',
    'src/views/dashboard/index.tsx',
    'src/views/dashboard/revenueOutlook.ts',
    'src/views/dashboard/revenueOutlookConfig.ts'
  ]));
  expect(plannedPaths.has('src/components/layout/headerbar.tsx')).toBe(false);
  expect(plannedPaths.has('src/components/layout/index.tsx')).toBe(false);
  await expect(page.getByRole('button', { name: 'Create verified branch' })).toBeEnabled();
  await page.screenshot({ path: 'docs/evidence/external-vite/03-candidate-plan.png', fullPage: false });

  const generationResponse = page.waitForResponse(response => response.url().endsWith('/api/candidate/generate') && response.request().method() === 'POST', { timeout: 240_000 });
  await page.getByRole('button', { name: 'Create verified branch' }).click();
  const firstReport = await generationResponse.then(response => response.json());
  expect(firstReport.status, firstReport.message).toBe('succeeded');
  expect(firstReport.repository.candidateBranch).toBe(candidateBranch);
  expect(firstReport.repository.idempotent).toBe(false);
  expect(firstReport.verification.every((item: { status: string }) => item.status === 'passed')).toBe(true);
  await expect(page.getByRole('button', { name: 'View combined app' })).toBeVisible();
  await page.locator('.generation-summary').evaluate((element: HTMLDetailsElement) => { element.open = true; });
  await page.screenshot({ path: 'docs/evidence/external-vite/04-verification-summary.png', fullPage: false });

  const secondResponse = await request.post('/api/candidate/generate', { data: preflight.request });
  const secondReport = await secondResponse.json();
  expect(secondReport.status, secondReport.message).toBe('succeeded');
  expect(secondReport.repository.idempotent).toBe(true);
  expect(secondReport.repository.candidateTree).toBe(firstReport.repository.candidateTree);

  await page.getByRole('button', { name: 'View combined app' }).click();
  await expect(card(page, 'right')).toContainText(candidateBranch);
  rightFrame = page.frameLocator('iframe').nth(1);
  await rightFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await expect(rightFrame.getByText('Validation workspace')).toBeVisible();
  await expect(rightFrame.getByText('Validated revenue outlook')).toBeVisible();
  await expect(rightFrame.getByText('Total Customers')).toBeVisible();
  await expect(rightFrame.getByText(/Left preview note/)).toHaveCount(0);
  await expect(rightFrame.getByText(/Right preview note/)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Both selected changes, together' })).toBeVisible();
  await expect(page.locator('.result-workspace')).toContainText(candidateBranch);
  await page.screenshot({ path: 'docs/evidence/external-vite/05-combined-result.png', fullPage: false });
  expect(consoleErrors).toEqual([]);

  await request.delete('/api/preview');
  await expect.poll(async () => {
    const repository = await request.get('/api/repository').then(response => response.json()) as { sessions: unknown[] };
    return repository.sessions.length;
  }).toBe(0);
});
