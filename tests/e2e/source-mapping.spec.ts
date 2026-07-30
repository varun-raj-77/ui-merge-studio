import { expect, test } from '@playwright/test';

test('replays rendered Product Catalogue selections with generated source evidence', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');

  await page.getByRole('button', { name: 'Select category sidebar' }).click();
  await page.getByRole('button', { name: 'View technical evidence' }).click();
  const sidebarEvidence = page.locator('.evidence-drawer details').filter({ hasText: 'Collapsible category sidebar' });
  await expect(sidebarEvidence).toContainText('CategorySidebar');
  await expect(sidebarEvidence).toContainText('src/features/catalogue/CategorySidebar.tsx');

  await page.getByRole('tab', { name: 'Branch B' }).click();
  await page.getByRole('button', { name: 'Select quick-view inspector' }).click();
  const quickViewEvidence = page.locator('.evidence-drawer details').filter({ hasText: 'Product quick-view inspector' });
  await expect(quickViewEvidence).toContainText('ProductQuickView');
  await expect(quickViewEvidence).toContainText('src/features/catalogue/ProductQuickView.tsx');
});
