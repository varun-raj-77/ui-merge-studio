import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { chromium, type FrameLocator, type Page } from '@playwright/test';
import { LocalPlanAuthority, localRepositoryId } from '../apps/studio/localPlanAuthority';
import { RepositoryController } from '../packages/repository-controller/src/repositoryController';
import { PreviewController, type PreviewSession } from '../packages/preview-runtime/src/previewController';
import type { InstrumentedBoundaryMapping } from '../packages/source-instrumentation/src/instrumentReactSource';
import { isPreviewIdentity } from '../packages/shared/src/bridge';

type VisualAction = (frame: FrameLocator) => Promise<void>;

async function capture(page: Page, session: PreviewSession, action: VisualAction): Promise<string> {
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
    const messages = (window as unknown as { __umsMessages: { type: string; payload?: { selectionReceipt?: string } }[] }).__umsMessages;
    return [...messages].reverse().find((item: { type: string }) => item.type === 'boundary-selected')!.payload!.selectionReceipt!;
  });
}

export async function captureShowcaseSelections(fixture: string, previewViteConfig: string) {
  let previews: PreviewController;
  let authority: LocalPlanAuthority;
  const host = createServer(async (request, response) => {
    try {
      const instrumentationPreviewId = request.url?.match(/^\/api\/internal\/previews\/([a-z][a-z0-9-]*)\/instrumentation$/)?.[1];
      if (instrumentationPreviewId && request.method === 'POST') {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as { preview?: unknown; boundaries?: unknown };
        const token = request.headers.authorization?.match(/^Bearer ([A-Za-z0-9-]+)$/)?.[1] ?? '';
        if (!isPreviewIdentity(value.preview) || !Array.isArray(value.boundaries)) {
          response.writeHead(400); response.end('Invalid instrumentation metadata.'); return;
        }
        const authenticated = previews.authenticateInstrumentation(instrumentationPreviewId, token, value.preview);
        if (!authenticated) { response.writeHead(403); response.end('Instrumentation authentication failed.'); return; }
        authority.registerInstrumentedBoundaries(authenticated, value.boundaries as InstrumentedBoundaryMapping[]);
        response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ registered: value.boundaries.length })); return;
      }
      response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><title>UI Merge Studio selection capture</title>');
    } catch (error) {
      response.writeHead(500); response.end(error instanceof Error ? error.message : String(error));
    }
  });
  await new Promise<void>(accept => host.listen(0, '127.0.0.1', accept));
  const address = host.address();
  if (!address || typeof address === 'string') throw new Error('Could not allocate selection-capture host.');
  const priorOrigin = process.env.UI_MERGE_STUDIO_ORIGIN;
  process.env.UI_MERGE_STUDIO_ORIGIN = `http://127.0.0.1:${address.port}`;
  previews = new PreviewController(new RepositoryController(fixture), resolve(previewViteConfig), '/catalogue');
  authority = new LocalPlanAuthority(fixture, localRepositoryId(fixture), 'main', 'showcase-capture-result', id => previews.session(id), () => previews.sessions());
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(process.env.UI_MERGE_STUDIO_ORIGIN);
    const branchA = await previews.start('capture-a', 'branch-a');
    const categoryReceipt = await capture(page, branchA, async frame => {
      await frame.getByText('Categories', { exact: true }).click();
    });
    const categorySidebar = authority.resolveRenderedSelection(branchA, categoryReceipt);
    await previews.stop('capture-a');

    const branchB = await previews.start('capture-b', 'branch-b');
    const quickViewReceipt = await capture(page, branchB, async frame => {
      await frame.locator('[data-ums-scope^="product-quick-view:"]').first().evaluate(element => (element as HTMLElement).click());
    });
    const quickView = authority.resolveRenderedSelection(branchB, quickViewReceipt);
    await previews.stop('capture-b');

    const incompatible = await previews.start('capture-incompatible', 'branch-incompatible');
    const identityReceipt = await capture(page, incompatible, async frame => {
      await frame.getByLabel(/Numeric product identity/).first().click();
    });
    const identityBadge = authority.resolveRenderedSelection(incompatible, identityReceipt);
    return { categorySidebar, quickView, identityBadge };
  } finally {
    await previews.stopAll();
    await browser.close();
    await new Promise<void>(accept => host.close(() => accept()));
    if (priorOrigin === undefined) delete process.env.UI_MERGE_STUDIO_ORIGIN;
    else process.env.UI_MERGE_STUDIO_ORIGIN = priorOrigin;
  }
}
