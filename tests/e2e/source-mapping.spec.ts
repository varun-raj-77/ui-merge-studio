import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const fixture = resolve(import.meta.dirname, '../../fixtures/generated/support-dashboard');
test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });
async function start(page: Page, branch: string) {
  await page.getByLabel('Fixture branch').selectOption(branch);
  await page.getByRole('button', { name: 'Start / restart preview' }).click();
  await expect(page.getByRole('status')).toHaveText('Preview ready', { timeout: 60_000 });
  return page.frameLocator('iframe');
}
async function selectionMode(page: Page) { await page.getByRole('button', { name: 'Enter selection mode' }).click(); await expect(page.getByRole('button', { name: 'Exit selection mode' })).toBeVisible(); }
function selectedPanel(page: Page) { return page.locator('.panel').filter({ has: page.getByRole('heading', { name: 'Selected boundary' }) }); }
function field(panel: ReturnType<typeof selectedPanel>, name: string) { return panel.locator('dt', { hasText: name }).locator('xpath=following-sibling::dd[1]'); }

test('maps nested and repeated main-branch components with accurate definitions', async ({ page }) => {
  await page.goto('/'); const frame = await start(page, 'main');
  await frame.getByRole('button', { name: /TCK-102/ }).click();
  await expect(frame.getByRole('heading', { name: 'Payment gateway timeout' })).toBeVisible();
  await selectionMode(page);
  await frame.getByRole('heading', { name: 'Payment gateway timeout' }).hover();
  await expect(page.locator('.panel').filter({ hasText: 'Hovered boundary' })).toContainText('TicketHeader');
  await expect(frame.locator('div[style*="2147483647"]')).toBeVisible();
  await frame.getByRole('heading', { name: 'Payment gateway timeout' }).click();
  const panel = selectedPanel(page); await expect(panel).toContainText('TicketHeader');
  await expect(field(panel, 'Source')).toContainText('src/features/tickets/TicketHeader.tsx:2:8');
  await page.screenshot({ path: 'test-results/manual-main-selection.png', fullPage: true });
  const source = readFileSync(resolve(fixture, 'src/features/tickets/TicketHeader.tsx'), 'utf8').split(/\r?\n/);
  expect(source[1]).toContain('function TicketHeader');
  await page.getByRole('button', { name: 'TicketInspector' }).click();
  await expect(panel).toContainText('TicketInspector');

  await frame.getByRole('button', { name: /TCK-102/ }).click(); const firstDefinition = await field(panel, 'Definition boundary').textContent(); const firstInstance = await field(panel, 'Runtime instance').textContent();
  await frame.getByRole('button', { name: /TCK-103/ }).click(); const secondDefinition = await field(panel, 'Definition boundary').textContent(); const secondInstance = await field(panel, 'Runtime instance').textContent();
  expect(secondDefinition).toBe(firstDefinition); expect(secondInstance).not.toBe(firstInstance);
});

test('preserves interactions outside selection and suppresses them during selection', async ({ page }) => {
  await page.goto('/'); const frame = await start(page, 'main');
  await frame.getByRole('button', { name: /TCK-102/ }).click(); await expect(frame.getByRole('heading', { name: 'Payment gateway timeout' })).toBeVisible();
  await page.getByRole('button', { name: 'Enter selection mode' }).click();
  const before = frame.locator('body'); const url = await before.evaluate(() => location.href);
  await frame.getByRole('button', { name: /TCK-103/ }).click(); expect(await before.evaluate(() => location.href)).toBe(url);
});

test('maps branch-owned sidebar and inspector boundaries without lookup maps', async ({ page }) => {
  await page.goto('/'); let frame = await start(page, 'branch-sidebar'); await selectionMode(page);
  await frame.getByRole('button', { name: 'Collapse sidebar' }).click(); let panel = selectedPanel(page); await expect(panel).toContainText('AppSidebar'); await expect(field(panel, 'Source')).toContainText('src/features/navigation/AppSidebar.tsx'); await expect(field(panel, 'Branch')).toHaveText('branch-sidebar');
  await page.screenshot({ path: 'test-results/manual-sidebar-selection.png', fullPage: true });
  frame = await start(page, 'branch-inspector'); await frame.getByRole('button', { name: /TCK-102/ }).click(); await selectionMode(page);
  await frame.getByRole('button', { name: 'note' }).click(); panel = selectedPanel(page); await expect(panel).toContainText('ActivityFilters'); await expect(field(panel, 'Source')).toContainText('src/features/tickets/ActivityFilters.tsx'); await expect(field(panel, 'Branch')).toHaveText('branch-inspector');
  await page.screenshot({ path: 'test-results/manual-inspector-selection.png', fullPage: true });
});

test('surfaces explicit refusals and runtime errors', async ({ page }) => {
  await page.goto('/'); const frame = await start(page, 'main'); await selectionMode(page);
  const origin = await page.locator('iframe').evaluate(element => new URL((element as HTMLIFrameElement).src).origin);
  await page.evaluate(({ origin }) => { const target = document.querySelector('iframe') as HTMLIFrameElement; target.contentWindow?.postMessage({ version: 1, type: 'select-ancestor', payload: { index: 99 } }, origin); }, { origin });
  await expect(page.getByRole('alert')).toContainText('No selected boundary');
  await frame.locator('body').evaluate(() => dispatchEvent(new ErrorEvent('error', { message: 'Synthetic preview failure' })));
  await expect(page.getByRole('alert').filter({ hasText: 'Runtime error' })).toContainText('Synthetic preview failure');
});
