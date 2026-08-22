import { expect, test, type FrameLocator, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined result application"]');

async function configureSidebar(page: Page, options: {
  enabled: ('All' | 'Audio' | 'Desk' | 'Travel')[];
  defaultCategory: 'All' | 'Audio' | 'Desk' | 'Travel';
  heading: boolean;
  counts: boolean;
}) {
  await page.getByRole('button', { name: 'Customize & add' }).click();
  const dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  for (const label of ['All', 'Audio', 'Desk', 'Travel'] as const) {
    const checkbox = dialog.getByRole('checkbox', { name: label });
    if (options.enabled.includes(label)) await checkbox.check(); else await checkbox.uncheck();
  }
  await dialog.getByRole('radio', { name: options.defaultCategory }).check();
  const heading = dialog.getByRole('checkbox', { name: /Show.*heading/ });
  const counts = dialog.getByRole('checkbox', { name: 'Show product counts' });
  if (options.heading) await heading.check(); else await heading.uncheck();
  if (options.counts) await counts.check(); else await counts.uncheck();
  await dialog.getByRole('button', { name: 'Add customized sidebar' }).click();
}

async function addQuickView(page: Page, product: string) {
  await versionB(page).getByRole('button', { name: `Quick view ${product}` }).evaluate(element => element.scrollIntoView({ block: 'center' }));
  const button = versionB(page).getByRole('button', { name: `Add Quick View on ${product}` });
  await expect(button).toBeVisible();
  await button.click();
}

async function expectQuickView(frame: FrameLocator, product: string, present: boolean) {
  const card = frame.getByRole('heading', { name: product }).locator('xpath=ancestor::article');
  const quickView = card.getByRole('button', { name: 'Quick view', exact: true });
  if (present) await expect(quickView).toBeVisible(); else await expect(quickView).toHaveCount(0);
}

test('complete canonical plan drives grouped dock, configured result, history, and editor hydration', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await configureSidebar(page, { enabled: ['Audio', 'Desk', 'Travel'], defaultCategory: 'Desk', heading: false, counts: true });
  await addQuickView(page, 'Desk Stand');
  const lastAddStarted = Date.now();
  await addQuickView(page, 'Task Lamp');
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Catalogue · /catalogue');
  await expect(dock).toContainText('Category sidebar');
  await expect(dock).toContainText('Audio, Desk, Travel');
  await expect(dock).toContainText('Default: Desk');
  await expect(dock).toContainText('Heading: Hidden');
  await expect(dock).toContainText('Counts: Shown');
  await expect(dock).toContainText('Quick View');
  await expect(dock).toContainText('Task Lamp, Desk Stand');
  const dockReady = Date.now();

  const shell = page.locator('main.comparison-shell');
  const planIdentity = await shell.getAttribute('data-integration-plan-id');
  expect(planIdentity).toMatch(/^plan-v2-[a-f0-9]{8}$/);
  await expect(shell).toHaveAttribute('data-preview-plan-id', planIdentity!);
  await expect(shell).toHaveAttribute('data-generation-plan-id', planIdentity!);
  await expect(shell).toHaveAttribute('data-verification-plan-id', planIdentity!);
  await expect(shell).toHaveAttribute('data-evidence-plan-id', planIdentity!);
  await expect(shell).toHaveAttribute('data-historical-artifact-required', 'false');

  const combinedStarted = Date.now();
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(page.getByText('Configured preview', { exact: true })).toBeVisible();
  const frame = page.getByTitle('Combined result application');
  await expect(frame).not.toHaveAttribute('src');
  await expect(frame).toHaveAttribute('srcdoc', /<body><\/body>/);
  await expect(combined(page).getByText('Configured Product Catalogue', { exact: true })).toBeVisible();
  await expect(combined(page).getByText('Categories', { exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).locator('[data-ums-product-count="audio"]')).toHaveText('2');
  await expect(combined(page).locator('[data-ums-product-count="desk"]')).toHaveText('2');
  await expect(combined(page).locator('[data-ums-product-count="travel"]')).toHaveText('1');
  await expectQuickView(combined(page), 'Task Lamp', true);
  await expectQuickView(combined(page), 'Desk Stand', true);
  const combinedReady = Date.now();

  const undoStarted = Date.now();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByTitle('Combined result application')).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(1);
  const undoReady = Date.now();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(2);

  await page.getByRole('button', { name: 'Back to comparison', exact: true }).first().click();
  await page.getByRole('button', { name: 'Edit categories' }).click();
  const dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('checkbox', { name: 'All' })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Audio' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Desk' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Travel' })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Desk' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: /Show.*heading/ })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Show product counts' })).toBeChecked();
  const measurements = {
    addActionToDockMs: dockReady - lastAddStarted,
    viewCombinedToReadyMs: combinedReady - combinedStarted,
    undoToRestoredPreviewMs: undoReady - undoStarted
  };
  console.log(`PHASE4_PERFORMANCE ${JSON.stringify(measurements)}`);
  await testInfo.attach('phase4-performance.json', {
    body: JSON.stringify(measurements, null, 2),
    contentType: 'application/json'
  });
});

test('non-matrix plan renders without a historical candidate and keeps projection identities aligned', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(compareUrl);
  await configureSidebar(page, { enabled: ['Audio', 'Travel'], defaultCategory: 'Travel', heading: false, counts: true });
  await addQuickView(page, 'Arc Headphones');
  await addQuickView(page, 'Carry Case');
  const shell = page.locator('main.comparison-shell');
  const identity = await shell.getAttribute('data-integration-plan-id');
  await expect(shell).toHaveAttribute('data-generation-plan-id', identity!);
  await expect(shell).toHaveAttribute('data-verification-plan-id', identity!);
  await expect(shell).toHaveAttribute('data-historical-artifact-required', 'false');
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(page.locator('.context-notice')).toContainText('Showing the default category, Travel.');
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectQuickView(combined(page), 'Carry Case', true);
  await combined(page).getByRole('button', { name: 'Audio', exact: true }).click();
  await expectQuickView(combined(page), 'Arc Headphones', true);
  await expectQuickView(combined(page), 'Studio Speaker', false);
  await expect(shell).toHaveAttribute('data-integration-plan-id', identity!);
});

test('mobile configured plan, refusal recovery, undo, and redo remain reachable without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(compareUrl);
  await configureSidebar(page, { enabled: ['Audio', 'Travel'], defaultCategory: 'Travel', heading: false, counts: true });
  const minimize = page.getByRole('button', { name: /1 selection Minimize/ });
  if (await minimize.isVisible()) await minimize.click();
  await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await addQuickView(page, 'Arc Headphones');
  const review = page.getByRole('button', { name: /2 selections Review/ });
  if (await review.isVisible()) await review.click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('Audio, Travel');
  await page.getByRole('button', { name: 'View combined' }).click();
  await expectQuickView(combined(page), 'Carry Case', false);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByTitle('Combined result application')).toBeVisible();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByTitle('Combined result application')).toBeVisible();
  await page.getByRole('button', { name: 'Back to comparison', exact: true }).first().click();
  await page.getByRole('button', { name: '+ Experimental Product-ID change' }).click();
  await page.getByRole('button', { name: 'Review conflict' }).click();
  await expect(page.getByRole('dialog', { name: 'Cannot combine these selections' })).toContainText('stable string IDs');
  await page.getByRole('button', { name: 'Remove incompatible change' }).click();
  await expect(page.getByRole('button', { name: 'View combined' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
