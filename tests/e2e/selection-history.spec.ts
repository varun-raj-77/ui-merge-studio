import { expect, test, type FrameLocator, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare';

function versionA(page: Page) {
  return page.frameLocator('iframe[title="Version A live application"]');
}

function versionB(page: Page) {
  return page.frameLocator('iframe[title="Version B live application"]');
}

function combined(page: Page) {
  return page.frameLocator('iframe[title="Combined result application"]');
}

function productCard(frame: FrameLocator, name: string) {
  return frame.locator('article').filter({ hasText: name });
}

test('desktop selections support undo, redo, redo invalidation, and context exclusion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  const shell = page.locator('main.comparison-shell');

  await versionA(page).getByRole('button', { name: 'Desk' }).click();
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('desk');
  await expect(shell).toHaveAttribute('data-history-past', '0');

  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Task Lamp' }).click();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Desk Stand' }).click();
  await expect(shell).toHaveAttribute('data-history-past', '3');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('3 selections');

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 selection');
  await expect(shell).toHaveAttribute('data-history-future', '2');

  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('3 selections');
  await expect(shell).toHaveAttribute('data-history-future', '0');

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await versionB(page).getByRole('button', { name: 'Remove Quick View on Task Lamp' }).click();
  await expect(shell).toHaveAttribute('data-history-future', '0');
  await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeDisabled();
  await expect(versionA(page).getByRole('button', { name: 'Desk' })).toHaveAttribute('aria-pressed', 'true');
});

test('combined result removes a feature and Undo restores its exact candidate in place', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);

  await versionA(page).getByRole('button', { name: 'Desk' }).click();
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await productCard(versionB(page), 'Desk Stand').scrollIntoViewIfNeeded();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Desk Stand' }).click();
  await expect(page.getByRole('button', { name: 'Remove Quick View · Desk Stand' })).toBeVisible();
  await productCard(versionB(page), 'Desk Stand').getByRole('button', { name: 'Quick view', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove Quick View · Desk Stand' }).click();
  await expect(page.getByTitle('Combined result application')).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Desk' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 selection');
  await expect(page.locator('.history-feedback')).toContainText('Removed Quick View · Desk Stand');

  await page.locator('.history-feedback').getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTitle('Combined result application')).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Desk' })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 selections');

  await combined(page).getByRole('button', { name: 'Desk' }).focus();
  await page.keyboard.press('Control+Z');
  await expect(page.getByTitle('Combined result application')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 selection');
});

test('Clear all is one reversible action and keyboard shortcuts respect typing controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(compareUrl);
  const shell = page.locator('main.comparison-shell');

  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Studio Speaker' }).click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('0 selections');
  await page.locator('.history-feedback').getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 selections');

  await page.keyboard.press('Control+Shift+Z');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('0 selections');
  await page.keyboard.press('Control+Z');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 selections');

  const pastBeforeTyping = await shell.getAttribute('data-history-past');
  await versionB(page).getByLabel('Browse category').focus();
  await page.keyboard.press('Control+Z');
  await expect(shell).toHaveAttribute('data-history-past', pastBeforeTyping ?? '');
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('all');

  await versionA(page).getByRole('button', { name: 'All' }).focus();
  await page.keyboard.press('Control+Z');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 selection');
});

test('mobile Review keeps history controls reachable without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(compareUrl);

  await versionA(page).getByRole('button', { name: 'Desk' }).click();
  await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await productCard(versionB(page), 'Desk Stand').scrollIntoViewIfNeeded();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Desk Stand' }).click();
  await page.getByRole('button', { name: '1 selection Review' }).click();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('0 selections');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 selection');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Selection history' })).toContainText('Added Quick View · Desk Stand');
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('desk');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({
    path: 'test-results/selection-history-mobile.png',
    fullPage: true
  });
});
