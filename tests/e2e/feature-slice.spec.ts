import { expect, test, type Page } from '@playwright/test';

const url = '/?mode=showcase&view=compare';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');

test('shows generated dependency and exclusion evidence for both selected features', async ({ page }) => {
  await page.goto(url);
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await page.getByRole('button', { name: 'Evidence for Category sidebar' }).click();
  let evidence = page.getByRole('dialog', { name: 'Category sidebar' });
  await evidence.getByRole('tab', { name: 'dependencies' }).click();
  await expect(evidence).toContainText('useCategoryFilter');
  await expect(evidence).toContainText('category-sidebar.css');
  await expect(evidence).toContainText('src/features/catalogue/CatalogueHeader.tsx');
  await evidence.getByRole('button', { name: 'Close technical evidence' }).click();

  await versionB(page).getByRole('button', { name: 'Quick view Arc Headphones' }).evaluate(element => element.scrollIntoView({ block: 'center' }));
  const addQuickView = versionB(page).getByRole('button', { name: 'Add Quick View on Arc Headphones' });
  await expect(addQuickView).toBeVisible();
  await addQuickView.click();
  await page.getByRole('button', { name: 'Evidence for Quick View · Arc Headphones' }).click();
  evidence = page.getByRole('dialog', { name: 'Quick View · Arc Headphones' });
  await evidence.getByRole('tab', { name: 'dependencies' }).click();
  await expect(evidence).toContainText('useSelectedProduct');
  await expect(evidence).toContainText('quick-view.css');
  await expect(evidence).toContainText('src/utils/inventorySummary.ts');
});

test('prevents unsupported sibling changes from becoming selections', async ({ page }) => {
  await page.goto(url);
  await expect(page.getByRole('button', { name: /promotional banner/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /inventory summary/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'View combined' })).toBeEnabled();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('Foundation');
});
