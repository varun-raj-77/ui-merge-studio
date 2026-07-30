import { expect, test } from '@playwright/test';

test('keeps baseline and independent Product Catalogue branch previews interactive', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');
  await expect(page.getByRole('region', { name: 'Baseline product catalogue' })).toBeVisible();
  const branchA = page.getByRole('region', { name: 'Branch A product catalogue' });
  await branchA.getByRole('button', { name: 'Desk' }).click();
  await expect(branchA.getByText('2 products')).toBeVisible();

  await page.getByRole('tab', { name: 'Branch B' }).click();
  const branchB = page.getByRole('region', { name: 'Branch B product catalogue' });
  await branchB.getByRole('button', { name: /Quick view/ }).first().click();
  await expect(branchB.getByRole('dialog', { name: /quick view/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(branchB.getByRole('dialog')).toHaveCount(0);
});
