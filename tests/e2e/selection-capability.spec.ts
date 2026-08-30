import { expect, test, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare&select=parts';

function versionA(page: Page) {
  return page.frameLocator('iframe[title="Version A live application"]');
}

function combined(page: Page) {
  return page.frameLocator('iframe[title="Combined result application"]');
}

test('bulk Quick View uses one canonical plan transition and remains one undoable action', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);

  await page.getByRole('button', { name: 'More selection actions for Version B' }).click();
  await page.getByRole('menuitem', { name: 'Keep Quick View for all products' }).click();
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('5 picked');
  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name: 'Selection history' }).click();
  await expect(page.getByRole('dialog', { name: 'Selection history' })).toContainText(
    'Added Quick View to all products'
  );
  await page.getByRole('button', { name: 'Close technical evidence' }).click();

  await page.getByRole('button', { name: /Combine 5 parts/ }).click();
  const combinedFrame = page.getByTitle('Combined result application');
  const shell = page.locator('main.comparison-shell');
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(5);
  await expect(combinedFrame).not.toHaveAttribute('src');
  await expect(shell).toHaveAttribute('data-historical-artifact-required', 'false');
  const allProductsPlan = await shell.getAttribute('data-integration-plan-id');
  expect(allProductsPlan).toMatch(/^plan-v2-/);

  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name: /Undo/ }).click();
  await expect(page.getByTitle('Combined result application')).toBeVisible();
  await expect(dock).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(0);
  await expect(shell).not.toHaveAttribute('data-integration-plan-id', allProductsPlan ?? '');

  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name: 'Redo' }).click();
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(5);
  await expect(shell).toHaveAttribute('data-integration-plan-id', allProductsPlan ?? '');
  await expect(combinedFrame).not.toHaveAttribute('src');
  await page.getByRole('button', { name: 'Compare again' }).click();
  await expect(dock).toContainText('5 picked');

  await page.getByRole('button', { name: 'Pick parts' }).click();
  const sidebarRegion = page.getByRole('button', { name: 'Keep Category sidebar from Version A' });
  await sidebarRegion.hover();
  await expect(sidebarRegion).toBeVisible();
});

test('mobile Review exposes atomic bulk Undo and Redo without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(compareUrl);
  await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await page.getByRole('button', { name: 'More selection actions for Version B' }).click();
  await page.getByRole('menuitem', { name: 'Keep Quick View for all products' }).click();

  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('5 picked');
  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name: /Undo/ }).click();
  await expect(dock).toHaveCount(0);
  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name: 'Redo' }).click();
  await expect(dock).toContainText('5 picked');
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
});
