// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { PreviewController, isProcessAlive } from '../../packages/preview-runtime/src/previewController';
import { stopProcessTree } from '../../packages/preview-runtime/src/processRuntime';
import { RepositoryController } from '../../packages/repository-controller/src/repositoryController';
import { discoverRepository } from '../../packages/repository-controller/src/repositoryDiscovery';

const roots: string[] = [];

function slash(path: string) { return path.replaceAll('\\', '/'); }
function write(root: string, path: string, contents: string) {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function temporaryViteRepository(devScript = 'node vite-launch.mjs') {
  const root = mkdtempSync(resolve(tmpdir(), 'ums-external-preview-'));
  roots.push(root);
  const workspaceRoot = resolve(import.meta.dirname, '../..');
  const viteCli = resolve(workspaceRoot, 'node_modules/vite/bin/vite.js');
  const react = resolve(workspaceRoot, 'node_modules/react/index.js');
  const reactDomClient = resolve(workspaceRoot, 'node_modules/react-dom/client.js');
  const packageJson = {
    name: 'temporary-external-react-vite',
    private: true,
    type: 'module',
    packageManager: 'npm@10.0.0',
    scripts: { dev: devScript },
    dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
    devDependencies: { typescript: '^5.8.0', vite: '^6.0.0' }
  };
  write(root, 'package.json', JSON.stringify(packageJson, null, 2));
  write(root, 'vite-launch.mjs', `await import(${JSON.stringify(new URL(`file:///${slash(viteCli)}`).href)});\n`);
  write(root, 'index.html', '<main id="root"></main><script type="module" src="/src/main.tsx"></script>');
  write(root, 'tsconfig.json', JSON.stringify({ compilerOptions: { jsx: 'react-jsx' }, include: ['src'] }));
  write(root, 'vite.config.ts', `
export default {
  resolve: { alias: { react: ${JSON.stringify(slash(react))}, 'react-dom/client': ${JSON.stringify(slash(reactDomClient))} } },
  plugins: [{
    name: 'report-vite-pid',
    configureServer(server) {
      server.middlewares.use('/__vite_pid', (_request, response) => response.end(String(process.pid)));
    }
  }]
};`);
  write(root, 'src/main.tsx', "import React from 'react'; import { createRoot } from 'react-dom/client'; function Feature(){return <h1>External preview healthy</h1>} function Layout(){return <main><Feature/></main>} createRoot(document.getElementById('root')!).render(<Layout/>);\n");
  write(root, 'node_modules/.keep', 'The integration test supplies the workspace Vite executable.');
  execFileSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' });
  execFileSync('git', ['-C', root, 'add', '-f', '.'], { stdio: 'ignore' });
  execFileSync('git', ['-C', root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'tiny React Vite app'], { stdio: 'ignore' });
  return root;
}

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

async function portIsClosed(url: string) {
  try { await fetch(url, { signal: AbortSignal.timeout(300) }); return false; }
  catch { return true; }
}

class RetryRemovalRepositoryController extends RepositoryController {
  failNextRemovalPath: string | null = null;
  override async createWorktree(ref: string) {
    const path = await super.createWorktree(ref);
    const workspaceVite = resolve(import.meta.dirname, '../../node_modules/vite');
    symlinkSync(workspaceVite, resolve(path, 'node_modules/vite'), process.platform === 'win32' ? 'junction' : 'dir');
    return path;
  }
  override async removeWorktree(path: string) {
    if (this.failNextRemovalPath === path) {
      this.failNextRemovalPath = null;
      throw new Error('injected worktree removal failure');
    }
    await super.removeWorktree(path);
  }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

describe('external React TypeScript Vite preview lifecycle', () => {
  test('tracks real Vite descendants and retains cleanup ownership until process and worktree cleanup succeed', async () => {
    const root = temporaryViteRepository();
    const baselineWorktrees = worktreePaths(root);
    const discovery = await discoverRepository(root);
    expect(discovery.framework.kind).toBe('react-typescript-vite');
    expect(discovery.packageManager.name).toBe('npm');

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

    const repository = new RetryRemovalRepositoryController(root);
    let failProcessCleanupFor = 0;
    const controller = new PreviewController(repository, resolve(root, 'unused-controlled-fixture-config.ts'), '/', {
      stopProcessTree: async handle => {
        if (handle.pid === failProcessCleanupFor) {
          failProcessCleanupFor = 0;
          throw new Error('injected process-tree cleanup failure');
        }
        await stopProcessTree(handle);
      }
    });
    const startingStatuses = new Set<string>();
    const descendantPids = new Set<number>();
    try {
      const [left, right] = await Promise.all([
        controller.start('left', 'main', { startupTimeoutMs: 10_000, onPhase: event => {
          if (event.phase === 'starting-runtime' && event.completedAt && controller.session('left')?.status === 'starting') startingStatuses.add('left');
        } }),
        controller.start('right', 'main', { startupTimeoutMs: 10_000, onPhase: event => {
          if (event.phase === 'starting-runtime' && event.completedAt && controller.session('right')?.status === 'starting') startingStatuses.add('right');
        } })
      ]);
      const leftVitePid = Number(await fetch(`${left.origin}/__vite_pid`).then(response => response.text()));
      const rightVitePid = Number(await fetch(`${right.origin}/__vite_pid`).then(response => response.text()));
      descendantPids.add(leftVitePid);
      descendantPids.add(rightVitePid);

      expect(left).toMatchObject({ repositoryPath: root, branch: 'main', commit: left.branchCommit, packageManager: 'npm', status: 'running' });
      expect(right).toMatchObject({ repositoryPath: root, branch: 'main', commit: right.branchCommit, packageManager: 'npm', status: 'running' });
      expect(left.port).not.toBe(right.port);
      expect(left.processId).not.toBe(right.processId);
      expect(left.worktreePath).not.toBe(right.worktreePath);
      expect(leftVitePid).not.toBe(left.processId);
      expect(rightVitePid).not.toBe(right.processId);
      expect(startingStatuses).toEqual(new Set(['left', 'right']));
      expect(worktreePaths(root)).toEqual(expect.arrayContaining([resolve(left.worktreePath), resolve(right.worktreePath)]));
      expect(existsSync(left.worktreePath)).toBe(true);
      expect(controller.isAlive('left')).toBe(true);
      expect(controller.isAlive('right')).toBe(true);
      const html = await fetch(left.url).then(response => response.text());
      const transformedSource = await fetch(`${left.origin}/src/main.tsx`).then(response => response.text());
      expect(html).toContain('/@ui-merge-studio/selection-runtime');
      expect(transformedSource).toContain('External preview healthy');
      expect(transformedSource).toContain('data-ums-boundary');
      expect(registrations.length).toBeGreaterThan(0);

      failProcessCleanupFor = left.processId;
      await expect(controller.stop('left')).rejects.toThrow('injected process-tree cleanup failure');
      expect(controller.session('left')).toMatchObject({ status: 'failed' });
      expect(isProcessAlive(leftVitePid)).toBe(true);
      expect(existsSync(left.worktreePath)).toBe(true);
      expect(worktreePaths(root)).toContain(resolve(left.worktreePath));
      await expect(fetch(left.url)).resolves.toMatchObject({ ok: true });

      repository.failNextRemovalPath = left.worktreePath;
      await expect(controller.stop('left')).rejects.toThrow('injected worktree removal failure');
      await eventually(() => !isProcessAlive(left.processId) && !isProcessAlive(leftVitePid));
      await eventually(() => portIsClosed(left.url));
      expect(existsSync(left.worktreePath)).toBe(true);
      expect(worktreePaths(root)).toContain(resolve(left.worktreePath));
      expect(controller.session('left')).toMatchObject({ status: 'failed' });

      await controller.stop('left');
      await controller.stop('left');
      expect(existsSync(left.worktreePath)).toBe(false);
      expect(worktreePaths(root)).not.toContain(resolve(left.worktreePath));
      expect(controller.session('left')).toMatchObject({ status: 'stopped', failure: null });
      expect(controller.isAlive('right')).toBe(true);

      await controller.stop('right');
      await eventually(() => !isProcessAlive(right.processId) && !isProcessAlive(rightVitePid));
      await eventually(() => portIsClosed(right.url));
      expect(existsSync(right.worktreePath)).toBe(false);

      const firstAgain = await controller.start('left', 'main', { startupTimeoutMs: 10_000 });
      const firstAgainVitePid = Number(await fetch(`${firstAgain.origin}/__vite_pid`).then(response => response.text()));
      descendantPids.add(firstAgainVitePid);
      const stopping = controller.stop('left');
      const restarting = controller.start('left', 'main', { startupTimeoutMs: 10_000 });
      await stopping;
      const restarted = await restarting;
      const restartedVitePid = Number(await fetch(`${restarted.origin}/__vite_pid`).then(response => response.text()));
      descendantPids.add(restartedVitePid);
      expect(restarted.generation).toBe(firstAgain.generation + 1);
      await eventually(() => !isProcessAlive(firstAgain.processId) && !isProcessAlive(firstAgainVitePid));
      expect(controller.isAlive('left')).toBe(true);
      await controller.stop('left');
      await eventually(() => !isProcessAlive(restarted.processId) && !isProcessAlive(restartedVitePid));
      await eventually(() => portIsClosed(restarted.url));
      expect(worktreePaths(root)).toEqual(baselineWorktrees);
    } finally {
      failProcessCleanupFor = 0;
      repository.failNextRemovalPath = null;
      await controller.stopAll();
      if (previousOrigin === undefined) delete process.env.UI_MERGE_STUDIO_ORIGIN;
      else process.env.UI_MERGE_STUDIO_ORIGIN = previousOrigin;
      await new Promise<void>((accept, reject) => instrumentationServer.close(error => error ? reject(error) : accept()));
    }

    for (const pid of descendantPids) expect(isProcessAlive(pid)).toBe(false);
    expect(controller.isAlive('left')).toBe(false);
    expect(controller.isAlive('right')).toBe(false);
    expect(worktreePaths(root)).toEqual(baselineWorktrees);
  }, 45_000);

  test('observes an immediate dev-command exit and leaves no process or worktree', async () => {
    const root = temporaryViteRepository('node -e "process.exit(7)" --');
    const baselineWorktrees = worktreePaths(root);
    const controller = new PreviewController(new RepositoryController(root), resolve(root, 'unused-config.ts'), '/');
    try {
      await expect(controller.start('fast-exit', 'main', { startupTimeoutMs: 5_000 })).rejects.toThrow(/process exited|code 7/i);
      expect(controller.isAlive('fast-exit')).toBe(false);
      expect(controller.session('fast-exit')).toMatchObject({ status: 'failed' });
      expect(worktreePaths(root)).toEqual(baselineWorktrees);
    } finally {
      await controller.stopAll();
    }
  }, 15_000);
});
