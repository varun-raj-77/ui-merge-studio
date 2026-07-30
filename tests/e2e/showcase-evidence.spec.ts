import { expect, test, type FrameLocator, type Page } from '@playwright/test';

const url = '/?mode=showcase&view=compare';
const branchA = (page: Page) => page.frameLocator('iframe[title="Branch A live application"]');
const branchB = (page: Page) => page.frameLocator('iframe[title="Branch B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined live application"]');

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
}

async function cardHasQuickView(frame: FrameLocator, product: string, expected: boolean) {
  const button = frame.getByRole('heading', { name: product }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view' });
  if (expected) await expect(button).toBeVisible(); else await expect(button).toHaveCount(0);
}

test.describe('Product Catalogue selection workspace', () => {
  test('play mode preserves normal application interaction without selecting', async ({ page }) => {
    await page.goto(url);
    await expect(page.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-pressed', 'true');
    await branchA(page).getByRole('button', { name: 'Desk' }).click();
    await expect(branchA(page).getByText('2 products')).toBeVisible();
    await branchB(page).getByRole('button', { name: 'Quick view' }).first().click();
    await expect(branchB(page).getByRole('dialog', { name: 'Arc Headphones quick view' })).toBeVisible();
    await branchB(page).getByRole('button', { name: 'Close quick view' }).click();
    await expect(page.getByText('Baseline · no feature scopes selected')).toBeVisible();
  });

  test('selects with pointer and keyboard, exposes evidence, and composes exact mixed states', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url);
    await page.getByRole('button', { name: 'Select' }).click();
    await expect(branchA(page).locator('[data-ums-scope]')).toHaveCount(1);
    await expect(branchB(page).locator('[data-ums-scope]')).toHaveCount(5);
    await expect(branchB(page).locator('[data-ums-scope]:not(.quick-view-scope)')).toHaveCount(0);

    const speaker = branchB(page).getByRole('button', { name: 'Select Quick View on Studio Speaker' });
    await speaker.focus();
    await speaker.press('Enter');
    await expect(branchB(page).locator('[data-ums-scope="product-quick-view:p-102"]')).toHaveAttribute('data-ums-selected', '');
    await branchB(page).getByRole('button', { name: 'Select Quick View on Carry Case' }).hover();
    await expect(page.getByText('Quick View · Carry Case').first()).toBeVisible();
    await page.getByRole('button', { name: 'Info' }).click();
    const dialog = page.getByRole('dialog', { name: 'Quick View · Carry Case' });
    await expect(dialog).toContainText('ProductCardWithQuickView');
    await dialog.getByRole('tab', { name: 'dependencies' }).click();
    await expect(dialog).toContainText('useSelectedProduct');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await branchB(page).getByRole('button', { name: 'Select Quick View on Carry Case' }).click();
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(2);
    await cardHasQuickView(combined(page), 'Studio Speaker', true);
    await cardHasQuickView(combined(page), 'Carry Case', true);
    await cardHasQuickView(combined(page), 'Arc Headphones', false);

    await branchA(page).getByRole('button', { name: 'Select Category sidebar' }).click();
    await expect(combined(page).getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
    await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/workspace-two-quickviews-sidebar.png', fullPage: true });

    await branchB(page).getByRole('button', { name: 'Deselect Quick View on Studio Speaker' }).press('Enter');
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(1);
    await cardHasQuickView(combined(page), 'Studio Speaker', false);
    await cardHasQuickView(combined(page), 'Carry Case', true);
  });

  test('selection order resolves to the same canonical artifact and clear-all returns to baseline', async ({ page }) => {
    await page.goto(url);
    await page.getByRole('button', { name: 'Select' }).click();
    await branchB(page).getByRole('button', { name: 'Select Quick View on Carry Case' }).click();
    await branchB(page).getByRole('button', { name: 'Select Quick View on Studio Speaker' }).click();
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(2);
    const first = await page.getByTitle('Combined live application').getAttribute('src');
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(0);
    await branchB(page).getByRole('button', { name: 'Select Quick View on Studio Speaker' }).click();
    await branchB(page).getByRole('button', { name: 'Select Quick View on Carry Case' }).click();
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(2);
    expect(await page.getByTitle('Combined live application').getAttribute('src')).toBe(first);
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.getByText('Baseline · no feature scopes selected')).toBeVisible();
  });

  test('mobile uses one preview at a time with reachable tray, evidence, and no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await page.getByRole('button', { name: 'Select' }).click();
    await page.getByRole('button', { name: 'Branch B', exact: true }).click();
    await branchB(page).getByRole('button', { name: 'Select Quick View on Arc Headphones' }).click();
    await branchB(page).getByRole('button', { name: 'Select Quick View on Task Lamp' }).focus();
    await page.getByRole('button', { name: 'Info' }).click();
    await expect(page.getByRole('dialog', { name: 'Quick View · Task Lamp' })).toBeVisible();
    await page.getByRole('button', { name: 'Close technical evidence' }).click();
    await branchB(page).getByRole('button', { name: 'Select Quick View on Task Lamp' }).click();
    await page.getByRole('button', { name: 'Combined', exact: true }).click();
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(2);
    await page.getByRole('button', { name: 'Remove Quick View · Arc Headphones' }).click();
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(1);
    await noOverflow(page);
    await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/workspace-mobile-instance-selection.png', fullPage: true });
  });
});
