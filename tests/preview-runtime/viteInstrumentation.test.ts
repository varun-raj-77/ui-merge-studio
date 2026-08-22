// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  ExternalViteInstrumentationRefusal,
  nativeViteConfigPath,
  writeExternalViteInstrumentationConfig
} from '../../packages/preview-runtime/src/viteInstrumentation';

const roots: string[] = [];
function metadata(configFiles: string[], dev = 'vite') {
  return {
    scripts: { dev },
    framework: {
      kind: 'react-typescript-vite' as const,
      react: { detected: true as const, version: '19', evidence: [] },
      typescript: { detected: true as const, version: '6', configFiles: ['tsconfig.json'], evidence: [] },
      vite: { detected: true as const, version: '8', configFiles, evidence: [] }
    }
  };
}

afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('external Vite instrumentation composition', () => {
  test('writes an ephemeral wrapper that loads native config and prepends only generic instrumentation', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'ums-vite-instrumentation-'));
    roots.push(root);
    await mkdir(resolve(root, 'src'));
    await writeFile(resolve(root, 'vite.config.ts'), 'export default { define: { __NATIVE__: true }, plugins: [] };');
    const result = await writeExternalViteInstrumentationConfig({
      repositoryRoot: root,
      metadata: metadata(['vite.config.ts']),
      identity: { previewId: 'left', sessionId: 'session-1', generation: 1, branch: 'main' },
      studioOrigin: 'http://127.0.0.1:4310',
      capabilities: { routeSync: null, fixtureContext: null, sourceSelection: { version: 1 } }
    });
    const wrapper = await readFile(result.wrapperPath, 'utf8');
    expect(result.nativeConfigPath).toBe(resolve(root, 'vite.config.ts'));
    expect(result.wrapperPath).toBe(resolve(root, '.ums/ui-merge.preview.vite.config.ts'));
    expect(wrapper).toContain("import { loadConfigFromFile } from 'vite'");
    expect(wrapper).toContain('plugins: [instrumentation, ...(nativeConfig.plugins ?? [])]');
    expect(wrapper).not.toMatch(/DashboardPage|src\/views\/dashboard/);
  });

  test('supports Vite defaults when no native config exists', () => {
    expect(nativeViteConfigPath('C:/repo', metadata([]))).toBeNull();
  });

  test.each([
    [metadata(['vite.config.ts', 'vite.config.mts']), /multiple Vite configuration/i],
    [metadata(['packages/app/vite.config.ts']), /nested/i],
    [metadata(['vite.config.ts'], 'vite --config special.ts'), /dev script selects/i],
    [metadata(['vite.config.ts'], 'vite --configLoader native'), /dev script selects/i]
  ])('refuses ambiguous native Vite semantics', value => {
    expect(() => nativeViteConfigPath('C:/repo', value)).toThrow(ExternalViteInstrumentationRefusal);
  });
});
