import { expect, test, type FrameLocator, type Locator, type Page } from '@playwright/test';

const showcaseUrl = '/?mode=showcase';
const compiledPreview = (page: Page) => page.locator('iframe[title*="compiled Support Desk application"]');
const activeApp = (page: Page) => page.frameLocator('iframe[title*="compiled Support Desk application"]');

function capturePageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  return () => expect(errors, 'the Showcase must not raise uncaught browser errors').toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))).toEqual(expect.objectContaining({
    clientWidth: page.viewportSize()!.width,
    scrollWidth: page.viewportSize()!.width
  }));
}

async function expectWithinViewportWidth(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  expect(box, 'control should have a measurable layout box').not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
}

async function expectBehaviorTargetContains(page: Page, target: 'navigation' | 'activity', control: Locator) {
  const targetBox = await page.locator(`[data-behavior-target="${target}"]`).boundingBox();
  const controlBox = await control.boundingBox();
  expect(targetBox, `${target} callout target should have a layout box`).not.toBeNull();
  expect(controlBox, `${target} control should have a layout box`).not.toBeNull();
  expect(controlBox!.x).toBeGreaterThanOrEqual(targetBox!.x - 4);
  expect(controlBox!.y).toBeGreaterThanOrEqual(targetBox!.y - 4);
  expect(controlBox!.x + controlBox!.width).toBeLessThanOrEqual(targetBox!.x + targetBox!.width + 4);
  expect(controlBox!.y + controlBox!.height).toBeLessThanOrEqual(targetBox!.y + targetBox!.height + 4);
}

async function expectOneContainedArtifact(page: Page, label: RegExp) {
  const preview = compiledPreview(page);
  await expect(preview).toHaveCount(1);
  await expect(preview).toHaveAttribute('title', label);
  await expect(preview).toHaveAttribute(
    'data-artifact-path',
    /\/showcase-runs\/[a-f0-9]+\/(?:baseline|branch-a|branch-b|combined-result)\/index\.html/
  );
  await expect.poll(() => page.frames().filter(frame => frame.parentFrame()).length).toBe(1);
  await expect.poll(() => page.frames().find(frame => frame.parentFrame())?.url() ?? '').toMatch(/\/tickets\?/);
  await expect.poll(() => {
    const url = page.frames().find(frame => frame.parentFrame())?.url();
    return url ? new URL(url).searchParams.get('ums-artifact') : null;
  }).toMatch(/\/showcase-runs\/[a-f0-9]+\/(?:baseline|branch-a|branch-b|combined-result)\/index\.html/);
  expect(page.frames().filter(frame => frame.parentFrame()).every(frame => new URL(frame.url()).pathname === '/tickets')).toBe(true);
  expect(new URL(page.url()).pathname).not.toBe('/tickets');
}

