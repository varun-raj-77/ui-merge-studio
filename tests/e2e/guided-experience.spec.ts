import { expect, test } from '@playwright/test';

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });

test('keeps Guided Mode plain-language, responsive, and keyboard operable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'UI Merge Studio' })).toBeVisible();
  await expect(page.getByText(/Combine the best UI changes from different React branches/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Try sample demo/ })).toBeVisible();
  await expect(page.getByText(/arbitrary local repositories is the next validation milestone/)).toBeVisible();
  await expect(page.getByText(/fake customer-support application with sample ticket data/)).toBeVisible();
  await expect(page.getByText(/These are examples—not limits/)).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  const guidedText = await page.locator('body').innerText();
  for (const phrase of ['Hovered boundary', 'Selected boundary', 'Eligible ancestors', 'Feature slice', 'Merge base', 'Test-file slices', 'Required import specifiers', 'Definition boundary', 'Runtime instance', 'Schema-v2', 'Proven-unrelated', 'Candidate preflight']) expect(guidedText).not.toContain(phrase);
  for (const { width, height } of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 }
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `docs/evidence/prompt-006d/homepage-${width}x${height}.png`, fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: /Try sample demo/ }).click();
  await expect(page.locator('.workspace-status')).toHaveText('Both live apps are ready to compare', { timeout: 90_000 });
  await expect(page.frameLocator('iframe').nth(0).getByRole('button', { name: /TCK-102/ })).toBeVisible();
  await expect(page.frameLocator('iframe').nth(1).getByRole('button', { name: /TCK-102/ })).toBeVisible();
  await expect(page.getByText(/two live Git branches of the same React application/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Navigation experiment' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Activity-filter experiment' })).toBeVisible();
  await expect(page.getByText('branch-sidebar')).toBeVisible();
  await expect(page.getByText('branch-inspector')).toBeVisible();
  await expect(page.getByRole('combobox', { name: /source/i })).toHaveCount(0);
  await expect(page.locator('.studio')).not.toContainText('Version A');
  await expect(page.locator('.studio')).not.toContainText('Version B');
  expect(await page.locator('.studio').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(245, 242, 235)');
  for (const { width, height } of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 }
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    for (const shell of await page.locator('.frame-shell').all()) expect(await shell.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `docs/evidence/prompt-006d/comparison-${width}x${height}.png`, fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Focus navigation' }).click();
  await expect(page.locator('[data-preview-id="right"]')).toBeHidden();
  await page.screenshot({ path: 'docs/evidence/prompt-006d/focused-navigation-1440x900.png', fullPage: false });
  await page.getByRole('button', { name: 'Side by side' }).click();
  const leftSource = await page.locator('iframe').nth(0).getAttribute('src');
  await page.getByRole('button', { name: '← Back to overview' }).click();
  await expect(page.getByRole('button', { name: /Resume sample demo/ })).toBeVisible();
  await page.getByRole('button', { name: /Resume sample demo/ }).click();
  await expect(page.locator('iframe').nth(0)).toHaveAttribute('src', leftSource!);
  await page.getByRole('button', { name: /UI Merge Studio/ }).click();
  await expect(page.getByRole('button', { name: /Resume sample demo/ })).toBeVisible();
  await page.getByRole('button', { name: /Resume sample demo/ }).click();
  for (const shell of await page.locator('.frame-shell').all()) expect(await shell.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.locator('[data-preview-id="left"]').getByRole('button', { name: 'Choose feature' }).focus();
  await page.keyboard.press('Enter');
  const frame = page.frameLocator('iframe').nth(0);
  await frame.getByRole('button', { name: 'Collapse sidebar' }).focus();
  await frame.getByRole('button', { name: 'Collapse sidebar' }).press('Enter');
  await expect(page.locator('[data-preview-id="left"]')).toContainText('Collapsible navigation', { timeout: 60_000 });
  await expect(page.locator('.selection-summary')).toContainText('Selected');
  await page.screenshot({ path: 'docs/evidence/prompt-006d/selected-features-1440x900.png', fullPage: false });
  await page.getByRole('button', { name: 'View source evidence' }).focus();
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
  await page.getByRole('button', { name: /Try sample demo/ }).click();
  await expect(page.locator('.workspace-status')).toHaveText('Both live apps are ready to compare', { timeout: 90_000 });
  expect(await audit()).toEqual({ h1: 1, unnamedButtons: 0, unnamedFrames: 0, duplicateIds: [] });
});

test('stops a broad activity-feed selection before compatibility or branch creation', async ({ page }) => {
  let preflightRequests = 0;
  page.on('request', request => { if (request.url().endsWith('/api/candidate/preflight')) preflightRequests += 1; });
  await page.goto('/');
  await page.getByRole('button', { name: /Try sample demo/ }).click();
  await expect(page.locator('.workspace-status')).toHaveText('Both live apps are ready to compare', { timeout: 90_000 });
  const leftCard = page.locator('[data-preview-id="left"]');
  const rightCard = page.locator('[data-preview-id="right"]');
  const left = page.frameLocator('iframe').nth(0);
  const right = page.frameLocator('iframe').nth(1);
  await leftCard.getByRole('button', { name: 'Choose feature' }).click();
  await left.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(leftCard).toContainText('Collapsible navigation', { timeout: 60_000 });
  await right.getByRole('button', { name: /TCK-102/ }).click();
  await rightCard.getByRole('button', { name: 'Choose feature' }).click();
  await right.getByRole('heading', { name: 'Activity' }).click();
  await expect(rightCard.getByText('This selection was stopped before branch creation.')).toBeVisible({ timeout: 60_000 });
  await expect(rightCard).toContainText('broader than this guided demo can verify safely');
  await expect(page.getByRole('button', { name: 'Create verified branch' })).toBeDisabled();
  expect(preflightRequests).toBe(0);
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
  const cleanupLaunch = await request.post('/api/previews/right', { data: { branch: 'branch-sidebar' } });
  const cleanupAck = await cleanupLaunch.json();
  const cleanup = await request.delete('/api/preview');
  expect(cleanup.status()).toBe(200);
  const cleanedOperation = await request.get(`/api/preview-operations/${cleanupAck.operationId}`);
  expect((await cleanedOperation.json()).state).toBe('cancelled');
});
