import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { detectFixtureCapabilities } from '../../packages/preview-runtime/src/fixtureAdapter';
import { generated, git } from '../../scripts/fixture-lib';

const roots: string[] = [];
async function fixture(source: string) {
  const root = await mkdtemp(resolve(tmpdir(), 'ums-adapter-'));
  roots.push(root);
  await mkdir(resolve(root, 'src/state'), { recursive: true });
  await writeFile(resolve(root, 'src/state/catalogueContext.ts'), source);
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('controlled fixture capability adapter', () => {
  test('falls back to source selection without the controlled state contract', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'ums-adapter-generic-'));
    roots.push(root);
    await expect(detectFixtureCapabilities(root)).resolves.toEqual({ routeSync: null, fixtureContext: null, sourceSelection: { version: 1 } });
  });

  test('derives catalogue synchronization from checked-out source rather than branch names', async () => {
    const capabilities = await detectFixtureCapabilities(await fixture("export const catalogueRoute='/catalogue'; export const productQueryKey='product'; export const catalogueFixtureContract='product-catalogue-v1';"));
    expect(capabilities).toEqual({
      routeSync: { version: 1, contract: 'catalogue-query-v1' },
      fixtureContext: { version: 1, contract: 'product-catalogue-v1', entityType: 'product' },
      sourceSelection: { version: 1 }
    });
  });

  test('detects the same synchronized contract on every real fixture branch', async () => {
    for (const branch of ['main', 'branch-a', 'branch-b', 'branch-incompatible']) {
      const source = git(generated, ['show', `${branch}:src/state/catalogueContext.ts`]);
      const capabilities = await detectFixtureCapabilities(await fixture(source));
      expect(capabilities.routeSync?.contract).toBe('catalogue-query-v1');
      expect(capabilities.fixtureContext?.entityType).toBe('product');
    }
  });

  test('refuses an incomplete or ambiguous contract', async () => {
    expect((await detectFixtureCapabilities(await fixture("export const catalogueRoute='/catalogue'"))).routeSync).toBeNull();
  });
});
