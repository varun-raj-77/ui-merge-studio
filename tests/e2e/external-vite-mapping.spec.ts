import { expect, test, type Locator, type Page } from '@playwright/test';

const leftBranch = 'ui-merge-validation-left';
const rightBranch = 'ui-merge-validation-right';
const card = (page: Page, side: 'left' | 'right') => page.locator(`[data-preview-id="${side}"]`);
const selectedPanel = (version: Locator) => version.locator('.evidence-card').filter({ hasText: 'Selected boundary' });
const field = (panel: Locator, name: string) => panel.locator('dt', { hasText: name }).locator('xpath=following-sibling::dd[1]');

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });

test('launches and maps two unrelated Vite branches without repository-specific component names', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Try sample demo/ }).click();
  await expect(page.locator('.workspace-status')).toHaveText('Both live apps are ready to compare', { timeout: 120_000 });
  await expect(card(page, 'left')).toContainText(leftBranch);
  await expect(card(page, 'right')).toContainText(rightBranch);

  const repository = await request.get('/api/repository').then(response => response.json()) as {
    sessions: Array<{ branch: string; branchCommit: string; worktreePath: string }>;
  };
  expect(repository.sessions).toHaveLength(2);
  expect(new Set(repository.sessions.map(session => session.worktreePath)).size).toBe(2);

  const leftFrame = page.frameLocator('iframe').nth(0);
  const rightFrame = page.frameLocator('iframe').nth(1);
  await leftFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await rightFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await expect(leftFrame.getByText('Validation workspace')).toBeVisible();
  await expect(rightFrame.getByText('Validated revenue outlook')).toBeVisible();

  await card(page, 'left').getByRole('button', { name: 'Choose feature' }).click();
  await leftFrame.getByText('Validation workspace').click();
  await expect(card(page, 'left').getByRole('button', { name: 'Change' })).toBeVisible();

  await card(page, 'right').getByRole('button', { name: 'Choose feature' }).click();
  await rightFrame.getByText('Validated revenue outlook').click();
  await expect(card(page, 'right').getByRole('button', { name: 'Change' })).toBeVisible();

  await page.getByRole('button', { name: 'How are changes identified?' }).click();
  const versions = page.getByRole('dialog').locator('.drawer-version');
  const left = selectedPanel(versions.nth(0));
  const right = selectedPanel(versions.nth(1));
  await expect(field(left, 'Component')).toHaveText('PageContent');
  await expect(field(left, 'Source')).toHaveText(/src\/components\/layout\/contentbar\.tsx:\d+:\d+/);
  await expect(field(left, 'Branch')).toHaveText(leftBranch);
  await expect(field(right, 'Component')).toHaveText('RevenueTrendChart');
  await expect(field(right, 'Source')).toHaveText(/src\/views\/dashboard\/index\.tsx:\d+:\d+/);
  await expect(field(right, 'Branch')).toHaveText(rightBranch);
  await page.screenshot({ path: 'docs/evidence/external-vite/source-mapping.png', fullPage: false });

  await request.delete('/api/preview');
  await expect.poll(async () => {
    const value = await request.get('/api/repository').then(response => response.json()) as { sessions: unknown[] };
    return value.sessions.length;
  }).toBe(0);
});
