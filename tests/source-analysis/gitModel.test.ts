import { renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { GitSourceRepository, validateRepositoryPath } from '../../packages/source-analysis/src/gitModel';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from './testRepository';

afterEach(cleanupRepositories);
describe('Git change model', () => {
  test('resolves merge base and classifies added, modified, renamed, and binary changes with hunks', async () => {
    const root = createRepository({ 'src/a.ts': 'export const a = 1;\n', 'src/old.ts': 'export const old = 1;\n' }); git(root, ['switch','-c','feature']); writeFiles(root, { 'src/a.ts': 'export const a = 2;\nexport const b = 3;\n', 'src/new.ts': 'export const added = true;\n', 'src/data.png': Buffer.from([0,1,2,3,0,255]) }); renameSync(resolve(root,'src/old.ts'), resolve(root,'src/renamed.ts')); const branch = commit(root); const repository = new GitSourceRepository(root); const base = await repository.resolveRef('main');
    expect(await repository.mergeBase('main','feature')).toBe(base); expect(await repository.resolveRef('feature')).toBe(branch);
    const changes = await repository.changedFiles(base, branch); expect(changes.find(item => item.path === 'src/a.ts')).toMatchObject({ status: 'modified', hunks: [{ startLine: 1, endLine: 2 }] }); expect(changes.find(item => item.path === 'src/new.ts')?.status).toBe('added'); expect(changes.find(item => item.path === 'src/renamed.ts')).toMatchObject({ status: 'renamed', previousPath: 'src/old.ts' }); expect(changes.find(item => item.path === 'src/data.png')?.status).toBe('binary');
  });
  test('rejects path traversal and unsafe refs', async () => { expect(() => validateRepositoryPath('../outside.ts')).toThrow('Unsafe'); const repository = new GitSourceRepository(createRepository({ 'a.ts': 'export{}' })); await expect(repository.resolveRef('--all')).rejects.toThrow('Unsafe'); });
});
