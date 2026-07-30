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

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test('desktop preserves Desk from Version A through the exact combined candidate and back', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);

  const deskButton = versionA(page).getByRole('button', { name: 'Desk' });
  await deskButton.focus();
  await deskButton.press('Enter');
  await expect(deskButton).toBeFocused();
  await expect(deskButton).toHaveAttribute('aria-pressed', 'true');
  await expect(versionA(page).getByRole('article')).toHaveCount(2);
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('desk');
  await expect(versionB(page).getByRole('article')).toHaveCount(2);
  await page.screenshot({
    path: 'docs/evidence/product-catalogue-showcase/shared-context-desk-synchronized.png',
    fullPage: true
  });

  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Desk Stand' }).click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 selections');
  const deskQuickButton = productCard(versionB(page), 'Desk Stand').getByRole('button', { name: 'Quick view', exact: true });
  await deskQuickButton.click();
  await expect(versionB(page).getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();
  await expect(page.locator('main.comparison-shell')).toHaveAttribute('data-context-product', 'p-105');
  await expect(page.locator('main.comparison-shell')).toHaveAttribute('data-context-quick-view', 'true');

  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('button', { name: 'Desk' })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('article')).toHaveCount(2);
  await expect(combined(page).getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
  await expect(combined(page).getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(1);
  await page.screenshot({
    path: 'docs/evidence/product-catalogue-showcase/shared-context-desk-combined.png',
    fullPage: true
  });

  await page.getByRole('button', { name: '← Back to comparison' }).click();
  await expect(versionA(page).getByRole('button', { name: 'Desk' })).toHaveAttribute('aria-pressed', 'true');
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('desk');
  expect(consoleErrors).toEqual([]);
});

test('Version B becomes the latest context source and the combined result follows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(compareUrl);

  const category = versionB(page).getByLabel('Browse category');
  await category.focus();
  await category.selectOption('audio');
  await expect(category).toBeFocused();
  await expect(versionA(page).getByRole('button', { name: 'Audio' })).toHaveAttribute('aria-pressed', 'true');
  await expect(versionA(page).getByRole('article')).toHaveCount(2);

  await versionB(page).getByRole('button', { name: 'Add Quick View on Arc Headphones' }).click();
  await productCard(versionB(page), 'Arc Headphones').getByRole('button', { name: 'Quick view', exact: true }).click();
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByLabel('Browse category')).toHaveValue('audio');
  await expect(combined(page).getByRole('article')).toHaveCount(2);
  await expect(combined(page).getByRole('dialog', { name: 'Arc Headphones quick view' })).toBeVisible();
});

test('candidate incompatibility keeps compatible context and announces the Quick View fallback', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);

  await versionA(page).getByRole('button', { name: 'Desk' }).click();
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Desk Stand' }).click();
  await productCard(versionB(page), 'Task Lamp').getByRole('button', { name: 'Quick view', exact: true }).click();
  await page.getByRole('button', { name: 'View combined' }).click();

  await expect(combined(page).getByRole('button', { name: 'Desk' })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('article')).toHaveCount(2);
  await expect(combined(page).getByRole('dialog')).toHaveCount(0);
  const notice = page.getByRole('status').filter({
    hasText: 'Quick View is not available for Task Lamp in this candidate. The product list remains selected.'
  });
  await expect(notice).toBeVisible();
  await page.screenshot({
    path: 'docs/evidence/product-catalogue-showcase/shared-context-quick-view-fallback.png',
    fullPage: true
  });
  await expect(page.getByTitle('Combined result application')).toBeVisible();
});

test('changing the candidate in combined view reapplies context and mobile tabs retain it', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(compareUrl);

  await versionA(page).getByRole('button', { name: 'Desk' }).click();
  await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('desk');
  await productCard(versionB(page), 'Desk Stand').scrollIntoViewIfNeeded();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Desk Stand' }).click();
  await productCard(versionB(page), 'Desk Stand').getByRole('button', { name: 'Quick view', exact: true }).click();
  await expect(versionB(page).getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();
  await expect(page.locator('main.comparison-shell')).toHaveAttribute('data-context-quick-view', 'true');
  await page.getByRole('button', { name: '1 selection Review' }).click();
  await page.getByRole('button', { name: 'View combined' }).click();

  await expect(combined(page).getByLabel('Browse category')).toHaveValue('desk');
  await expect(combined(page).getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove Quick View · Desk Stand' }).click();
  await expect(combined(page).getByLabel('Browse category')).toHaveValue('desk');
  await expect(combined(page).getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('status').filter({
    hasText: 'Quick View is not available for Desk Stand in this candidate.'
  })).toBeVisible();

  await page.getByRole('button', { name: '← Back to comparison' }).click();
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('desk');
  await page.getByRole('button', { name: 'Version A', exact: true }).click();
  await expect(versionA(page).getByRole('button', { name: 'Desk' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({
    path: 'docs/evidence/product-catalogue-showcase/shared-context-mobile.png',
    fullPage: true
  });
  expect(consoleErrors).toEqual([]);
});
