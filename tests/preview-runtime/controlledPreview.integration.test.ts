// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { PreviewController, isProcessAlive } from '../../packages/preview-runtime/src/previewController';
import { RepositoryController } from '../../packages/repository-controller/src/repositoryController';

const controllers: PreviewController[] = [];

function worktreePaths(root: string) {
  return execFileSync('git', ['-C', root, 'worktree', 'list', '--porcelain'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(line => line.startsWith('worktree '))
    .map(line => resolve(line.slice('worktree '.length)));
}

async function eventually(check: () => boolean | Promise<boolean>, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  expect(await check()).toBe(true);
}

afterEach(async () => {
  for (const controller of controllers.splice(0)) await controller.stopAll();
});

describe('controlled Phase 0 preview regression', () => {
  test('loads the Studio instrumentation config from a spaced workspace path and cleans the real npm/Vite tree', async () => {
    const workspaceRoot = resolve(import.meta.dirname, '../..');
    expect(workspaceRoot).toContain('UI merge studio');
    const repositoryPath = resolve(workspaceRoot, 'fixtures/generated/product-catalogue');
    const baselineWorktrees = worktreePaths(repositoryPath);
    const registrations: unknown[] = [];
    const instrumentationServer = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      if (request.method === 'POST') registrations.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end('{"registered":true}');
    });
    await new Promise<void>(accept => instrumentationServer.listen(0, '127.0.0.1', accept));
    const address = instrumentationServer.address();
    if (!address || typeof address === 'string') throw new Error('Instrumentation test server did not allocate a port.');
    const previousOrigin = process.env.UI_MERGE_STUDIO_ORIGIN;
    process.env.UI_MERGE_STUDIO_ORIGIN = `http://127.0.0.1:${address.port}`;

    const controller = new PreviewController(
      new RepositoryController(repositoryPath),
      resolve(workspaceRoot, 'apps/studio/preview.vite.config.ts'),
      '/catalogue'
    );
    controllers.push(controller);
    let processId = 0;
    let worktreePath = '';
    let previewUrl = '';
    try {
      const session = await controller.start('controlled', 'main', { startupTimeoutMs: 60_000 });
      processId = session.processId;
      worktreePath = session.worktreePath;
      previewUrl = session.url;
      const html = await fetch(session.url).then(response => response.text());
      await fetch(`${session.origin}/src/main.tsx`).then(response => response.text());
      const transformedApp = await fetch(`${session.origin}/src/app/App.tsx`).then(response => response.text());
      expect(session).toMatchObject({ status: 'running', packageManager: 'npm', branch: 'main' });
      expect(html).toContain('/@ui-merge-studio/selection-runtime');
      expect(transformedApp).toContain('data-ums-boundary');
      expect(registrations.length).toBeGreaterThan(0);
      expect(existsSync(worktreePath)).toBe(true);
      expect(worktreePaths(repositoryPath)).toContain(resolve(worktreePath));

      await controller.stop('controlled');
      await eventually(() => !isProcessAlive(processId));
      await eventually(async () => {
        try { await fetch(previewUrl, { signal: AbortSignal.timeout(300) }); return false; }
        catch { return true; }
      });
      expect(existsSync(worktreePath)).toBe(false);
      expect(worktreePaths(repositoryPath)).toEqual(baselineWorktrees);
    } finally {
      await controller.stopAll();
      controllers.splice(controllers.indexOf(controller), 1);
      if (previousOrigin === undefined) delete process.env.UI_MERGE_STUDIO_ORIGIN;
      else process.env.UI_MERGE_STUDIO_ORIGIN = previousOrigin;
      await new Promise<void>((accept, reject) => instrumentationServer.close(error => error ? reject(error) : accept()));
    }
  }, 90_000);
});
