import { expect, test, type Page } from '@playwright/test';

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });
const card = (page: Page, id: 'left' | 'right') => page.locator(`[data-preview-id="${id}"]`);
async function launch(page: Page, left = 'branch-sidebar', right = 'branch-inspector') {
  await page.goto('/'); await expect(page.getByRole('status')).toHaveText('Ready');
  await page.getByLabel('Fixture branch', { exact: true }).selectOption(left); await page.getByLabel('Fixture branch B', { exact: true }).selectOption(right);
  await page.waitForTimeout(50);
  await page.getByRole('button', { name: 'Launch both previews' }).click();
  await expect(page.getByRole('status')).toHaveText('Both previews ready', { timeout: 90_000 });
  return { left: page.frameLocator(`iframe[title="${left} preview"]`), right: page.frameLocator(`iframe[title="${right} preview"]`) };
}

test('synchronizes tickets in both directions, viewports, and independent cross-branch selections', async ({ page }) => {
  const frames = await launch(page);
  await frames.left.getByRole('button', { name: /TCK-102/ }).click();
  await expect(frames.right.getByRole('heading', { name: 'Payment gateway timeout' })).toBeVisible();
  await frames.right.getByRole('button', { name: /TCK-103/ }).click();
  await expect(frames.right.getByRole('heading', { name: 'Seat count mismatch' })).toBeVisible();
  await expect(card(page, 'right')).toContainText('Ticket context: TCK-103');
  await expect(frames.left.getByRole('heading', { name: 'Seat count mismatch' })).toBeVisible();
  for (const preset of [{ name: 'tablet', width: 768 }, { name: 'mobile', width: 390 }, { name: 'desktop', width: 1200 }]) {
    await page.getByLabel('Viewport preset').selectOption(preset.name);
    await expect(page.locator('iframe').nth(0)).toHaveCSS('width', `${preset.width}px`); await expect(page.locator('iframe').nth(1)).toHaveCSS('width', `${preset.width}px`);
  }
  await card(page, 'left').getByRole('button', { name: 'Enter selection mode' }).click();
  await frames.left.getByRole('button', { name: 'Collapse sidebar' }).click();
  await card(page, 'right').getByRole('button', { name: 'Enter selection mode' }).click();
  await frames.right.getByRole('button', { name: 'note' }).click();
  const summary = page.locator('.combined');
  await expect(summary).toContainText('AppSidebar'); await expect(summary).toContainText('src/features/navigation/AppSidebar.tsx');
  await expect(summary).toContainText('ActivityFilters'); await expect(summary).toContainText('src/features/tickets/ActivityFilters.tsx');
  await page.screenshot({ path: 'test-results/manual-multi-preview-selections.png', fullPage: true });
});

test('invalidates a restarted selection, rejects the stale session, and preserves its peer', async ({ page }) => {
  const frames = await launch(page);
  await card(page, 'left').getByRole('button', { name: 'Enter selection mode' }).click(); await frames.left.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(card(page, 'left')).toContainText('AppSidebar');
  const oldSession = await page.evaluate(async () => (await fetch('/api/repository').then(response => response.json())).sessions.find((item: { previewId: string }) => item.previewId === 'left'));
  await card(page, 'left').getByRole('button', { name: 'Start / restart preview', exact: true }).click();
  await expect(card(page, 'left')).toContainText('Selection cleared:');
  await expect(card(page, 'left').locator('.session-line')).toContainText(`generation ${oldSession.generation + 1}`, { timeout: 90_000 });
  await expect(card(page, 'right')).toContainText('ready'); await expect(frames.right.getByRole('heading', { name: 'Support Tickets' })).toBeVisible();
  const active = await page.evaluate(async () => (await fetch('/api/repository').then(response => response.json())).sessions.find((item: { previewId: string }) => item.previewId === 'left'));
  await page.evaluate(({ oldSession, active }) => { const target = document.querySelector('[data-preview-id="left"] iframe') as HTMLIFrameElement; const forged = { ...oldSession, origin: active.origin }; window.dispatchEvent(new MessageEvent('message', { origin: active.origin, source: target.contentWindow, data: { version: 2, preview: forged, type: 'selection-mode-enabled' } })); }, { oldSession, active });
  await expect(card(page, 'left').getByRole('alert')).toContainText('Bridge validation failure: Stale or mismatched preview session identity.');
  await expect(card(page, 'left').locator('.panel').filter({ hasText: 'Selected boundary' })).toContainText('None');
});

test('reports incompatible contracts while both previews remain independently interactive', async ({ page }) => {
  const frames = await launch(page, 'branch-sidebar', 'branch-incompatible-route');
  await expect(page.getByLabel('Synchronization status')).toContainText('contracts differ');
  await frames.left.getByRole('button', { name: /TCK-102/ }).click(); await expect(frames.left.getByRole('heading', { name: 'Payment gateway timeout' })).toBeVisible();
  await expect(frames.right.getByRole('heading', { name: 'Payment gateway timeout' })).toHaveCount(0);
  await frames.right.getByRole('button', { name: /TCK-103/ }).click(); await expect(frames.right.getByRole('heading', { name: 'Seat count mismatch' })).toBeVisible();
  await expect(frames.left.getByRole('heading', { name: 'Payment gateway timeout' })).toBeVisible();
  await page.screenshot({ path: 'test-results/manual-incompatible-contract.png', fullPage: true });
});

test('rejects malformed and mismatched bridge events without mutating selection state', async ({ page }) => {
  await launch(page);
  const active = await page.evaluate(async () => (await fetch('/api/repository').then(response => response.json())).sessions.find((item: { previewId: string }) => item.previewId === 'left'));
  await page.evaluate(({ active }) => { const target = document.querySelector('[data-preview-id="left"] iframe') as HTMLIFrameElement; const send = (data: unknown) => window.dispatchEvent(new MessageEvent('message', { origin: active.origin, source: target.contentWindow, data })); send({ version: 2, preview: active, type: 'boundary-selected', payload: {} }); send({ version: 2, preview: { ...active, previewId: 'right' }, type: 'selection-mode-enabled' }); }, { active });
  await expect(card(page, 'left').getByRole('alert')).toContainText('Bridge validation failure');
  await expect(card(page, 'left').locator('.panel').filter({ hasText: 'Selected boundary' })).toContainText('None');
});
