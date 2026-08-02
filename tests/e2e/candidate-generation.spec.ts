import { expect, test } from '@playwright/test';

const url = '/?mode=showcase&view=compare';

test('resolves exact instance selections to a configuration-driven result without an artifact', async ({ page }) => {
  await page.goto(url);
  const versionB = page.frameLocator('iframe[title="Version B live application"]');
  await versionB.getByRole('heading', { name: 'Studio Speaker' }).scrollIntoViewIfNeeded();
  await versionB.getByRole('button', { name: 'Add Quick View on Studio Speaker' }).click();
  await versionB.getByRole('heading', { name: 'Carry Case' }).scrollIntoViewIfNeeded();
  await versionB.getByRole('button', { name: 'Add Quick View on Carry Case' }).click();
  await page.getByRole('button', { name: 'View combined' }).click();

  const combinedFrame = page.frameLocator('iframe[title="Combined result application"]');
  await expect(page.getByTitle('Combined result application')).not.toHaveAttribute('src');
  await expect(combinedFrame.getByRole('button', { name: 'Quick view' })).toHaveCount(2);
  await expect(combinedFrame.getByRole('heading', { name: 'Studio Speaker' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view' })).toBeVisible();
  await expect(combinedFrame.getByRole('heading', { name: 'Carry Case' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view' })).toBeVisible();
  await expect(combinedFrame.getByRole('heading', { name: 'Arc Headphones' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view' })).toHaveCount(0);
  await expect(combinedFrame.getByRole('complementary', { name: 'Category sidebar' })).toHaveCount(0);
});

test('deselection updates the mounted configured runtime while staying in result view', async ({ page }) => {
  await page.goto(url);
  const versionB = page.frameLocator('iframe[title="Version B live application"]');
  await versionB.getByRole('heading', { name: 'Arc Headphones' }).scrollIntoViewIfNeeded();
  await versionB.getByRole('button', { name: 'Add Quick View on Arc Headphones' }).click();
  await versionB.getByRole('heading', { name: 'Task Lamp' }).scrollIntoViewIfNeeded();
  await versionB.getByRole('button', { name: 'Add Quick View on Task Lamp' }).click();
  await page.getByRole('button', { name: 'View combined' }).click();
  const combinedFrame = page.frameLocator('iframe[title="Combined result application"]');
  await expect(combinedFrame.getByRole('button', { name: 'Quick view' })).toHaveCount(2);

  await page.getByRole('button', { name: 'Remove Quick View · Arc Headphones' }).click();
  await expect(combinedFrame.getByRole('button', { name: 'Quick view' })).toHaveCount(1);
  await expect(combinedFrame.getByRole('heading', { name: 'Task Lamp' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Main foundation · 1 explicit addition' })).toBeVisible();
});
