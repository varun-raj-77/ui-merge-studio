import { expect, test } from '@playwright/test';

test('resolves exact instance selections to a real generated candidate artifact', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');
  await page.getByRole('button', { name: 'Select' }).click();
  const branchB = page.frameLocator('iframe[title="Branch B live application"]');
  await branchB.getByRole('button', { name: 'Select Quick View on Studio Speaker' }).click();
  await branchB.getByRole('button', { name: 'Select Quick View on Carry Case' }).click();

  const combined = page.frameLocator('iframe[title="Combined live application"]');
  await expect(combined.getByRole('button', { name: 'Quick view' })).toHaveCount(2);
  await expect(combined.getByRole('heading', { name: 'Studio Speaker' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view' })).toBeVisible();
  await expect(combined.getByRole('heading', { name: 'Carry Case' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view' })).toBeVisible();
  await expect(combined.getByRole('heading', { name: 'Arc Headphones' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view' })).toHaveCount(0);
  await expect(combined.getByRole('complementary', { name: 'Category sidebar' })).toHaveCount(0);
});

test('refuses the selected Product-ID conflict and immediately recovers', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');
  await page.getByRole('button', { name: 'Select' }).click();
  const branchB = page.frameLocator('iframe[title="Branch B live application"]');
  await branchB.getByRole('button', { name: 'Select Quick View on Arc Headphones' }).click();
  await page.getByRole('button', { name: 'Try incompatible Product ID' }).click();
  await expect(page.getByRole('alert')).toContainText('Product Quick View + numeric Product ID');
  await expect(page.getByRole('alert')).toContainText('src/types/product.ts#Product');
  await page.getByRole('button', { name: 'Remove incompatible selection' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove Quick View · Arc Headphones' })).toBeVisible();
  await expect(page.frameLocator('iframe[title="Combined live application"]').getByRole('button', { name: 'Quick view' })).toHaveCount(1);
});
