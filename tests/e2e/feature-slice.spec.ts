import { expect, test } from '@playwright/test';

test('shows generated dependency and exclusion evidence for both selected features', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');
  await page.getByRole('button', { name: 'Select category sidebar' }).click();
  await page.getByRole('tab', { name: 'Branch B' }).click();
  await page.getByRole('button', { name: 'Select quick-view inspector' }).click();
  await page.getByRole('button', { name: 'View technical evidence' }).click();

  const evidence = page.locator('.evidence-drawer');
  await expect(evidence).toContainText('useCategoryFilter');
  await expect(evidence).toContainText('category-sidebar.css');
  await expect(evidence).toContainText('useSelectedProduct');
  await expect(evidence).toContainText('quick-view.css');
  await expect(evidence).toContainText('Promotional banner');
  await expect(evidence).toContainText('Inventory summary');
});

test('prevents unsupported sibling changes from becoming selections', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');
  await expect(page.getByText('Workspace essentials, 20% off')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select promotional banner' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Branch B' }).click();
  await expect(page.getByText('5 products ready')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select inventory summary' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create combined version' })).toBeDisabled();
});
