import { expect, test, type Page } from '@playwright/test';

const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');

test('replays rendered Product Catalogue selections with generated source evidence', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await page.getByRole('button', { name: 'Evidence for Category sidebar' }).click();
  let evidence = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(evidence).toContainText('CategorySidebar');
  await expect(evidence).toContainText('src/features/catalogue/CategorySidebar.tsx');
  await evidence.getByRole('button', { name: 'Close technical evidence' }).click();

  await versionB(page).getByRole('button', { name: 'Quick view Arc Headphones' }).evaluate(element => element.scrollIntoView({ block: 'center' }));
  const addQuickView = versionB(page).getByRole('button', { name: 'Add Quick View on Arc Headphones' });
  await expect(addQuickView).toBeVisible();
  await addQuickView.click();
  await page.getByRole('button', { name: 'Evidence for Quick View · Arc Headphones' }).click();
  evidence = page.getByRole('dialog', { name: 'Quick View · Arc Headphones' });
  await expect(evidence).toContainText('ProductQuickViewShelf');
  await expect(evidence).toContainText('src/features/catalogue/ProductQuickViewShelf.tsx');
  await expect(evidence).toContainText('p-101');
});
