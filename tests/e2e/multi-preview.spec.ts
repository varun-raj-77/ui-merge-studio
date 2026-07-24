import { expect, test, type Page } from '@playwright/test';

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });
const card = (page: Page, id: 'left' | 'right') => page.locator(`[data-preview-id="${id}"]`);
async function launch(page: Page, left = 'branch-sidebar', right = 'branch-inspector') {
  await page.goto('/');
  await page.getByRole('button', { name: /Try sample demo/ }).click();
  await expect(page.locator('.workspace-status')).toHaveText('Both versions are ready to compare', { timeout: 90_000 });
  for (const [id, label, branch, expected] of [['left', 'Navigation experiment source', left, 'branch-sidebar'], ['right', 'Activity-filter experiment source', right, 'branch-inspector']] as const) {
    if (branch === expected) continue;
    await page.getByLabel(label).selectOption(branch);
    await card(page, id).getByRole('button', { name: 'Restart version' }).click();
    await expect(card(page, id).locator('.version-status')).toHaveText('Ready', { timeout: 90_000 });
  }
  return { left: page.frameLocator('iframe').nth(0), right: page.frameLocator('iframe').nth(1) };
}

test('synchronizes tickets in both directions, responsive preview sizes, and independent selections', async ({ page }) => {
  const frames = await launch(page);
  await frames.left.getByRole('button', { name: /TCK-102/ }).click();
  await expect(frames.right.getByRole('heading', { name: 'Payment gateway timeout' })).toBeVisible();
  await frames.right.getByRole('button', { name: /TCK-103/ }).click();
  await expect(frames.left.getByRole('heading', { name: 'Seat count mismatch' })).toBeVisible();
  await expect(card(page, 'right')).toContainText('Synchronized sample ticket TCK-103');
  for (const preset of [{ name: 'tablet', width: 768 }, { name: 'mobile', width: 390 }, { name: 'desktop', width: 1200 }]) {
    await page.getByLabel('Preview size').selectOption(preset.name);
    for (const id of ['left', 'right'] as const) {
      const shell = card(page, id).locator('.frame-shell');
      await expect(shell).toHaveCSS('max-width', `${preset.width}px`);
      expect(await shell.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    }
    expect(await frames.left.locator('html').evaluate(element => element.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(await frames.right.locator('html').evaluate(element => element.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
  await card(page, 'left').getByRole('button', { name: 'Choose a feature' }).click();
  await frames.left.getByRole('button', { name: 'Collapse sidebar' }).click();
  await card(page, 'right').getByRole('button', { name: 'Choose a feature' }).click();
  await frames.right.getByRole('button', { name: 'note' }).click();
  await expect(card(page, 'left')).toContainText('Collapsible navigation', { timeout: 60_000 });
  await expect(card(page, 'right')).toContainText('Activity filters', { timeout: 60_000 });
  const confirmations = page.getByRole('button', { name: 'Confirm selection' });
  await expect(confirmations).toHaveCount(2, { timeout: 90_000 });
  await confirmations.first().click();
  await confirmations.first().click();
  await expect(page.getByRole('button', { name: 'Create verified branch' })).toBeEnabled({ timeout: 60_000 });
});

test('invalidates a restarted selection, rejects stale sessions, and preserves the peer', async ({ page }) => {
  const frames = await launch(page);
  await card(page, 'left').getByRole('button', { name: 'Choose a feature' }).click();
  await frames.left.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(card(page, 'left')).toContainText('Collapsible navigation', { timeout: 60_000 });
  const oldSession = await page.evaluate(async () => (await fetch('/api/repository').then(response => response.json())).sessions.find((item: { previewId: string }) => item.previewId === 'left'));
  await card(page, 'left').getByRole('button', { name: 'Restart version' }).click();
  await expect(card(page, 'left')).toContainText('The previous choice was cleared.');
  await expect(card(page, 'left').locator('.version-status')).toHaveText('Ready', { timeout: 30_000 });
  await expect(card(page, 'right').locator('.version-status')).toHaveText('Ready');
  const active = await page.evaluate(async () => (await fetch('/api/repository').then(response => response.json())).sessions.find((item: { previewId: string }) => item.previewId === 'left'));
  expect(active.generation).toBe(oldSession.generation + 1);
  await page.evaluate(({ oldSession, active }) => {
    const target = document.querySelector('[data-preview-id="left"] iframe') as HTMLIFrameElement;
    window.dispatchEvent(new MessageEvent('message', { origin: active.origin, source: target.contentWindow, data: { version: 2, preview: { ...oldSession, origin: active.origin }, type: 'selection-mode-enabled' } }));
  }, { oldSession, active });
  await expect(card(page, 'left').getByRole('alert')).toContainText('stale preview message was rejected');
});

test('reports incompatible synchronization while both versions remain interactive', async ({ page }) => {
  const frames = await launch(page, 'branch-sidebar', 'branch-incompatible-route');
  await expect(page.getByLabel('Synchronization status')).toContainText('contracts differ');
  await frames.left.getByRole('button', { name: /TCK-102/ }).click();
  await expect(frames.left.getByRole('heading', { name: 'Payment gateway timeout' })).toBeVisible();
  await expect(frames.right.getByRole('heading', { name: 'Payment gateway timeout' })).toHaveCount(0);
  await frames.right.getByRole('button', { name: /TCK-103/ }).click();
  await expect(frames.right.getByRole('heading', { name: 'Seat count mismatch' })).toBeVisible();
});

test('rejects malformed bridge events without mutating the guided selection', async ({ page }) => {
  await launch(page);
  const active = await page.evaluate(async () => (await fetch('/api/repository').then(response => response.json())).sessions.find((item: { previewId: string }) => item.previewId === 'left'));
  await page.evaluate(({ active }) => {
    const target = document.querySelector('[data-preview-id="left"] iframe') as HTMLIFrameElement;
    window.dispatchEvent(new MessageEvent('message', { origin: active.origin, source: target.contentWindow, data: { version: 2, preview: active, type: 'boundary-selected', payload: {} } }));
  }, { active });
  await expect(card(page, 'left').getByRole('alert')).toContainText('stale preview message was rejected');
  await expect(card(page, 'left')).toContainText('No feature selected');
});
