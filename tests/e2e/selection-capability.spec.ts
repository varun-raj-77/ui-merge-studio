import { expect, test, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare';

function versionA(page: Page) {
  return page.frameLocator('iframe[title="Version A live application"]');
}

function combined(page: Page) {
  return page.frameLocator('iframe[title="Combined result application"]');
}

test('bulk Quick View uses one canonical plan transition and remains one undoable action', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);

  await page.getByRole('button', { name: 'Add Quick View to all products' }).click();
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('5 selections');
  await expect(dock).toContainText('Catalogue · /catalogue');
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('region', { name: 'Selection history' })).toContainText(
    'Added Quick View to all products'
  );
  await page.getByRole('button', { name: 'History' }).click();

  await page.getByRole('button', { name: 'View combined' }).click();
  const combinedFrame = page.getByTitle('Combined result application');
  const shell = page.locator('main.comparison-shell');
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(5);
  await expect(combinedFrame).not.toHaveAttribute('src');
  await expect(shell).toHaveAttribute('data-historical-artifact-required', 'false');
  const allProductsPlan = await shell.getAttribute('data-integration-plan-id');
  expect(allProductsPlan).toMatch(/^plan-v2-/);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByTitle('Combined result application')).toBeVisible();
  await expect(dock).toContainText('0 selections');
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(0);
  await expect(shell).not.toHaveAttribute('data-integration-plan-id', allProductsPlan ?? '');

  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(dock).toContainText('5 selections');
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(5);
  await expect(shell).toHaveAttribute('data-integration-plan-id', allProductsPlan ?? '');
  await expect(combinedFrame).not.toHaveAttribute('src');

  await page.getByRole('button', { name: 'Back to comparison', exact: true }).click();
  await versionA(page).getByRole('button', { name: 'Details for Category sidebar' }).click();
  const details = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(details).toContainText('Whole feature');
  await expect(details).toContainText('Version A');
  await expect(details).toContainText('/catalogue');
  await expect(details).toContainText('Supported');
  await expect(details).toContainText('Customize categories');
  await expect(details).toContainText('permanent default');
  await expect(details).not.toContainText(/src\/|\.tsx?/);
});

test('mobile Review exposes atomic bulk Undo and Redo without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(compareUrl);
  await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await page.getByRole('button', { name: 'Add Quick View to all products' }).click();

  await page.getByRole('button', { name: '5 selections Review' }).click();
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Catalogue · /catalogue');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(dock).toContainText('0 selections');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(dock).toContainText('5 selections');
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
});
