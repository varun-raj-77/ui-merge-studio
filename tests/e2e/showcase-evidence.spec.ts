import { expect, test, type FrameLocator, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined result application"]');

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
}

async function addQuickView(page: Page, product: string) {
  await versionB(page).getByRole('button', { name: `Quick view ${product}` }).evaluate(element => element.scrollIntoView({ block: 'center' }));
  const button = versionB(page).getByRole('button', { name: `Add Quick View on ${product}` });
  await expect(button).toBeVisible();
  await button.click();
}

async function cardHasQuickView(frame: FrameLocator, product: string, expected: boolean) {
  const card = frame.locator('article').filter({ hasText: product });
  await expect(card).toHaveCount(1);
  const button = card.getByRole('button', { name: 'Quick view' });
  if (expected) await expect(button).toBeVisible(); else await expect(button).toHaveCount(0);
}

test.describe('outcome-first landing', () => {
  test('communicates the product without exposing implementation detail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?mode=showcase');
    await expect(page.getByRole('heading', { name: 'Compare two implementations. Click the parts you prefer. Create one verified branch.' })).toBeVisible();
    await expect(page.getByText(/select preferred visible features, and let UI Merge trace the required source changes/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try the interactive example' })).toBeVisible();
    await expect(page.getByText('Branch A')).toHaveCount(0);
    await expect(page.getByText('Branch B')).toHaveCount(0);
  });
});

test.describe('mode-free comparison workspace', () => {
  test('supports the complete desktop journey with exact result, evidence, refusal, and recovery', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(compareUrl);
    await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0);
    await expect(page.locator('.mode-toggle')).toHaveCount(0);
    await expect(page.getByTitle('Version A live application')).toBeVisible();
    await expect(page.getByTitle('Version B live application')).toBeVisible();
    await expect(page.getByTitle('Combined result application')).not.toBeVisible();

    await versionA(page).getByRole('button', { name: 'Desk' }).click();
    await expect(versionA(page).getByText('2 products')).toBeVisible();
    await versionB(page).getByRole('button', { name: 'Quick view Desk Stand', exact: true }).click();
    await expect(versionB(page).getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('Foundation');
    await versionB(page).getByRole('button', { name: 'Close quick view' }).click();
    await versionA(page).getByRole('button', { name: 'All' }).click();

    const studioScope = versionB(page).locator('[data-ums-scope="product-quick-view:p-102"]');
    await studioScope.hover();
    await addQuickView(page, 'Studio Speaker');
    await versionB(page).locator('article').filter({ hasText: 'Carry Case' }).scrollIntoViewIfNeeded();
    await addQuickView(page, 'Carry Case');
    await versionA(page).getByRole('complementary', { name: 'Category sidebar' }).scrollIntoViewIfNeeded();
    await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
    await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('3 selections');

    await page.getByRole('button', { name: 'Remove Quick View · Studio Speaker' }).click();
    await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 selections');
    await page.getByRole('button', { name: 'View combined' }).click();

    await expect(page.getByRole('heading', { name: 'One verified combined result' })).toBeVisible();
    await expect(page.getByTitle('Version A live application')).not.toBeVisible();
    await expect(page.getByTitle('Version B live application')).not.toBeVisible();
    await expect(page.getByTitle('Combined result application')).toBeVisible();
    await expect(combined(page).getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(1);
    await cardHasQuickView(combined(page), 'Carry Case', true);
    await cardHasQuickView(combined(page), 'Arc Headphones', false);

    await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/refined-combined-result.png', fullPage: true });
    await page.getByRole('button', { name: '← Back to comparison' }).click();
    await expect(page.getByTitle('Version A live application')).toBeVisible();

    const evidenceTrigger = page.getByRole('button', { name: 'Evidence for Quick View · Carry Case' });
    await evidenceTrigger.click();
    const evidence = page.getByRole('dialog', { name: 'Quick View · Carry Case' });
    await expect(evidence).toContainText('ProductQuickViewShelf');
    await evidence.getByRole('tab', { name: 'dependencies' }).click();
    await expect(evidence).toContainText('Hooks');
    await evidence.getByRole('tab', { name: 'verification' }).click();
    await expect(evidence).toContainText('TypeScript');
    await expect(evidence).toContainText('Feature tests');
    await expect(evidence).toContainText('Production build');
    await page.keyboard.press('Escape');
    await expect(evidence).toHaveCount(0);
    await expect(evidenceTrigger).toBeFocused();

    await page.getByRole('button', { name: '+ Experimental Product-ID change' }).click();
    await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('Conflict');
    await page.getByRole('button', { name: 'Review conflict' }).click();
    const conflict = page.getByRole('dialog', { name: 'Cannot combine safely' });
    await expect(conflict).toContainText('src/types/product.ts#Product');
    await conflict.getByRole('button', { name: 'See why' }).click();
    await expect(conflict).toContainText('One selected slice replaces the existing Product contract');
    await conflict.getByRole('button', { name: 'Remove incompatible change' }).click();
    await expect(conflict).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View combined' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Quick View · Carry Case' })).toBeVisible();
  });

  test('mobile keeps one preview visible and uses the dock as a bottom-sheet control', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(compareUrl);
    await expect(page.getByRole('button', { name: 'Version A', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Version B', exact: true }).click();
    await expect(page.getByTitle('Version B live application')).toBeVisible();

    const arcLauncher = versionB(page).getByRole('button', { name: 'Quick view Arc Headphones', exact: true });
    await arcLauncher.focus();
    await arcLauncher.press('Enter');
    await expect(versionB(page).getByRole('dialog', { name: 'Arc Headphones quick view' })).toBeVisible();
    await versionB(page).getByRole('button', { name: 'Close quick view' }).click();

    await addQuickView(page, 'Arc Headphones');
    await versionB(page).locator('article').filter({ hasText: 'Task Lamp' }).scrollIntoViewIfNeeded();
    await addQuickView(page, 'Task Lamp');
    const dockToggle = page.locator('.dock-toggle');
    await expect(dockToggle).toHaveCount(1);
    await expect(dockToggle).toHaveAttribute('aria-expanded', 'false');
    await dockToggle.click();
    await expect(dockToggle).toHaveAttribute('aria-expanded', 'true');

    const evidenceTrigger = page.getByRole('button', { name: 'Evidence for Quick View · Task Lamp' });
    await evidenceTrigger.click();
    await expect(page.getByRole('dialog', { name: 'Quick View · Task Lamp' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Remove Quick View · Arc Headphones' }).click();
    await page.getByRole('button', { name: 'View combined' }).click();
    await expect(page.getByTitle('Combined result application')).toBeVisible();
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(1);
    await cardHasQuickView(combined(page), 'Task Lamp', true);
    await page.getByRole('button', { name: '← Back to comparison' }).click();
    await expect(page.getByRole('button', { name: 'Version B', exact: true })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/refined-mobile-comparison.png', fullPage: true });
  });
});
