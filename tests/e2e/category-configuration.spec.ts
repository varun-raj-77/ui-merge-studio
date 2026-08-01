import { expect, test, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined result application"]');

async function addAndConfigureSidebar(page: Page) {
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  const customize = page.getByRole('button', { name: 'Customize categories' });
  await customize.focus();
  await customize.click();
  let dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('button', { name: 'Close category customization' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Apply customization' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(customize).toBeFocused();
  await customize.click();
  dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog).toContainText('Version A · /catalogue');
  await dialog.getByRole('checkbox', { name: 'All' }).uncheck();
  await expect(dialog.getByRole('button', { name: 'Apply customization' })).toBeDisabled();
  await expect(dialog).toContainText('Choose a default category from the categories you kept.');
  await dialog.getByRole('radio', { name: 'Desk' }).check();
  await dialog.getByRole('button', { name: 'Apply customization' }).click();
}

async function openMobileReviewIfCollapsed(page: Page) {
  const review = page.getByRole('button', { name: /1 selection Review/ });
  if (await review.isVisible()) await review.click();
}

async function runRecordedAudioConfigurationJourney(page: Page) {
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await page.getByRole('button', { name: 'Customize categories' }).click();
  let dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await dialog.getByRole('checkbox', { name: 'All' }).uncheck();
  await dialog.getByRole('radio', { name: 'Audio' }).check();
  await dialog.getByRole('button', { name: 'Apply customization' }).click();

  await openMobileReviewIfCollapsed(page);
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Category sidebar');
  await expect(dock).toContainText('Audio, Desk, Travel');
  await expect(dock).toContainText('Default: Audio');
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.comparison-shell')).toHaveAttribute('data-context-category', 'all');

  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Back to comparison', exact: true }).first().click();
  await page.getByRole('button', { name: 'Customize categories' }).click();
  dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('checkbox', { name: 'All' })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Audio' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Desk' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Travel' })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'All' })).toHaveCount(0);
  await expect(dialog.getByRole('radio', { name: 'Audio' })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Desk' })).not.toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Travel' })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(dock).not.toContainText('Default: Audio');
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Desk', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(dock).toContainText('Audio, Desk, Travel');
  await expect(dock).toContainText('Default: Audio');
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.comparison-shell')).toHaveAttribute('data-context-category', 'all');
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
]) {
  test(`${viewport.name} persists the exact recorded Audio configuration through previews, reopening, Undo, and Redo`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(compareUrl);
    await runRecordedAudioConfigurationJourney(page);
    if (viewport.name === 'mobile') {
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });
}

test('production journey persists one Travel-excluded sidebar decision everywhere', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await page.getByRole('button', { name: 'Customize categories' }).click();
  let dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await dialog.getByRole('checkbox', { name: 'Travel' }).uncheck();
  await dialog.getByRole('button', { name: 'Apply customization' }).click();

  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('All, Audio, Desk');
  await expect(dock).toContainText('Default: All');
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Desk', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to comparison', exact: true }).first().click();

  await page.getByRole('button', { name: 'Customize categories' }).click();
  dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('checkbox', { name: 'Travel' })).not.toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'All' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toBeVisible();
  await expect(dock).not.toContainText('Default: All');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);
  await expect(dock).toContainText('All, Audio, Desk');
  await expect(dock).toContainText('Default: All');
});

test('desktop configures the sidebar atomically and composes it with Desk Stand Quick View', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await addAndConfigureSidebar(page);

  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Audio, Desk, Travel');
  await expect(dock).toContainText('Default: Desk');
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('region', { name: 'Selection history' })).toContainText('Customized Category sidebar');
  await page.getByRole('button', { name: 'History' }).click();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(dock).not.toContainText('Default: Desk');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(dock).toContainText('Default: Desk');

  await versionB(page).getByRole('heading', { name: 'Desk Stand' }).scrollIntoViewIfNeeded();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Desk Stand' }).click();
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(page.getByText('Configured preview', { exact: true })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Audio', exact: true })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(1);
  await expect(combined(page).getByRole('heading', { name: 'Desk Stand' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view', exact: true })).toBeVisible();
  await combined(page).getByRole('button', { name: 'Audio', exact: true }).click();
  await expect(combined(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('unsupported temporary All falls back to permanent Desk with an explanation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(compareUrl);
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await addAndConfigureSidebar(page);
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(page.locator('.context-notice')).toContainText('All is not included in this result. Showing the default category, Desk.');
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.comparison-shell')).toHaveAttribute('data-context-category', 'all');
});

test('mobile editor, Review, and configured result remain reachable without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(compareUrl);
  await addAndConfigureSidebar(page);
  const review = page.getByRole('button', { name: '1 selection Review' });
  await review.click();
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Audio, Desk, Travel');
  await expect(dock).toContainText('Default: Desk');
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
