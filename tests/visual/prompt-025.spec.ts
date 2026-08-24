import { mkdir, readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

const output = 'test-results/prompt-025-visual';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');

async function ready(page: Page) {
  await expect(page.locator('main.comparison-shell')).toHaveAttribute('data-context-ready-count', '2');
  await expect(page.getByTitle('Version A live application')).toBeVisible();
}

async function enterPick(page: Page) {
  await page.getByRole('button', { name: 'Pick parts' }).click();
  await expect(page.getByRole('button', { name: 'Return to Try mode' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Pick a part to keep')).toBeVisible();
}

async function moveAndClick(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Selection region has no visible geometry.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
  await page.waitForTimeout(180);
  await page.mouse.down();
  await page.waitForTimeout(70);
  await page.mouse.up();
}

async function captureJourney(page: Page, viewport: { width: number; height: number }) {
  const suffix = `${viewport.width}x${viewport.height}`;
  await page.setViewportSize(viewport);
  await page.route('**/catalogue?**', async route => {
    await new Promise(resolve => setTimeout(resolve, 520));
    await route.continue();
  });
  await page.goto('/?mode=showcase');
  await expect(page.getByRole('heading', { name: 'Build the version you actually want.' })).toBeVisible();
  await page.screenshot({ path: `${output}/01-landing-${suffix}.png` });

  await page.getByRole('button', { name: 'Try interactive demo' }).click();
  await expect(page.getByText('Loading preview…').first()).toBeVisible();
  await page.screenshot({ path: `${output}/02-preview-loading-${suffix}.png` });
  await ready(page);
  await expect(page.getByText('Loading preview…')).toHaveCount(0);
  await page.screenshot({ path: `${output}/03-compare-try-${suffix}.png` });

  await versionA(page).getByRole('button', { name: 'Desk' }).click();
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('desk');

  await enterPick(page);
  const sidebar = page.getByRole('button', { name: 'Keep Category sidebar from Version A' });
  await expect(sidebar).toBeVisible();
  const visibleRevealLabels = await page.locator('.ums-region-label').evaluateAll(labels => labels.filter(label => getComputedStyle(label).opacity !== '0').length);
  expect(visibleRevealLabels).toBe(0);
  await page.screenshot({ path: `${output}/04-pick-reveal-${suffix}.png` });

  await sidebar.hover();
  await expect.poll(() => page.locator('.ums-region-label').evaluateAll(labels => labels.filter(label => Number.parseFloat(getComputedStyle(label).opacity) > .5).length)).toBe(1);
  const sidebarLabel = sidebar.locator('.ums-region-label');
  await expect(sidebarLabel).toContainText('Category sidebar');
  const sidebarLabelBox = await sidebarLabel.boundingBox();
  const promotionBox = await versionA(page).locator('.promotional-banner').boundingBox();
  if (!sidebarLabelBox || !promotionBox) throw new Error('Expected visible sidebar label and promotion geometry.');
  const overlapsPromotion = sidebarLabelBox.x < promotionBox.x + promotionBox.width
    && sidebarLabelBox.x + sidebarLabelBox.width > promotionBox.x
    && sidebarLabelBox.y < promotionBox.y + promotionBox.height
    && sidebarLabelBox.y + sidebarLabelBox.height > promotionBox.y;
  expect(overlapsPromotion).toBe(false);
  await page.screenshot({ path: `${output}/05-sidebar-hover-${suffix}.png` });
  await sidebar.click();
  await expect(page.getByRole('button', { name: 'Remove Category sidebar' })).toBeVisible();
  await page.screenshot({ path: `${output}/06-sidebar-selected-${suffix}.png` });

  if (viewport.width < 960) await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await versionB(page).getByRole('heading', { name: 'Task Lamp' }).locator('xpath=ancestor::article').evaluate(element => element.scrollIntoView({ block: 'center' }));
  const quickView = page.getByRole('button', { name: 'Keep Quick View on Task Lamp from Version B' });
  await expect(quickView).toBeVisible();
  await quickView.hover();
  await expect.poll(() => page.locator('.ums-region-label').evaluateAll(labels => labels.filter(label => Number.parseFloat(getComputedStyle(label).opacity) > .5).length)).toBe(1);
  await page.screenshot({ path: `${output}/07-branch-b-hover-${suffix}.png` });
  await quickView.click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 picked');
  await page.waitForTimeout(820);
  if (viewport.width >= 1280) {
    const taskToken = page.getByRole('button', { name: 'Inspect Quick View · Task Lamp selection' });
    await expect(taskToken).toContainText('Quick View · Task Lamp');
    expect(await taskToken.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: `${output}/08-two-selections-${suffix}.png` });
  await page.screenshot({ path: `${output}/09-selection-island-${suffix}.png` });

  await page.getByRole('button', { name: 'Return to Try mode' }).click();
  await versionB(page).getByRole('button', { name: 'Quick view Task Lamp' }).click();
  await expect(versionB(page).getByRole('dialog', { name: 'Task Lamp quick view' })).toBeVisible();
  await page.screenshot({ path: `${output}/10-quick-view-try-${suffix}.png` });
  await versionB(page).getByRole('button', { name: 'Close quick view' }).click();

  await page.getByRole('button', { name: 'Combine 2 parts' }).click();
  await expect(page.getByRole('heading', { name: 'Combined result' })).toBeVisible();
  await expect(page.getByText('Verified', { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(320);
  await expect(page.frameLocator('iframe[title="Combined result application"]').getByText('2 products')).toBeVisible();
  await page.screenshot({ path: `${output}/11-combined-result-${suffix}.png` });

  await page.getByRole('button', { name: 'Evidence' }).click();
  await expect(page.getByRole('dialog', { name: 'Category sidebar' })).toBeVisible();
  await page.screenshot({ path: `${output}/12-evidence-sheet-${suffix}.png` });
  await page.getByRole('button', { name: 'Close technical evidence' }).click();

  await page.getByRole('button', { name: 'Compare again' }).click();
  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name: 'Experimental Product-ID change' }).click();
  await page.getByRole('button', { name: 'Review refusal' }).click();
  await expect(page.getByRole('dialog', { name: 'Cannot combine safely' })).toBeVisible();
  await page.screenshot({ path: `${output}/13-refusal-${suffix}.png` });
}

test.beforeAll(async () => {
  await mkdir(output, { recursive: true });
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 }
]) {
  test(`captures the defining interaction at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await captureJourney(page, viewport);
  });
}

test('records the real pointer-driven Try to Pick to verified Result journey', async ({ browser }) => {
  const warmup = await browser.newPage();
  await warmup.goto('/?mode=showcase&view=compare');
  await ready(warmup);
  await warmup.close();

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: 'test-results/prompt-025-playwright/video-temp', size: { width: 1440, height: 900 } }
  });
  const page = await context.newPage();
  const video = page.video();
  await page.route('**/catalogue?**', async route => {
    await new Promise(resolve => setTimeout(resolve, 520));
    await route.continue();
  });
  await page.goto('/?mode=showcase&view=compare');
  await ready(page);

  await versionA(page).getByRole('button', { name: 'Desk' }).click();
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('desk');
  await versionB(page).getByRole('button', { name: 'Quick view Task Lamp' }).click();
  await expect(versionB(page).getByRole('dialog', { name: 'Task Lamp quick view' })).toBeVisible();
  await versionB(page).getByRole('button', { name: 'Close quick view' }).click();

  const pick = page.getByRole('button', { name: 'Pick parts' });
  await moveAndClick(page, pick);
  const sidebar = page.getByRole('button', { name: 'Keep Category sidebar from Version A' });
  await expect(sidebar).toBeVisible();
  await page.waitForTimeout(780);
  await moveAndClick(page, sidebar);
  await expect(page.getByRole('button', { name: 'Remove Category sidebar' })).toBeVisible();

  await versionB(page).getByRole('heading', { name: 'Task Lamp' }).locator('xpath=ancestor::article').evaluate(element => element.scrollIntoView({ block: 'center' }));
  const quickView = page.getByRole('button', { name: 'Keep Quick View on Task Lamp from Version B' });
  await moveAndClick(page, quickView);
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 picked');
  await page.waitForTimeout(350);
  await moveAndClick(page, page.getByRole('button', { name: 'Combine 2 parts' }));
  await expect(page.getByRole('heading', { name: 'Combined result' })).toBeVisible();
  await expect(page.getByText('Verified', { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(900);

  await context.close();
  await video?.saveAs(`${output}/ui-merge-pick-flow.webm`);
});

test('extracts representative walkthrough frames for adversarial review', async ({ page }) => {
  const bytes = await readFile(`${output}/ui-merge-pick-flow.webm`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setContent(`<style>html,body{margin:0;background:#111}video{display:block;width:1440px;height:900px;object-fit:contain}</style><video src="data:video/webm;base64,${bytes.toString('base64')}"></video>`);
  const video = page.locator('video');
  await video.evaluate((element: HTMLVideoElement) => new Promise<void>(resolve => {
    if (Number.isFinite(element.duration) && element.duration > 0) resolve();
    else element.addEventListener('loadedmetadata', () => resolve(), { once: true });
  }));
  const duration = await video.evaluate((element: HTMLVideoElement) => element.duration);
  for (const [index, ratio] of [.04, .08, .12, .16, .2, .45, .7, .94].entries()) {
    await video.evaluate((element: HTMLVideoElement, time: number) => new Promise<void>(resolve => {
      element.addEventListener('seeked', () => resolve(), { once: true });
      element.currentTime = time;
    }), Math.max(0, duration * ratio));
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${output}/video-review-${index + 1}.png` });
  }
});
