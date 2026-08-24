import { expect, test } from '@playwright/test';

test('keeps independent Product Catalogue versions interactive and synchronized', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?mode=showcase&view=compare');
  const versionA = page.frameLocator('iframe[title="Version A live application"]');
  const versionB = page.frameLocator('iframe[title="Version B live application"]');
  await versionA.getByRole('button', { name: 'Desk', exact: true }).click();
  await expect(versionA.getByText('2 products')).toBeVisible();
  await expect(versionB.getByLabel('Browse category')).toHaveValue('desk');
  await versionB.getByRole('button', { name: 'Quick view Desk Stand', exact: true }).click();
  await expect(versionB.getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(versionB.getByRole('dialog')).toHaveCount(0);
});
