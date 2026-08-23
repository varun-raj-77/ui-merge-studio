import { expect, test, type FrameLocator } from '@playwright/test';

const url = '/?mode=showcase&view=compare&select=parts';

async function addQuickView(frame: FrameLocator, product: string) {
  await frame.getByRole('button', { name: `Quick view ${product}` }).evaluate(element => element.scrollIntoView({ block: 'center' }));
  await frame.getByRole('heading', { name: product }).locator('xpath=ancestor::article').hover();
  const button = frame.getByRole('button', { name: `Keep Quick View on ${product} from Version B` });
  await expect(button).toBeVisible();
  await button.click();
}

test('resolves exact instance selections to a configuration-driven result without an artifact', async ({ page }) => {
  await page.goto(url);
  const versionB = page.frameLocator('iframe[title="Version B live application"]');
  await addQuickView(versionB, 'Studio Speaker');
  await addQuickView(versionB, 'Carry Case');
  await page.getByRole('button', { name: /Combine 2 parts/ }).click();

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
  await addQuickView(versionB, 'Arc Headphones');
  await addQuickView(versionB, 'Task Lamp');
  await page.getByRole('button', { name: /Combine 2 parts/ }).click();
  const combinedFrame = page.frameLocator('iframe[title="Combined result application"]');
  await expect(combinedFrame.getByRole('button', { name: 'Quick view' })).toHaveCount(2);

  await page.getByRole('button', { name: 'Remove Quick View · Arc Headphones' }).click();
  await expect(combinedFrame.getByRole('button', { name: 'Quick view' })).toHaveCount(1);
  await expect(combinedFrame.getByRole('heading', { name: 'Task Lamp' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Combined result' })).toBeVisible();
});
