import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { chromium, type FrameLocator, type Page } from '@playwright/test';
import { RepositoryController } from '../packages/repository-controller/src/repositoryController';
import { PreviewController, type PreviewSession } from '../packages/preview-runtime/src/previewController';
import type { SourceIdentity } from '../packages/shared/src/sourceIdentity';

type VisualAction = (frame: FrameLocator) => Promise<void>;

async function capture(page: Page, session: PreviewSession, action: VisualAction): Promise<SourceIdentity> {
  await page.setContent(`<iframe id="preview" title="${session.branch}" src="${session.url}" style="width:1280px;height:900px"></iframe><script>window.__umsMessages=[];addEventListener('message',event=>window.__umsMessages.push(event.data));</script>`);
  const frame = page.frameLocator('#preview');
  await frame.locator('body').waitFor();
  await action(frame);
  await page.evaluate(({ session }) => {
    const target = document.querySelector('#preview') as HTMLIFrameElement;
    target.contentWindow?.postMessage({ version: 2, preview: session, type: 'enable-selection' }, session.origin);
  }, { session });
  await page.waitForFunction(() => (window as unknown as { __umsMessages: { type: string }[] }).__umsMessages.some(item => item.type === 'selection-mode-enabled'));
  await action(frame);
  await page.waitForFunction(() => (window as unknown as { __umsMessages: { type: string }[] }).__umsMessages.some(item => item.type === 'boundary-selected'));
  return await page.evaluate(() => {
    const messages = (window as unknown as { __umsMessages: { type: string; payload?: { identity?: SourceIdentity } }[] }).__umsMessages;
    return [...messages].reverse().find((item: { type: string }) => item.type === 'boundary-selected')!.payload!.identity!;
  });
}

export async function captureShowcaseSelections(fixture: string, previewViteConfig: string) {
  const host = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><title>UI Merge Studio selection capture</title>'); });
  await new Promise<void>(accept => host.listen(0, '127.0.0.1', accept));
  const address = host.address();
  if (!address || typeof address === 'string') throw new Error('Could not allocate selection-capture host.');
  const priorOrigin = process.env.UI_MERGE_STUDIO_ORIGIN;
  process.env.UI_MERGE_STUDIO_ORIGIN = `http://127.0.0.1:${address.port}`;
  const previews = new PreviewController(new RepositoryController(fixture), resolve(previewViteConfig), '/catalogue');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(process.env.UI_MERGE_STUDIO_ORIGIN);
    const branchA = await previews.start('capture-a', 'branch-a');
    const categorySidebar = await capture(page, branchA, async frame => {
      await frame.getByText('Categories', { exact: true }).click();
    });
    await previews.stop('capture-a');

    const branchB = await previews.start('capture-b', 'branch-b');
    const quickView = await capture(page, branchB, async frame => {
      const dialog = frame.getByRole('dialog');
      if (!await dialog.isVisible().catch(() => false)) await frame.getByRole('button', { name: 'Quick view' }).first().click();
      await dialog.getByRole('heading').click();
    });
    await previews.stop('capture-b');

    const incompatible = await previews.start('capture-incompatible', 'branch-incompatible');
    const identityBadge = await capture(page, incompatible, async frame => {
      await frame.getByLabel(/Numeric product identity/).first().click();
    });
    return { categorySidebar, quickView, identityBadge };
  } finally {
    await previews.stopAll();
    await browser.close();
    await new Promise<void>(accept => host.close(() => accept()));
    if (priorOrigin === undefined) delete process.env.UI_MERGE_STUDIO_ORIGIN;
    else process.env.UI_MERGE_STUDIO_ORIGIN = priorOrigin;
  }
}
