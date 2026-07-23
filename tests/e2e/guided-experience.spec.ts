import { expect, test } from '@playwright/test';

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });

test('keeps Guided Mode plain-language, responsive, and keyboard operable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.onboarding [role="status"]')).toHaveText('Ready');
  const guidedText = await page.locator('body').innerText();
  for (const phrase of ['Hovered boundary', 'Selected boundary', 'Eligible ancestors', 'Feature slice', 'Merge base', 'Test-file slices', 'Required import specifiers', 'Definition boundary', 'Runtime instance', 'Schema-v2', 'Proven-unrelated', 'Candidate preflight']) expect(guidedText).not.toContain(phrase);
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `docs/evidence/prompt-006/guided-${width}x900.png`, fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Load both versions' }).click();
  await expect(page.locator('.onboarding [role="status"]')).toHaveText('Both versions are ready to compare', { timeout: 90_000 });
  await page.locator('[data-preview-id="left"]').getByRole('button', { name: 'Choose a feature' }).focus();
  await page.keyboard.press('Enter');
  const frame = page.frameLocator('iframe').nth(0);
  await frame.getByRole('button', { name: 'Collapse sidebar' }).focus();
  await frame.getByRole('button', { name: 'Collapse sidebar' }).press('Enter');
  await expect(page.locator('[data-preview-id="left"]')).toContainText('Collapsible Sidebar', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Technical details' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Close technical details' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('passes automated structural accessibility checks in initial and ready states', async ({ page }) => {
  async function audit() {
    return await page.evaluate(() => {
      const visible = (element: Element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 0 && box.height > 0;
      };
      const unnamedButtons = [...document.querySelectorAll('button')].filter(visible).filter(button => !(button.getAttribute('aria-label') || button.textContent?.trim()));
      const unnamedFrames = [...document.querySelectorAll('iframe')].filter(frame => !frame.title);
      const duplicateIds = [...document.querySelectorAll('[id]')].map(node => node.id).filter((id, index, values) => values.indexOf(id) !== index);
      return { h1: document.querySelectorAll('h1').length, unnamedButtons: unnamedButtons.length, unnamedFrames: unnamedFrames.length, duplicateIds };
    });
  }
  await page.goto('/');
  expect(await audit()).toEqual({ h1: 1, unnamedButtons: 0, unnamedFrames: 0, duplicateIds: [] });
  await page.getByRole('button', { name: 'Load both versions' }).click();
  await expect(page.locator('.onboarding [role="status"]')).toHaveText('Both versions are ready to compare', { timeout: 90_000 });
  expect(await audit()).toEqual({ h1: 1, unnamedButtons: 0, unnamedFrames: 0, duplicateIds: [] });
});

test('acknowledges launches immediately, coalesces duplicates, and cancels explicitly', async ({ request }) => {
  const started = Date.now();
  const first = await request.post('/api/previews/left', { data: { branch: 'branch-sidebar' } });
  const elapsed = Date.now() - started;
  expect(first.status()).toBe(202);
  expect(elapsed).toBeLessThan(1_000);
  const firstAck = await first.json();
  const duplicate = await request.post('/api/previews/left', { data: { branch: 'branch-sidebar' } });
  const duplicateAck = await duplicate.json();
  expect(duplicateAck.operationId).toBe(firstAck.operationId);
  expect(duplicateAck.coalesced).toBe(true);
  const replacement = await request.post('/api/previews/left', { data: { branch: 'branch-inspector' } });
  const replacementAck = await replacement.json();
  const superseded = await request.get(`/api/preview-operations/${firstAck.operationId}`);
  expect((await superseded.json()).state).toBe('superseded');
  const cancelled = await request.delete(`/api/preview-operations/${replacementAck.operationId}`);
  expect((await cancelled.json()).state).toBe('cancelled');
});
