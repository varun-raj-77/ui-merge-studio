import { expect, test, type Page } from '@playwright/test';

const output = 'test-results/prompt-024-visual';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');

async function enterSelection(page: Page) {
  await page.getByRole('button', { name: 'Select parts' }).click();
  await expect(page.getByRole('button', { name: /Selecting/ })).toHaveAttribute('aria-pressed', 'true');
}

async function keepSidebar(page: Page) {
  const sidebar = versionA(page).getByRole('complementary', { name: 'Category sidebar' });
  await sidebar.hover();
  await versionA(page).getByRole('button', { name: 'Keep Category sidebar from Version A' }).click();
}

async function keepQuickView(page: Page, product: string) {
  const scope = versionB(page).locator(`[data-ums-label="Quick View on ${product}"]`);
  await scope.scrollIntoViewIfNeeded();
  await scope.hover();
  await versionB(page).getByRole('button', { name: `Keep Quick View on ${product} from Version B` }).click();
}

test('desktop presentation states', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?mode=showcase');
  await expect(page.getByRole('heading', { name: 'Build the version you actually want.' })).toBeVisible();
  await page.screenshot({ path: `${output}/01-landing-1440x900.png` });

  await page.getByRole('button', { name: 'Try interactive demo' }).click();
  await expect(page.getByTitle('Version A live application')).toBeVisible();
  await page.screenshot({ path: `${output}/02-compare-1440x900.png` });

  await enterSelection(page);
  await versionA(page).getByRole('complementary', { name: 'Category sidebar' }).hover();
  await page.screenshot({ path: `${output}/03-selecting-hover-1440x900.png` });

  await keepSidebar(page);
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 selected');
  await page.screenshot({ path: `${output}/04-one-selection-1440x900.png` });

  await keepQuickView(page, 'Task Lamp');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 selected');
  await page.screenshot({ path: `${output}/05-two-selections-island-1440x900.png` });

  await page.getByRole('button', { name: 'Inspect Category sidebar selection' }).click();
  await expect(page.getByText('Source resolved')).toBeVisible();
  await page.screenshot({ path: `${output}/06-evidence-popover-1440x900.png` });

  await page.getByRole('button', { name: 'Inspect evidence' }).click();
  await expect(page.getByRole('dialog', { name: 'Category sidebar' })).toBeVisible();
  await page.screenshot({ path: `${output}/07-evidence-sheet-1440x900.png` });
  await page.getByRole('button', { name: 'Close technical evidence' }).click();

  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name: 'Experimental Product-ID change' }).click();
  await page.getByRole('button', { name: 'Review refusal' }).click();
  await expect(page.getByRole('dialog', { name: 'Cannot combine safely' })).toBeVisible();
  await page.screenshot({ path: `${output}/09-refusal-1440x900.png` });
  await page.getByRole('button', { name: 'Change selection' }).click();

  await page.getByRole('button', { name: 'Combine 2 parts' }).click();
  await page.screenshot({ path: `${output}/08-generating-1440x900.png` });
  await expect(page.getByText('Verified result')).toBeVisible();
  await page.screenshot({ path: `${output}/10-combined-result-1440x900.png` });

  await page.getByRole('button', { name: 'Evidence' }).click();
  await expect(page.getByRole('dialog', { name: 'Category sidebar' })).toBeVisible();
  await page.getByRole('tab', { name: 'verification' }).click();
  await page.screenshot({ path: `${output}/11-result-evidence-1440x900.png` });
});

test('desktop density breakpoints remain dual canvas', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/?mode=showcase&view=compare');
    await expect(page.getByTitle('Version A live application')).toBeVisible();
    await expect(page.getByTitle('Version B live application')).toBeVisible();
    await page.screenshot({ path: `${output}/compare-${viewport.width}x${viewport.height}.png` });
  }
});

test('mobile version tabs and selection state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?mode=showcase&view=compare');
  await expect(page.getByRole('button', { name: 'Version A', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await enterSelection(page);
  await keepSidebar(page);
  await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Version B', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 selected');
  await page.screenshot({ path: `${output}/12-mobile-tabs-390x844.png` });
});
