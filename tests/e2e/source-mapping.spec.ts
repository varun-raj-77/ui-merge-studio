import { expect, test, type Page } from '@playwright/test';

const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');

test('replays rendered Product Catalogue selections with generated source evidence', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare&select=parts');
  await page.getByRole('button', { name: 'Keep Category sidebar from Version A' }).click();
  await page.getByRole('button', { name: 'Inspect Category sidebar selection' }).click();
  await page.getByRole('button', { name: 'Inspect evidence' }).click();
  let evidence = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(evidence).toContainText('CategorySidebar');
  await expect(evidence).toContainText('src/features/catalogue/CategorySidebar.tsx');
  await evidence.getByRole('button', { name: 'Close technical evidence' }).click();

  await versionB(page).getByRole('heading', { name: 'Arc Headphones' }).locator('xpath=ancestor::article').evaluate(element => element.scrollIntoView({ block: 'center' }));
  const addQuickView = page.getByRole('button', { name: 'Keep Quick View on Arc Headphones from Version B' });
  await expect(addQuickView).toBeVisible();
  await addQuickView.click();
  await page.getByRole('button', { name: 'Inspect Quick View · Arc Headphones selection' }).click();
  await page.getByRole('button', { name: 'Inspect evidence' }).click();
  evidence = page.getByRole('dialog', { name: 'Quick View · Arc Headphones' });
  await expect(evidence).toContainText('ProductQuickViewShelf');
  await expect(evidence).toContainText('src/features/catalogue/ProductQuickViewShelf.tsx');
  await expect(evidence).toContainText('p-101');
});
