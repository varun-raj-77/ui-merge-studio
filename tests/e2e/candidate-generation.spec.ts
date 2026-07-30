import { expect, test } from '@playwright/test';

test('replays the verified two-feature combined result and its real exclusions', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');
  await page.getByRole('button', { name: 'Select category sidebar' }).click();
  await page.getByRole('tab', { name: 'Branch B' }).click();
  await page.getByRole('button', { name: 'Select quick-view inspector' }).click();
  await page.getByRole('button', { name: 'Evaluate selected combination' }).click();

  const result = page.locator('.success-outcome');
  await expect(result.getByRole('heading', { name: 'Combined result' })).toBeVisible();
  await expect(result).toContainText('Excluded: Promotional banner and inventory summary.');
  const catalogue = result.getByRole('region', { name: 'Combined result product catalogue' });
  await expect(catalogue.getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
  await catalogue.getByRole('button', { name: /Quick view/ }).first().click();
  await expect(catalogue.getByRole('dialog', { name: 'Arc Headphones quick view' })).toBeVisible();
});

test('replays the engine-generated Product-ID refusal before candidate mutation', async ({ page }) => {
  await page.goto('/?mode=showcase&view=compare');
  await page.getByRole('button', { name: 'Replay Product-ID refusal proof' }).click();
  const refusal = page.getByRole('alert');
  await expect(refusal).toContainText('Cannot combine these selections.');
  await expect(refusal).toContainText('No candidate was attempted or created.');
  await refusal.getByText('Technical details').click();
  await expect(refusal).toContainText('src/types/product.ts#Product');
});
