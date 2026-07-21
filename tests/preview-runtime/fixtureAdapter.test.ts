import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { detectFixtureCapabilities } from '../../packages/preview-runtime/src/fixtureAdapter';

const roots: string[] = [];
async function fixture(source: string) { const root = await mkdtemp(resolve(tmpdir(), 'ums-adapter-')); roots.push(root); await mkdir(resolve(root, 'src/state'), { recursive: true }); await writeFile(resolve(root, 'src/state/ticketSelection.ts'), source); return root; }
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
describe('controlled fixture capability adapter', () => {
  test('detects query and path contracts from checked-out source evidence without a branch name', async () => {
    const query = await detectFixtureCapabilities(await fixture("export const ticketQueryKey = 'ticket'; export function selectedTicketId() {}"));
    const path = await detectFixtureCapabilities(await fixture("export function ticketPath(id: string) { return '/tickets/' + id } export function selectedTicketId() {}"));
    expect(query.routeSync?.contract).toBe('ticket-query-v1');
    expect(path.routeSync?.contract).toBe('ticket-path-v1');
    expect(query.fixtureContext?.contract).not.toBe(path.fixtureContext?.contract);
  });
  test('refuses ambiguous source rather than guessing a capability', async () => { expect((await detectFixtureCapabilities(await fixture('export const unknown = true'))).routeSync).toBeNull(); });
});
