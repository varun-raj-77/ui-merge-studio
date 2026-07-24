import { expect, test, type Locator, type Page } from '@playwright/test';
import type { FeatureSlice } from '../../packages/source-analysis/src/types';

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });
const card = (page: Page, id: 'left' | 'right') => page.locator(`[data-preview-id="${id}"]`);
async function launchBoth(page: Page, left = 'branch-sidebar', right = 'branch-inspector') {
  await page.goto('/');
  await page.getByRole('button', { name: /Try sample demo/ }).click();
  await expect(page.locator('.workspace-status')).toHaveText('Both live apps are ready to compare', { timeout: 90_000 });
  for (const [id, label, branch, expected] of [['left', 'Navigation experiment source', left, 'branch-sidebar'], ['right', 'Activity-filter experiment source', right, 'branch-inspector']] as const) {
    if (branch === expected) continue;
    await page.getByLabel(label).selectOption(branch);
    await card(page, id).getByRole('button', { name: 'Restart version' }).click();
    await expect(card(page, id).locator('.version-status')).toHaveText('Ready', { timeout: 90_000 });
  }
  return { left: page.frameLocator('iframe').nth(0), right: page.frameLocator('iframe').nth(1) };
}
async function openEvidence(page: Page) {
  await page.getByRole('button', { name: 'How are changes identified?' }).click();
  return page.getByRole('dialog', { name: 'Technical details' });
}
async function downloadSlice(page: Page, version: Locator) {
  const href = await version.getByRole('link', { name: 'Download deterministic JSON' }).getAttribute('href');
  expect(href).toBeTruthy();
  return { href: href!, slice: await page.evaluate(async url => await fetch(url).then(response => response.json()) as FeatureSlice, href!) };
}

test('extracts deterministic dependency-aware slices from both guided visual selections', async ({ page }) => {
  const frames = await launchBoth(page);
  await frames.right.getByRole('button', { name: /TCK-102/ }).click();
  await card(page, 'left').getByRole('button', { name: 'Choose feature' }).click();
  await frames.left.getByRole('button', { name: 'Collapse sidebar' }).click();
  await card(page, 'right').getByRole('button', { name: 'Choose feature' }).click();
  await frames.right.getByRole('button', { name: 'note' }).click();
  await expect(card(page, 'left')).toContainText('Collapsible navigation', { timeout: 60_000 });
  await expect(card(page, 'right')).toContainText('Activity filters', { timeout: 60_000 });
  const dialog = await openEvidence(page);
  const versions = dialog.locator('.drawer-version');
  await expect(versions.nth(0).getByRole('heading', { name: 'Feature slice · resolved' })).toBeVisible();
  await expect(versions.nth(1).getByRole('heading', { name: 'Feature slice · resolved' })).toBeVisible();
  await expect(versions.nth(0)).toContainText('Original boundaryAppSidebar');
  await expect(versions.nth(1)).toContainText('Original boundaryActivityFilters');
  await expect(versions.nth(1)).toContainText('Analyzed boundaryTicketInspector');
  const left = await downloadSlice(page, versions.nth(0));
  const right = await downloadSlice(page, versions.nth(1));
  const leftIncluded = new Set(left.slice.includedChanges.map(item => item.path));
  const rightIncluded = new Set(right.slice.includedChanges.map(item => item.path));
  for (const path of ['src/features/navigation/AppSidebar.tsx', 'src/features/navigation/SidebarNavItem.tsx', 'src/hooks/useSidebarState.ts', 'src/types/navigation.ts', 'src/styles/app.css', 'src/test/sidebar.test.tsx']) expect(leftIncluded.has(path), path).toBe(true);
  expect(left.slice.excludedChanges).toContainEqual(expect.objectContaining({ path: 'src/features/tickets/TicketPage.tsx', classification: 'proven-unrelated', proof: 'proven' }));
  for (const path of ['src/features/tickets/ActivityFilters.tsx', 'src/features/tickets/TicketActivityList.tsx', 'src/hooks/useActivityFilter.ts', 'src/main.tsx', 'src/test/inspector.test.tsx']) expect(rightIncluded.has(path), path).toBe(true);
  for (const path of ['src/features/tickets/TicketList.tsx', 'src/utils/sortTickets.ts']) expect(right.slice.excludedChanges).toContainEqual(expect.objectContaining({ path, classification: 'proven-unrelated', proof: 'proven' }));
  const tests = right.slice.testFileSlices.find(item => item.path === 'src/test/inspector.test.tsx')!;
  expect(tests.mode).toBe('test-units');
  expect(tests.includedUnits.map(item => item.title)).toEqual(['filters activity and reports clipboard failure']);
  expect(tests.excludedUnits.map(item => item.title)).toEqual(['sorts ticket list newest first']);
});

test('stops an out-of-scope visual choice without exposing implementation jargon in Guided Mode', async ({ page }) => {
  const frames = await launchBoth(page);
  await card(page, 'left').getByRole('button', { name: 'Choose feature' }).click();
  await frames.left.getByRole('heading', { name: 'Operations Command Center' }).click();
  await expect(card(page, 'left').getByRole('alert')).toContainText('broader than this guided demo', { timeout: 60_000 });
  const guidedText = await page.locator('.studio').innerText();
  expect(guidedText).not.toContain('Merge base');
  expect(guidedText).not.toContain('Definition boundary');
  await expect(page.getByRole('button', { name: 'Create verified branch' })).toBeDisabled();
});
