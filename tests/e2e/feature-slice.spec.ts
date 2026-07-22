import { expect, test, type Page } from '@playwright/test';
import type { FeatureSlice } from '../../packages/source-analysis/src/types';

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });
const card = (page: Page, id: 'left' | 'right') => page.locator(`[data-preview-id="${id}"]`);

async function launchBoth(page: Page) {
  await page.goto('/'); await expect(page.getByRole('status')).toHaveText('Ready');
  await page.getByLabel('Fixture branch', { exact: true }).selectOption('branch-sidebar');
  await page.getByLabel('Fixture branch B', { exact: true }).selectOption('branch-inspector');
  await page.waitForTimeout(50); await page.getByRole('button', { name: 'Launch both previews' }).click();
  await expect(page.getByRole('status')).toHaveText('Both previews ready', { timeout: 90_000 });
  return { left: page.frameLocator('iframe[title="branch-sidebar preview"]'), right: page.frameLocator('iframe[title="branch-inspector preview"]') };
}

async function downloadSlice(page: Page, id: 'left' | 'right') {
  const href = await card(page, id).getByRole('link', { name: 'Download deterministic JSON' }).getAttribute('href');
  expect(href).toBeTruthy();
  return { href: href!, slice: await page.evaluate(async url => await fetch(url).then(response => response.json()) as FeatureSlice, href!) };
}

test('extracts deterministic dependency-aware slices for both real visual selections and invalidates a restart', async ({ page }) => {
  const frames = await launchBoth(page);
  await frames.right.getByRole('button', { name: /TCK-102/ }).click(); await expect(frames.right.getByRole('heading', { name: 'Payment gateway timeout' })).toBeVisible();
  await card(page, 'left').getByRole('button', { name: 'Enter selection mode' }).click(); await frames.left.getByRole('button', { name: 'Collapse sidebar' }).click();
  await card(page, 'right').getByRole('button', { name: 'Enter selection mode' }).click(); await frames.right.getByRole('button', { name: 'note' }).click();
  await card(page, 'left').getByRole('button', { name: 'Analyze feature slice' }).click();
  await expect(card(page, 'left').getByRole('heading', { name: 'Feature slice · resolved' })).toBeVisible({ timeout: 60_000 });
  await card(page, 'right').getByRole('button', { name: 'Analyze feature slice' }).click();
  await expect(card(page, 'right').getByRole('heading', { name: 'Feature slice · resolved' })).toBeVisible({ timeout: 60_000 });
  await expect(card(page, 'left')).toContainText('Original boundaryAppSidebar'); await expect(card(page, 'left')).toContainText('Analyzed boundaryAppSidebar');
  await expect(card(page, 'right')).toContainText('Original boundaryActivityFilters'); await expect(card(page, 'right')).toContainText('Analyzed boundaryTicketInspector');
  const left = await downloadSlice(page, 'left'); const right = await downloadSlice(page, 'right');
  const leftIncluded = new Set(left.slice.includedChanges.map(item => item.path)); const rightIncluded = new Set(right.slice.includedChanges.map(item => item.path));
  for (const path of ['src/features/navigation/AppSidebar.tsx','src/features/navigation/SidebarNavItem.tsx','src/hooks/useSidebarState.ts','src/types/navigation.ts','src/styles/app.css','src/test/sidebar.test.tsx']) expect(leftIncluded.has(path), path).toBe(true);
  expect(left.slice.excludedChanges).toContainEqual(expect.objectContaining({ path: 'src/features/tickets/TicketPage.tsx', classification: 'proven-unrelated', proof: 'proven' }));
  for (const path of ['src/features/tickets/ActivityFilters.tsx','src/features/tickets/TicketActivityList.tsx','src/features/tickets/TicketHeader.tsx','src/hooks/useActivityFilter.ts','src/hooks/useCopyReference.ts','src/types/inspector.ts','src/utils/severitySummary.ts','src/styles/inspector.css','src/main.tsx','src/test/inspector.test.tsx']) expect(rightIncluded.has(path), path).toBe(true);
  for (const path of ['src/features/tickets/TicketList.tsx','src/utils/sortTickets.ts']) expect(right.slice.excludedChanges).toContainEqual(expect.objectContaining({ path, classification: 'proven-unrelated', proof: 'proven' }));
  await card(page, 'left').getByRole('button', { name: 'Analyze feature slice' }).click(); await expect(card(page, 'left').getByRole('heading', { name: 'Feature slice · resolved' })).toBeVisible({ timeout: 60_000 });
  expect((await downloadSlice(page, 'left')).href).toBe(left.href);
  await card(page, 'left').getByRole('button', { name: 'Start / restart preview', exact: true }).click();
  await expect(card(page, 'left')).toContainText('Stale analysis: Analysis is stale because the preview restarted.', { timeout: 90_000 });
  await expect(card(page, 'right').getByRole('heading', { name: 'Feature slice · resolved' })).toBeVisible();
  await page.screenshot({ path: 'test-results/feature-slice-two-previews.png', fullPage: true });
});

test('refuses an unchanged visual selection that has no changed supported feature graph', async ({ page }) => {
  await page.goto('/'); await expect(page.getByRole('status')).toHaveText('Ready');
  await page.getByLabel('Fixture branch', { exact: true }).selectOption('branch-incompatible-route'); await page.waitForTimeout(50);
  await page.getByRole('button', { name: 'Start / restart preview', exact: true }).click(); await expect(page.getByRole('status')).toHaveText('Preview ready', { timeout: 60_000 });
  const frame = page.frameLocator('iframe[title="branch-incompatible-route preview"]');
  await card(page, 'left').getByRole('button', { name: 'Enter selection mode' }).click(); await frame.getByText('Beacon Ops').click();
  await expect(card(page, 'left').locator('.panel').filter({ hasText: 'Selected boundary' })).toContainText('AppSidebar');
  await card(page, 'left').getByRole('button', { name: 'Analyze feature slice' }).click();
  await expect(card(page, 'left').getByRole('heading', { name: 'Feature slice · refused' })).toBeVisible({ timeout: 60_000 });
  await expect(card(page, 'left')).toContainText('selected definition is unchanged');
  expect((await downloadSlice(page, 'left')).slice.status).toBe('refused');
});
