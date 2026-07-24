import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const fixture = resolve(import.meta.dirname, '../../fixtures/generated/support-dashboard');
const inspectorTemplate = resolve(import.meta.dirname, '../../fixtures/support-dashboard-template/inspector');
test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });
const card = (page: Page) => page.locator('[data-preview-id="left"]');
async function start(page: Page, branch: string) {
  await page.goto('/');
  await page.getByRole('button', { name: /Try sample demo/ }).click();
  await expect(page.locator('.workspace-status')).toHaveText('Both versions are ready to compare', { timeout: 90_000 });
  if (branch !== 'branch-sidebar') {
    await page.getByLabel('Navigation experiment source').selectOption(branch);
    await card(page).getByRole('button', { name: 'Restart version' }).click();
    await expect(card(page).locator('.version-status')).toHaveText('Ready', { timeout: 90_000 });
  }
  return page.frameLocator('iframe').nth(0);
}
async function selectionMode(page: Page) {
  await card(page).getByRole('button', { name: 'Choose a feature' }).click();
  await expect(card(page).getByRole('button', { name: 'Cancel choosing' })).toBeVisible();
}
async function openDrawer(page: Page) {
  await page.getByRole('button', { name: 'How are changes identified?' }).click();
  return page.getByRole('dialog').locator('.drawer-version').nth(0);
}
function selectedPanel(version: Locator) { return version.locator('.evidence-card').filter({ hasText: 'Selected boundary' }); }
function field(panel: ReturnType<typeof selectedPanel>, name: string) { return panel.locator('dt', { hasText: name }).locator('xpath=following-sibling::dd[1]'); }

test('maps nested components to accurate source definitions and preserves ancestor navigation', async ({ page }) => {
  const frame = await start(page, 'branch-inspector');
  await frame.getByRole('button', { name: /TCK-102/ }).click();
  await selectionMode(page);
  await frame.getByRole('heading', { name: 'Payment gateway timeout' }).hover();
  let version = await openDrawer(page);
  await expect(version.locator('.evidence-card').filter({ hasText: 'Hovered boundary' })).toContainText('TicketHeader');
  await page.getByRole('button', { name: 'Close technical details' }).click();
  await frame.getByRole('heading', { name: 'Payment gateway timeout' }).click();
  await expect(card(page)).toContainText('Ticket Header', { timeout: 60_000 });
  version = await openDrawer(page);
  const panel = selectedPanel(version);
  await expect(panel).toContainText('TicketHeader');
  await expect(field(panel, 'Source')).toContainText('src/features/tickets/TicketHeader.tsx:4:8');
  const source = readFileSync(resolve(inspectorTemplate, 'src/features/tickets/TicketHeader.tsx'), 'utf8').split(/\r?\n/);
  expect(source[3]).toContain('function TicketHeader');
  await version.getByRole('button', { name: 'TicketInspector' }).click();
  await expect(panel).toContainText('TicketInspector');
});

test('preserves interactions outside choosing mode and suppresses them while choosing', async ({ page }) => {
  const frame = await start(page, 'main');
  await frame.getByRole('button', { name: /TCK-102/ }).click();
  const body = frame.locator('body');
  const url = await body.evaluate(() => location.href);
  await selectionMode(page);
  await frame.getByRole('button', { name: /TCK-103/ }).click();
  expect(await body.evaluate(() => location.href)).toBe(url);
});

test('maps branch-owned sidebar and inspector boundaries without lookup maps', async ({ page }) => {
  let frame = await start(page, 'branch-sidebar');
  await selectionMode(page);
  await frame.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(card(page)).toContainText('Collapsible navigation', { timeout: 60_000 });
  let version = await openDrawer(page);
  let panel = selectedPanel(version);
  await expect(panel).toContainText('AppSidebar');
  await expect(field(panel, 'Source')).toContainText('src/features/navigation/AppSidebar.tsx');
  await expect(field(panel, 'Branch')).toHaveText('branch-sidebar');
  await page.getByRole('button', { name: 'Close technical details' }).click();
  await page.getByLabel('Navigation experiment source').selectOption('branch-inspector');
  await card(page).getByRole('button', { name: 'Restart version' }).click();
  await expect(card(page).locator('.version-status')).toHaveText('Ready', { timeout: 30_000 });
  frame = page.frameLocator('iframe').nth(0);
  await frame.getByRole('button', { name: /TCK-102/ }).click();
  await selectionMode(page);
  await frame.getByRole('button', { name: 'note' }).click();
  await expect(card(page)).toContainText('Activity filters', { timeout: 60_000 });
  version = await openDrawer(page);
  panel = selectedPanel(version);
  await expect(panel).toContainText('ActivityFilters');
  await expect(field(panel, 'Source')).toContainText('src/features/tickets/ActivityFilters.tsx');
  await expect(field(panel, 'Branch')).toHaveText('branch-inspector');
});

test('surfaces explicit selection refusals and runtime errors', async ({ page }) => {
  const frame = await start(page, 'main');
  await selectionMode(page);
  const session = await page.evaluate(async () => (await fetch('/api/repository').then(response => response.json())).sessions.find((item: { previewId: string }) => item.previewId === 'left'));
  await page.evaluate(({ session }) => {
    const target = document.querySelector('[data-preview-id="left"] iframe') as HTMLIFrameElement;
    target.contentWindow?.postMessage({ version: 2, preview: session, type: 'select-ancestor', payload: { index: 99 } }, session.origin);
  }, { session });
  await expect(card(page).getByRole('alert')).toContainText('No selected boundary');
  await frame.locator('body').evaluate(() => dispatchEvent(new ErrorEvent('error', { message: 'Synthetic preview failure' })));
  await expect(card(page).getByRole('alert').filter({ hasText: 'could not load' })).toContainText('Synthetic preview failure');
});
