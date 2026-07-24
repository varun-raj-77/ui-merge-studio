import { expect, test, type Page } from '@playwright/test';

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });
const card = (page: Page, id: 'left' | 'right') => page.locator(`[data-preview-id="${id}"]`);
async function prepareResolvedFeatures(page: Page, expectReady = true) {
  await page.goto('/');
  await page.getByRole('button', { name: /Try sample demo/ }).click();
  await expect(page.locator('.workspace-status')).toHaveText('Both live apps are ready to compare', { timeout: 180_000 });
  const left = page.frameLocator('iframe').nth(0);
  const right = page.frameLocator('iframe').nth(1);
  await right.getByRole('button', { name: /TCK-102/ }).click();
  await card(page, 'left').getByRole('button', { name: 'Choose feature' }).click();
  await left.getByRole('button', { name: 'Collapse sidebar' }).click();
  await card(page, 'right').getByRole('button', { name: 'Choose feature' }).click();
  await right.getByRole('button', { name: 'note' }).click();
  const confirmations = page.getByRole('button', { name: 'Confirm selection' });
  await expect(confirmations).toHaveCount(2, { timeout: 90_000 });
  await confirmations.first().click();
  await confirmations.first().click();
  if (expectReady) await expect(page.getByRole('button', { name: 'Create verified branch' })).toBeEnabled({ timeout: 90_000 });
  else await expect(page.getByText(/cannot be combined safely/).first()).toBeVisible({ timeout: 90_000 });
}

test('creates, verifies, repeats idempotently, and opens the real two-feature candidate', async ({ page }) => {
  test.setTimeout(600_000);
  await prepareResolvedFeatures(page);
  await page.getByRole('button', { name: 'Create verified branch' }).click();
  await expect(page.getByText('Verified branch created')).toBeVisible({ timeout: 300_000 });
  await page.getByText('Verification summary').click();
  for (const gate of ['Dependency installation', 'Code checks', 'Full tests', 'Feature tests', 'Production build']) await expect(page.locator('.generation-summary')).toContainText(`${gate}: passed`);
  await expect(page.locator('.generation-summary')).toContainText('Cleanup:');
  await page.getByRole('button', { name: 'View combined app' }).click();
  await expect(page.getByRole('region', { name: 'Verified combined result' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Combined result', exact: true })).toHaveClass(/active/);
  await expect(card(page, 'right').locator('.version-status')).toHaveText('Live and synchronized', { timeout: 90_000 });
  const candidate = page.frameLocator('iframe').nth(1);
  await expect(candidate.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
  await expect(candidate.getByRole('heading', { name: 'Support Tickets' })).toBeVisible();
  const ticketLabels = await candidate.getByRole('region', { name: 'Tickets' }).getByRole('button').allTextContents();
  expect(ticketLabels.map(value => value.match(/TCK-\d+/)?.[0])).toEqual(['TCK-102', 'TCK-103', 'TCK-104']);
  await candidate.getByRole('button', { name: /TCK-102/ }).click();
  await candidate.getByRole('button', { name: 'status' }).click();
  await expect(candidate.getByText('No status activity found.')).toBeVisible();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'docs/evidence/prompt-006d/combined-result-1440x900.png', fullPage: false });
  await page.getByRole('button', { name: 'Navigation experiment' }).click();
  await expect(card(page, 'left')).toBeVisible();
  await page.getByRole('button', { name: 'Activity-filter experiment' }).click();
  await expect(card(page, 'right').locator('.version-status')).toHaveText('Live', { timeout: 90_000 });
  await page.getByRole('button', { name: 'Combined result', exact: true }).click();
  await expect(card(page, 'right')).toContainText('Combined result', { timeout: 90_000 });
});

test('shows a controlled unsafe integration conflict and never enables combination', async ({ page }) => {
  test.setTimeout(180_000);
  await page.route('**/api/candidate/preflight', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ generationId: 'controlled-conflict', plan: { version: 1, repository: { baseCommit: '2337f31', candidateBranch: 'combined-result' }, sliceIds: ['slice-left', 'slice-right'], operations: [], conflicts: [{ id: 'conflict:controlled', kind: 'overlapping-declaration', path: 'src/Shared.tsx', symbol: 'SharedView', sliceIds: ['slice-left', 'slice-right'], operationIds: ['op:left', 'op:right'], evidenceEdgeIds: ['edge:left', 'edge:right'], reason: 'Slices reconstruct the same component with different source declarations.', manualResolution: 'Resolve manually.' }], unresolved: [], status: 'refused' } }) }));
  await prepareResolvedFeatures(page, false);
  await expect(page.getByText(/cannot be combined safely/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create verified branch' })).toBeDisabled();
});
