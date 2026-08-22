import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { discoverRepository, RepositoryDiscoveryError } from '../../packages/repository-controller/src/repositoryDiscovery';

const roots: string[] = [];

function temporaryDirectory() {
  const root = mkdtempSync(resolve(tmpdir(), 'ums-discovery-'));
  roots.push(root);
  return root;
}

function writeFiles(root: string, files: Record<string, string>) {
  for (const [path, contents] of Object.entries(files)) {
    const target = resolve(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

function initializeGit(root: string) {
  execFileSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' });
}

function packageJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    name: 'unrelated-real-application',
    private: true,
    packageManager: 'pnpm@10.0.0',
    scripts: { dev: 'vite', check: 'tsc --noEmit', build: 'vite build' },
    dependencies: { react: '^18.3.0', 'react-dom': '^18.3.0' },
    devDependencies: { '@vitejs/plugin-react': '^4.3.0', typescript: '^5.6.0', vite: '^6.0.0' },
    ...overrides
  }, null, 2);
}

function supportedRepository() {
  const root = temporaryDirectory();
  initializeGit(root);
  writeFiles(root, {
    'package.json': packageJson(),
    'pnpm-lock.yaml': 'lockfileVersion: 9\n',
    'index.html': '<main id="application"></main><script src="/client/bootstrap.tsx" type="module"></script>',
    'tsconfig.app.json': JSON.stringify({ compilerOptions: { jsx: 'react-jsx' }, include: ['client'] }),
    'vite.config.mts': "import { defineConfig } from 'vite'; export default defineConfig({});",
    'client/bootstrap.tsx': "import { createRoot } from 'react-dom/client'; import { Shell } from './shell'; createRoot(document.getElementById('application')!).render(<Shell />);",
    'client/shell.tsx': "export function Shell() { return <section>Independent application</section>; }"
  });
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('real React TypeScript Vite repository discovery', () => {
  test('discovers a supported repository without conventional component or entry-point names', async () => {
    const root = supportedRepository();
    const discovery = await discoverRepository(root);

    expect(discovery.repositoryPath).toBe(root);
    expect(discovery.git).toEqual({ detected: true, root });
    expect(discovery.packageManager).toMatchObject({ name: 'pnpm', lockFiles: ['pnpm-lock.yaml'] });
    expect(discovery.scripts).toEqual({ build: 'vite build', check: 'tsc --noEmit', dev: 'vite' });
    expect(discovery.dependencies.production).toMatchObject({ react: '^18.3.0', 'react-dom': '^18.3.0' });
    expect(discovery.dependencies.development).toMatchObject({ typescript: '^5.6.0', vite: '^6.0.0' });
    expect(discovery.entryPoints).toEqual(['client/bootstrap.tsx']);
    expect(discovery.sourceDirectories).toEqual(['client']);
    expect(discovery.framework).toMatchObject({
      kind: 'react-typescript-vite',
      react: { detected: true, version: '^18.3.0' },
      typescript: { detected: true, version: '^5.6.0', configFiles: ['tsconfig.app.json'] },
      vite: { detected: true, version: '^6.0.0', configFiles: ['vite.config.mts'] }
    });
  });

  test('refuses a non-Git directory with explicit detection evidence', async () => {
    const root = temporaryDirectory();
    writeFiles(root, { 'package.json': packageJson() });
    await expect(discoverRepository(root)).rejects.toMatchObject({
      name: 'RepositoryDiscoveryError',
      code: 'not-git',
      detected: expect.arrayContaining(['an accessible directory', 'no Git work tree']),
      missing: ['a Git repository']
    });
  });

  test('refuses a React Vite project missing TypeScript', async () => {
    const root = temporaryDirectory();
    initializeGit(root);
    writeFiles(root, {
      'package.json': packageJson({ devDependencies: { '@vitejs/plugin-react': '^4.3.0', vite: '^6.0.0' } }),
      'index.html': '<script type="module" src="/client/bootstrap.jsx"></script>',
      'vite.config.js': "import { defineConfig } from 'vite'; export default defineConfig({});",
      'client/bootstrap.jsx': "import { createRoot } from 'react-dom/client'; createRoot(document.body).render(null);"
    });

    await expect(discoverRepository(root)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(RepositoryDiscoveryError);
      const discoveryError = error as RepositoryDiscoveryError;
      expect(discoveryError.code).toBe('unsupported-repository');
      expect(discoveryError.missing).toEqual(expect.arrayContaining([
        'the typescript package dependency',
        'a tsconfig.json or tsconfig.*.json configuration',
        'TypeScript application source (.ts or .tsx)'
      ]));
      expect(discoveryError.message).toContain('React ^18.3.0');
      return true;
    });
  });

  test('refuses a non-Vite React TypeScript project', async () => {
    const root = temporaryDirectory();
    initializeGit(root);
    writeFiles(root, {
      'package.json': packageJson({
        scripts: { dev: 'webpack serve', build: 'webpack' },
        devDependencies: { typescript: '^5.6.0', webpack: '^5.0.0' }
      }),
      'index.html': '<script type="module" src="/client/bootstrap.tsx"></script>',
      'tsconfig.json': JSON.stringify({ compilerOptions: { jsx: 'react-jsx' } }),
      'client/bootstrap.tsx': "import { createRoot } from 'react-dom/client'; createRoot(document.body).render(null);"
    });

    await expect(discoverRepository(root)).rejects.toMatchObject({
      code: 'unsupported-repository',
      missing: expect.arrayContaining(['the vite package dependency', 'a Vite configuration or package script'])
    });
  });

  test('refuses an invalid repository path before Git inspection', async () => {
    const missing = resolve(temporaryDirectory(), 'does-not-exist');
    await expect(discoverRepository(missing)).rejects.toMatchObject({
      code: 'invalid-path',
      missing: ['an accessible local directory']
    });
  });
});
