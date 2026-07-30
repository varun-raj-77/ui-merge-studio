import { expect, test } from '@playwright/test';

test('shows generated dependency and exclusion evidence for both selected features', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');
  await page.getByRole('button', { name: 'Select category sidebar' }).click();
  await page.getByRole('tab', { name: 'Branch B' }).click();
  await page.getByRole('button', { name: 'Select quick-view inspector' }).click();

  const evidence = page.locator('.evidence-drawer');
  await expect(evidence).toContainText('useCategoryFilter');
  await expect(evidence).toContainText('category-sidebar.css');
  await expect(evidence).toContainText('useSelectedProduct');
  await expect(evidence).toContainText('quick-view.css');
  await expect(evidence).toContainText('Promotional banner');
  await expect(evidence).toContainText('Inventory summary');
});

test('does not claim an unrecorded sibling selection was generated', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');
  await page.getByRole('button', { name: 'Select promotional banner' }).click();
  await page.getByRole('button', { name: 'Evaluate selected combination' }).click();
  await expect(page.getByRole('heading', { name: 'No recorded result for this combination.' })).toBeVisible();
});
