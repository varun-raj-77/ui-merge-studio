import { expect, test, type Locator, type Page } from '@playwright/test';

const url = '/?mode=showcase';
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
}
async function centerInside(region: Locator, control: Locator) {
  const [box, child] = await Promise.all([region.boundingBox(), control.boundingBox()]);
  expect(box).not.toBeNull(); expect(child).not.toBeNull();
  const x = child!.x + child!.width / 2; const y = child!.y + child!.height / 2;
  expect(x).toBeGreaterThanOrEqual(box!.x); expect(x).toBeLessThanOrEqual(box!.x + box!.width);
  expect(y).toBeGreaterThanOrEqual(box!.y); expect(y).toBeLessThanOrEqual(box!.y + box!.height);
}
async function openComparison(page: Page) {
  await page.getByRole('button', { name: 'Try interactive sample' }).click();
  await expect(page.getByRole('heading', { name: 'Choose the interface you want.' })).toBeVisible();
}

test.describe('Product Catalogue Showcase', () => {
  test('compact landing communicates product at 1366 × 768 and 1440 × 900', async ({ page }) => {
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport); await page.goto(url);
      await expect(page.getByRole('heading', { name: 'Compare React branches. Keep the best parts.' })).toBeInViewport();
      await expect(page.getByRole('button', { name: 'Try interactive sample' })).toBeInViewport();
      await expect(page.getByRole('link', { name: 'Run locally' }).first()).toBeInViewport();
      await expect(page.getByText('Interactive sample — no Git operations run in your browser.')).toBeInViewport();
      await noOverflow(page);
      await page.screenshot({ path: `docs/evidence/product-catalogue-showcase/landing-${viewport.width}.png`, fullPage: false });
    }
  });

  test('baseline stays visible while free selection, branch switching, and interactions work', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(url); await openComparison(page);
    await expect(page.getByLabel('Baseline product catalogue')).toBeVisible();
    await expect(page.getByLabel('Branch A product catalogue')).toBeVisible();
    await expect(page.getByText('Nothing selected yet')).toBeVisible();
    await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/initial-empty.png', fullPage: true });
    const sidebar = page.getByLabel('Branch A product catalogue').getByRole('complementary', { name: 'Category sidebar' });
    await centerInside(sidebar, sidebar.getByRole('button', { name: 'Collapse category sidebar' }));
    await centerInside(sidebar, sidebar.getByRole('button', { name: 'Audio' }));
    await sidebar.getByRole('button', { name: 'Collapse category sidebar' }).click();
    await expect(sidebar.getByRole('button', { name: 'Expand category sidebar' })).toBeVisible();
    await sidebar.getByRole('button', { name: 'Expand category sidebar' }).click();
    await sidebar.getByRole('button', { name: 'Desk' }).click();
    await expect(page.getByLabel('Branch A product catalogue')).toContainText('2 products');
    await sidebar.getByRole('button', { name: 'Select category sidebar' }).click();
    await expect(page.getByText('src/features/catalogue/CategorySidebar.tsx')).toBeVisible();
    await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/baseline-branch-a-selected.png', fullPage: true });
    await page.getByRole('tab', { name: 'Branch B' }).click();
    await expect(page.getByLabel('Baseline product catalogue')).toBeVisible();
    const branchB = page.getByLabel('Branch B product catalogue');
    await branchB.getByRole('button', { name: /Quick view/ }).first().click();
    await expect(branchB.getByRole('dialog')).toBeVisible();
    await expect(branchB.getByRole('button', { name: 'Close quick view' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(branchB.getByRole('dialog')).toBeHidden();
    await branchB.getByRole('button', { name: 'Select quick-view inspector' }).click();
    await expect(page.getByText('src/features/catalogue/ProductQuickView.tsx')).toBeVisible();
    await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/baseline-branch-b-selected.png', fullPage: true });
  });

  test('safe result excludes siblings, incompatible pair refuses, and unrecorded pair is honest', async ({ page }) => {
    await page.goto(url); await openComparison(page);
    await page.getByRole('button', { name: 'Select category sidebar' }).click();
    await page.getByRole('tab', { name: 'Branch B' }).click();
    await page.getByRole('button', { name: 'Select quick-view inspector' }).click();
    await page.getByRole('button', { name: 'Evaluate selected combination' }).click();
    await expect(page.getByRole('heading', { name: 'Combined result' })).toBeVisible();
    await expect(page.getByText(/Excluded: Promotional banner and Newest-first sorting/)).toBeVisible();
    const combined = page.getByLabel('Combined result product catalogue');
    await combined.getByRole('button', { name: 'Collapse category sidebar' }).click();
    await combined.getByRole('button', { name: 'Expand category sidebar' }).click();
    await combined.getByRole('button', { name: 'Desk' }).click();
    await combined.getByRole('button', { name: /Quick view/ }).first().click();
    await combined.getByRole('button', { name: 'Close quick view' }).click();
    await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/combined-result.png', fullPage: true });

    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByRole('tab', { name: 'Branch A' }).click();
    await page.getByRole('button', { name: 'Select promotional banner' }).click();
    await page.getByRole('tab', { name: 'Branch B' }).click();
    await page.getByRole('button', { name: 'Select quick-view inspector' }).click();
    await page.getByRole('button', { name: 'Evaluate selected combination' }).click();
    await expect(page.getByRole('alert')).toContainText('product IDs to numbers');
    await expect(page.getByRole('alert')).toContainText('No candidate was attempted or created');
    await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/refusal.png', fullPage: true });

    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByRole('tab', { name: 'Branch A' }).click();
    await page.getByRole('button', { name: 'Select promotional banner' }).click();
    await page.getByRole('button', { name: 'Evaluate selected combination' }).click();
    await expect(page.getByRole('status')).toContainText('no recorded engine result');
  });

  test('mobile comparison remains usable and baseline is one branch-switch action away', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(url); await openComparison(page);
    await expect(page.getByLabel('Baseline product catalogue')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Branch A' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Branch B' })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/mobile-comparison.png', fullPage: true });
  });
});