async function openLab(page: Page) {
  await page.getByRole('button', { name: 'Open the Merge Lab', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Build your preferred interface.' })).toBeVisible();
  await expectOneContainedArtifact(page, /Branch A compiled Support Desk application/i);
}

async function selectFocusMode(page: Page) {
  await page.getByRole('button', { name: 'Select Focus Mode', exact: true }).click();
  await expect(page.getByRole('button', { name: /selected from version a/i })).toHaveAttribute('aria-pressed', 'true');
}

async function selectActivityLens(page: Page) {
  await page.getByRole('tab', { name: /version b/i }).click();
  await expectOneContainedArtifact(page, /Branch B compiled Support Desk application/i);
  await page.getByRole('button', { name: 'Select Activity Lens', exact: true }).click();
  await expect(page.getByRole('button', { name: /selected from version b/i })).toHaveAttribute('aria-pressed', 'true');
}

async function selectBoth(page: Page) {
  await selectFocusMode(page);
  await selectActivityLens(page);
  await expect(page.getByText('2 / 2', { exact: true })).toBeVisible();
}

async function buildCombinedResult(page: Page) {
  await selectBoth(page);
  const build = page.getByRole('button', { name: 'Build combined result', exact: true });
  await expect(build).toBeEnabled();
  await build.click();
  await expect(page.getByRole('heading', { name: 'Selected source in. Unrelated edits out.' })).toBeVisible();
  await expectOneContainedArtifact(page, /Combined result compiled Support Desk application/i);
}

async function tabTo(page: Page, locator: Locator, limit = 24) {
  for (let index = 0; index < limit; index += 1) {
    if (await locator.evaluate(element => document.activeElement === element)) return;
    await page.keyboard.press('Tab');
  }
  await expect(locator, `expected to reach control through at most ${limit} Tab presses`).toBeFocused();
}

async function selectTicket(frame: FrameLocator) {
  await frame.getByRole('button', { name: /TCK-102/ }).click();
  await expect(frame.getByRole('heading', { name: 'Payment gateway timeout' })).toBeVisible();
}

test.describe('premium public Showcase', () => {
  test.describe.configure({ timeout: 60_000 });

  test('explains the product in the first viewport without mounting an app iframe', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const assertNoErrors = capturePageErrors(page);
    await page.goto(showcaseUrl);

    const headline = page.getByRole('heading', { name: 'Take the best UI from every branch. Ship one verified result.' });
    await expect(headline).toBeVisible();
    await expect(headline).toBeInViewport();
    await expect(page.getByText('Run multiple React implementations, click the features you prefer, and generate one tested combined branch.')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Open the Merge Lab', exact: true })).toBeInViewport();
    await expect(page.getByRole('link', { name: 'View GitHub', exact: true })).toHaveAttribute('target', '_blank');
    await expect(page.getByText('Local React repositories')).toBeInViewport();
    await expect(page.getByText('Hosted demo: interactive replay of a real verified local run.')).toBeInViewport();
    await expect(page.getByLabel(/version a and version b converge into one verified combined result/i)).toBeVisible();
    await expect(compiledPreview(page)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    assertNoErrors();
  });

  test('keeps one readable app active while parent controls select and preserve both features', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const assertNoErrors = capturePageErrors(page);
    const childNavigations: string[] = [];
    page.on('framenavigated', frame => {
      if (frame.parentFrame() && frame.url() !== 'about:blank') childNavigations.push(frame.url());
    });

    await page.goto(showcaseUrl);
    await openLab(page);
    await expect(activeApp(page).getByLabel('Sample Support Desk')).toBeVisible();
    await expect(page.getByText('Visible behavior')).toBeVisible();
    await expect(page.locator('.behavior-callout')).toContainText('Collapsible navigation');
    await expect(page.getByText('Mapped React boundary: AppSidebar')).toBeVisible();
    await expectWithinViewportWidth(page, page.getByRole('button', { name: 'Select Focus Mode', exact: true }));
    expect((await compiledPreview(page).boundingBox())!.width).toBeGreaterThanOrEqual(700);
    const branchNavigation = activeApp(page).getByRole('navigation', { name: 'Primary' });
    const collapse = activeApp(page).getByRole('button', { name: 'Collapse sidebar', exact: true });
    await expectBehaviorTargetContains(page, 'navigation', collapse);
    await expectBehaviorTargetContains(page, 'navigation', branchNavigation.getByText('Tickets', { exact: true }));
    await collapse.click();
    await expect(activeApp(page).getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
    await activeApp(page).getByRole('button', { name: 'Expand sidebar', exact: true }).click();

    // Selection is completed through the authoritative parent control; no iframe click is needed.
    await selectFocusMode(page);
    const focusEvidence = page.getByLabel('Focus Mode source evidence');
    await expect(focusEvidence).toContainText('AppSidebar');
    await expect(focusEvidence).toContainText('5 required supporting files');
    await focusEvidence.getByText('View exact source evidence').click();
    await expect(focusEvidence).toContainText('src/features/navigation/AppSidebar.tsx');
    await expect(focusEvidence).toContainText('src/hooks/useSidebarState.ts');

    await page.getByRole('tab', { name: /version b/i }).click();
    await expectOneContainedArtifact(page, /Branch B compiled Support Desk application/i);
    await expect(activeApp(page).getByText('Sample Support Desk', { exact: true })).toBeVisible();
    await expect(page.locator('.behavior-callout')).toContainText('Activity filters');
    await expect(page.getByText('Mapped React boundary: ActivityFilters')).toBeVisible();
    const branchFilters = activeApp(page).getByLabel('Activity filters');
    await expectBehaviorTargetContains(page, 'activity', branchFilters);
    await branchFilters.getByRole('button', { name: 'note', exact: true }).click();
    await expect(branchFilters.getByRole('button', { name: 'note', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(activeApp(page).getByText('Escalated to platform operations.')).toBeVisible();
    await expect(activeApp(page).getByText('Customer reported intermittent timeouts.')).toBeHidden();
    await page.getByRole('button', { name: 'Select Activity Lens', exact: true }).click();
    const activityEvidence = page.getByLabel('Activity Lens source evidence');
    await expect(activityEvidence).toContainText('ActivityFilters');
    await expect(activityEvidence).toContainText('9 required supporting files');
    await activityEvidence.getByText('View exact source evidence').click();
    await expect(activityEvidence).toContainText('src/features/tickets/ActivityFilters.tsx');
    await expect(activityEvidence).toContainText('src/hooks/useActivityFilter.ts');
    await expect(page.getByText('2 / 2', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: /version a/i }).click();
    await expectOneContainedArtifact(page, /Branch A compiled Support Desk application/i);
    await expect(page.getByRole('button', { name: /selected from version a/i })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('tab', { name: /baseline/i }).click();
    await expectOneContainedArtifact(page, /Baseline compiled Support Desk application/i);
    await expect(page.getByRole('heading', { name: 'Same ticket. Same starting point.' })).toBeVisible();

    await expectNoHorizontalOverflow(page);
    expect(childNavigations.length, 'version switching must not start an iframe navigation loop').toBeLessThanOrEqual(8);
    assertNoErrors();
  });

  test('builds the recorded result, proves inclusions and exclusions, and leaves the combined app interactive', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const assertNoErrors = capturePageErrors(page);
    const childNavigations: string[] = [];
    page.on('framenavigated', frame => {
      if (frame.parentFrame() && frame.url() !== 'about:blank') childNavigations.push(frame.url());
    });

    await page.goto(showcaseUrl);
    await openLab(page);
    await buildCombinedResult(page);

    const integration = page.locator('.integration-proof');
    await expect(integration).toContainText('Shared base confirmed');
    await expect(integration).toContainText('Selected source mapped');
    await expect(integration).toContainText('Required source set recorded');
    await expect(integration).toContainText('Unrelated changes excluded');
    await expect(integration).toContainText('Verified candidate created');
    await expect(integration).toContainText('src/features/navigation/AppSidebar.tsx');
    await expect(integration).toContainText('src/features/tickets/ActivityFilters.tsx');
    await expect(integration).toContainText('Operations Command Center heading');
    await expect(integration).toContainText('Newest-first sorting change');
    await expect(integration).toContainText('sortTickets.ts');
    const resultProof = page.getByLabel('Combined result composition');
    await expect(resultProof).toContainText('Collapsible navigation');
    await expect(resultProof).toContainText('Version A');
    await expect(resultProof).toContainText('Activity filters');
    await expect(resultProof).toContainText('Version B');
    await expect(resultProof).toContainText('Operations Command Center heading');
    await expect(resultProof).toContainText('Newest-first sorting change');

    const combined = activeApp(page);
    await expect(combined.getByLabel('Sample Support Desk')).toBeVisible();
    await selectTicket(combined);
    await combined.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    await expect(combined.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();

    const filters = combined.getByLabel('Activity filters');
    await expect(filters).toBeVisible();
    await filters.getByRole('button', { name: 'note', exact: true }).click();
    await expect(filters.getByRole('button', { name: 'note', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(combined.getByText('Escalated to platform operations.')).toBeVisible();
    await expect(combined.getByText('Customer reported intermittent timeouts.')).toBeHidden();
    await filters.getByRole('button', { name: 'email', exact: true }).click();
    await expect(combined.getByText('Customer reported intermittent timeouts.')).toBeVisible();
    await expect(combined.getByText('Escalated to platform operations.')).toBeHidden();
    await compiledPreview(page).evaluate(frame => (frame as HTMLIFrameElement).contentWindow?.location.reload());
    await expect(combined.getByLabel('Sample Support Desk')).toBeVisible();
    expect(page.frames().filter(frame => frame.parentFrame()).every(frame => new URL(frame.url()).pathname === '/tickets')).toBe(true);

    const verification = page.locator('.verification-panel');
    await expect(verification.getByRole('heading', { name: 'Verified combined result' })).toBeVisible();
    await expect(verification.locator('.verification-summary strong')).toHaveText([
      'TypeScript',
      'Full test suite',
      'Feature tests',
      'Production build'
    ]);
    await expect(verification.getByText('Passed', { exact: true })).toHaveCount(4);
    await expect(verification).not.toContainText(/accessibility|runtime check|visual diff|pull request/i);
    await verification.getByRole('button', { name: 'View full verification evidence', exact: true }).click();
    await verification.getByText('typecheck', { exact: true }).click();
    await expect(verification).toContainText('npm run typecheck');

    const handoff = page.locator('.handoff');
    await expect(handoff.getByRole('heading', { name: 'Ready for the developer.' })).toBeVisible();
    await expect(handoff).toContainText('combined-result');
    await expect(handoff).toContainText('Focus Mode · Activity Lens · dependencies · tests');
    await expect(handoff).toContainText('Heading experiment · newest-first sorting');
    for (const name of ['Open combined app', 'View integration report', 'Explore architecture']) {
      const link = handoff.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }

    await expect(compiledPreview(page)).toHaveCount(1);
    expect(childNavigations.length, 'the combined app must not repeatedly reload').toBeLessThanOrEqual(7);
    assertNoErrors();
  });

  test('uses the exact narrower route-synchronization refusal and never claims candidate generation ran', async ({ page }) => {
    const assertNoErrors = capturePageErrors(page);
    await page.goto(showcaseUrl);
    await openLab(page);
    await buildCombinedResult(page);

    await page.getByRole('button', { name: 'Try an unsafe combination', exact: true }).click();
    await expect(page.getByText('These versions represent the selected ticket in different URL formats.')).toBeVisible();
    await expect(page.getByText('ticket-query-v1', { exact: true })).toBeHidden();
    await expect(page.getByText('ticket-path-v1', { exact: true })).toBeHidden();
    await page.getByRole('button', { name: 'Check compatibility', exact: true }).click();

    const refusal = page.getByRole('alert');
    await expect(refusal).toContainText('Preview synchronization refused');
    await expect(refusal).toContainText('No candidate was attempted or created.');
    await expect(refusal).toContainText('These versions store the selected ticket in incompatible URL formats.');
    await expect(refusal).not.toContainText(/ticket-query-v1|ticket-path-v1/);
    await expect(refusal).toContainText('Align the route contract manually, then rerun compatibility analysis.');
    await expect(refusal).not.toContainText(/candidate generation failed|merge conflict|something went wrong/i);
    await page.getByText('Technical details', { exact: true }).click();
    await expect(page.getByText('ticket-query-v1', { exact: true })).toBeVisible();
    await expect(page.getByText('ticket-path-v1', { exact: true })).toBeVisible();
    await expect(page.locator('.contract-details')).toContainText('Route synchronization unavailable: contracts differ (ticket-query-v1 vs ticket-path-v1).');
    await expect(page.locator('.contract-details')).toContainText(/multi-preview\.spec\.ts.*branch-incompatible-route/);
    await expect(compiledPreview(page)).toHaveCount(1);
    assertNoErrors();
  });

  test('restores selection state through history and refresh, then restart resets it', async ({ page }) => {
    const assertNoErrors = capturePageErrors(page);
    await page.goto(showcaseUrl);
    await openLab(page);
    await selectFocusMode(page);
    await page.getByRole('tab', { name: /version b/i }).click();
    await page.getByRole('button', { name: 'Select Activity Lens', exact: true }).click();
    await expect(page.getByText('2 / 2', { exact: true })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('tab', { name: /version b/i })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Select Activity Lens', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('1 / 2', { exact: true })).toBeVisible();

    await page.goForward();
    await expect(page.getByRole('button', { name: /selected from version b/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('2 / 2', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('tab', { name: /version b/i })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: /selected from version b/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Build combined result', exact: true })).toBeEnabled();
    await expectOneContainedArtifact(page, /Branch B compiled Support Desk application/i);

    await page.getByRole('button', { name: 'Restart lab', exact: true }).click();
    await expect(page.getByRole('tab', { name: /version a/i })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Select Focus Mode', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('0 / 2', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Build combined result', exact: true })).toBeDisabled();
    assertNoErrors();
  });

  test('keeps Landing and Lab synchronized across browser history and explicit exit', async ({ page }) => {
    const assertNoErrors = capturePageErrors(page);
    await page.goto(showcaseUrl);
    await openLab(page);

    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Take the best UI from every branch. Ship one verified result.' })).toBeVisible();
    await expect(compiledPreview(page)).toHaveCount(0);
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Build your preferred interface.' })).toBeVisible();
    await expectOneContainedArtifact(page, /Branch A compiled Support Desk application/i);

    await selectFocusMode(page);
    await page.getByRole('button', { name: 'UM UI Merge Studio', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Take the best UI from every branch. Ship one verified result.' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('button', { name: /selected from version a/i })).toHaveAttribute('aria-pressed', 'true');
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Take the best UI from every branch. Ship one verified result.' })).toBeVisible();
    assertNoErrors();
  });

  test('supports keyboard-only completion with reduced motion and no iframe focus trap', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const assertNoErrors = capturePageErrors(page);
    await page.goto(showcaseUrl);
    await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);

    const open = page.getByRole('button', { name: 'Open the Merge Lab', exact: true });
    await tabTo(page, open);
    await page.keyboard.press('Enter');

    const focusSelection = page.getByRole('button', { name: 'Select Focus Mode', exact: true });
    await tabTo(page, focusSelection);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('tab', { name: /version a/i })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /version b/i })).toBeFocused();
    await expect(page.getByRole('tab', { name: /version b/i })).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Tab');
    const activitySelection = page.getByRole('button', { name: 'Select Activity Lens', exact: true });
    await expect(activitySelection).toBeFocused();
    await page.keyboard.press('Enter');
    const build = page.getByRole('button', { name: 'Build combined result', exact: true });
    await tabTo(page, build);
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { name: 'One app. Both selected features.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ready for the developer.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Selected source in. Unrelated edits out.' })).toBeFocused();
    await expect(compiledPreview(page)).toHaveCount(1);
    assertNoErrors();
  });

  test('completes the primary mobile journey at 390 × 844 without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const assertNoErrors = capturePageErrors(page);
    await page.goto(showcaseUrl);
    await expectNoHorizontalOverflow(page);
    await expectWithinViewportWidth(page, page.getByRole('button', { name: 'Open the Merge Lab', exact: true }));

    await openLab(page);
    await expectNoHorizontalOverflow(page);
    await expectWithinViewportWidth(page, page.getByRole('button', { name: 'Select Focus Mode', exact: true }));
    await buildCombinedResult(page);
    await expectNoHorizontalOverflow(page);
    await expectWithinViewportWidth(page, page.getByRole('button', { name: 'View full verification evidence', exact: true }));
    await expectWithinViewportWidth(page, page.getByRole('link', { name: 'Open combined app', exact: true }));

    await page.getByRole('button', { name: 'Try an unsafe combination', exact: true }).click();
    await page.getByRole('button', { name: 'Check compatibility', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Preview synchronization refused');
    await expectNoHorizontalOverflow(page);
    assertNoErrors();
  });
});
