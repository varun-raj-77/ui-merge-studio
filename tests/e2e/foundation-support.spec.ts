import { expect, test, type FrameLocator, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined result application"]');

async function addQuickView(page: Page, product: string) {
  await versionB(page).getByRole('button', { name: `Quick view ${product}` }).evaluate(element => element.scrollIntoView({ block: 'center' }));
  const button = versionB(page).getByRole('button', { name: `Add Quick View on ${product}` });
  await expect(button).toBeVisible();
  await button.click();
}

async function quickView(frame: FrameLocator, product: string, present: boolean) {
  const card = frame.locator('article').filter({ hasText: product });
  const button = card.getByRole('button', { name: 'Quick view', exact: true });
  if (present) await expect(button).toBeVisible(); else await expect(button).toHaveCount(0);
}

async function expectNoOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

function collectConsoleFailures(page: Page) {
  const failures: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') failures.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
  return failures;
}

test('Main foundation preserves the historical selective composition', async ({ page }) => {
  const consoleFailures = collectConsoleFailures(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await expect(page.getByRole('radio', { name: /Main/ })).toBeChecked();
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await addQuickView(page, 'Desk Stand');
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Foundation');
  await expect(dock).toContainText('Main');
  await expect(dock).toContainText('Added from Version A');
  await expect(dock).toContainText('Added from Version B');
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
  await quickView(combined(page), 'Desk Stand', true);
  await quickView(combined(page), 'Task Lamp', false);
  await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/phase5-main-foundation.png', fullPage: true });
  await expectNoOverflow(page);
  expect(consoleFailures).toEqual([]);
});

test('Version A foundation includes its complete behavior and exactly two Version B additions', async ({ page }, testInfo) => {
  const consoleFailures = collectConsoleFailures(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  const foundationStarted = Date.now();
  await page.getByRole('radio', { name: /Version A/ }).check();
  await expect(page.getByRole('status')).toContainText('Changed foundation to Version A');
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('All Version A changes included');
  const dockReady = Date.now();
  await addQuickView(page, 'Desk Stand');
  await addQuickView(page, 'Task Lamp');
  await expect(dock).toContainText('Added from Version B');
  await expect(dock).toContainText('Task Lamp, Desk Stand');
  await expect(page.getByRole('button', { name: 'Included with Version A' })).toBeVisible();
  await page.getByRole('button', { name: 'Inspect foundation evidence' }).click();
  const evidence = page.getByRole('dialog', { name: 'Foundation · Version A' });
  await expect(evidence).toContainText('branch-a');
  await expect(evidence).toContainText('Pinned commit');
  await expect(evidence).toContainText('Common ancestor');
  await page.keyboard.press('Escape');
  const combinedStarted = Date.now();
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByText('Seasonal edit')).toBeVisible();
  await expect(combined(page).getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
  await quickView(combined(page), 'Desk Stand', true);
  await quickView(combined(page), 'Task Lamp', true);
  await quickView(combined(page), 'Arc Headphones', false);
  await quickView(combined(page), 'Studio Speaker', false);
  await quickView(combined(page), 'Carry Case', false);
  const combinedReady = Date.now();
  await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/phase5-version-a-foundation.png', fullPage: true });
  await page.getByRole('button', { name: 'Back to comparison', exact: true }).first().click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  const undoStarted = Date.now();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('radio', { name: /Main/ })).toBeChecked();
  const undoReady = Date.now();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByRole('radio', { name: /Version A/ })).toBeChecked();
  const measurements = {
    foundationChangeToDockMs: dockReady - foundationStarted,
    viewCombinedToReadyMs: combinedReady - combinedStarted,
    undoFoundationChangeMs: undoReady - undoStarted
  };
  console.log(`PHASE5_UI_PERFORMANCE ${JSON.stringify(measurements)}`);
  await testInfo.attach('phase5-ui-performance.json', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
  await expectNoOverflow(page);
  expect(consoleFailures).toEqual([]);
});

test('Version B foundation includes every Quick View and accepts the Version A sidebar once', async ({ page }) => {
  const consoleFailures = collectConsoleFailures(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(compareUrl);
  await page.getByRole('radio', { name: /Version B/ }).check();
  await expect(page.getByRole('button', { name: 'Included with Version B' })).toBeVisible();
  await page.getByRole('button', { name: 'Included with Version B' }).click();
  await expect(page.locator('.capability-notice')).toContainText('already included because Version B is the foundation');
  await page.getByRole('button', { name: 'Dismiss selection explanation' }).click();
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('All Version B changes included');
  await expect(dock).toContainText('Added from Version A');
  await expect(dock).toContainText('1 selection');
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(5);
  await expect(combined(page).getByText('5 products ready')).toBeVisible();
  await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/phase5-version-b-foundation.png', fullPage: true });
  await expectNoOverflow(page);
  expect(consoleFailures).toEqual([]);
});

test('incompatible foundation is refused and the previous safe plan remains active', async ({ page }) => {
  const consoleFailures = collectConsoleFailures(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await addQuickView(page, 'Desk Stand');
  const safeIdentity = await page.locator('main.comparison-shell').getAttribute('data-integration-plan-id');
  await page.getByRole('radio', { name: /Experimental Product-ID/ }).click();
  const refusal = page.getByRole('alertdialog', { name: 'Cannot use this foundation' });
  await expect(refusal).toContainText('replaces stable product IDs');
  await expect(page.getByRole('radio', { name: /Main/ })).toBeChecked();
  await expect(page.locator('main.comparison-shell')).toHaveAttribute('data-integration-plan-id', safeIdentity!);
  await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/phase5-foundation-conflict.png', fullPage: true });
  await refusal.getByRole('button', { name: 'Keep previous foundation' }).click();
  await expect(page.getByRole('button', { name: 'Remove Quick View · Desk Stand' })).toBeVisible();
  expect(consoleFailures).toEqual([]);
});

test('mobile foundation plan remains keyboard accessible, reversible, and overflow-free', async ({ page }) => {
  const consoleFailures = collectConsoleFailures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(compareUrl);
  const main = page.getByRole('radio', { name: /Main/ });
  await main.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /Version A/ })).toBeChecked();
  await expect(page.getByRole('status')).toContainText('Changed foundation to Version A');
  await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await addQuickView(page, 'Desk Stand');
  const dockToggle = page.locator('.dock-toggle');
  if (await dockToggle.getAttribute('aria-expanded') === 'false') await dockToggle.click();
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Version A');
  await expect(dock).toContainText('Added from Version B');
  await page.getByRole('button', { name: 'View combined' }).click();
  await quickView(combined(page), 'Desk Stand', true);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await quickView(combined(page), 'Desk Stand', false);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await quickView(combined(page), 'Desk Stand', true);
  await page.screenshot({ path: 'docs/evidence/product-catalogue-showcase/phase5-mobile-plan.png', fullPage: true });
  await expectNoOverflow(page);
  expect(consoleFailures).toEqual([]);
});
