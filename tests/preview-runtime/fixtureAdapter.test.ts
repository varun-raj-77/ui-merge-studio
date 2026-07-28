import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { compareCapabilities } from '../../apps/studio/src/comparisonState';
import { showcaseRefusalEvidence } from '../../apps/studio/src/showcaseRefusal';
import { detectFixtureCapabilities } from '../../packages/preview-runtime/src/fixtureAdapter';
import { generated, git } from '../../scripts/fixture-lib';

const roots: string[] = [];
async function fixture(source: string) { const root = await mkdtemp(resolve(tmpdir(), 'ums-adapter-')); roots.push(root); await mkdir(resolve(root, 'src/state'), { recursive: true }); await writeFile(resolve(root, 'src/state/ticketSelection.ts'), source); return root; }
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
describe('controlled fixture capability adapter', () => {
  test('falls back to source selection for a Vite repository without the fixture state contract', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'ums-adapter-generic-'));
    roots.push(root);
    await expect(detectFixtureCapabilities(root)).resolves.toEqual({ routeSync: null, fixtureContext: null, sourceSelection: { version: 1 } });
  });

  test('detects query and path contracts from checked-out source evidence without a branch name', async () => {
    const query = await detectFixtureCapabilities(await fixture("export const ticketQueryKey = 'ticket'; export function selectedTicketId() {}"));
    const path = await detectFixtureCapabilities(await fixture("export function ticketPath(id: string) { return '/tickets/' + id } export function selectedTicketId() {}"));
    expect(query.routeSync?.contract).toBe('ticket-query-v1');
    expect(path.routeSync?.contract).toBe('ticket-path-v1');
    expect(query.fixtureContext?.contract).not.toBe(path.fixtureContext?.contract);
  });
  test('keeps the public refusal aligned with the real controlled branches', async () => {
    const querySource = git(generated, ['show', 'branch-sidebar:src/state/ticketSelection.ts']);
    const pathSource = git(generated, ['show', 'branch-incompatible-route:src/state/ticketSelection.ts']);
    const query = await detectFixtureCapabilities(await fixture(querySource));
    const path = await detectFixtureCapabilities(await fixture(pathSource));
    expect(query.routeSync?.contract).toBe(showcaseRefusalEvidence.leftContract);
    expect(path.routeSync?.contract).toBe(showcaseRefusalEvidence.rightContract);
    expect(compareCapabilities(query, path).reason).toBe(showcaseRefusalEvidence.reason);
    expect(pathSource).toContain('/tickets/');
    expect(showcaseRefusalEvidence.route).toBe('/tickets/:ticketId');
  });
  test('refuses ambiguous source rather than guessing a capability', async () => { expect((await detectFixtureCapabilities(await fixture('export const unknown = true'))).routeSync).toBeNull(); });
});
