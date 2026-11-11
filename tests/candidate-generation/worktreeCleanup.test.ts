import { access, mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { removeTemporaryCandidateWorktree } from '../../packages/candidate-generation/src/worktreeCleanup';
import { cleanupRepositories, createRepository, git } from '../source-analysis/testRepository';

afterEach(cleanupRepositories);

async function preparedWorktree() {
  const repository = createRepository({ 'README.md': 'owned test repository\n' });
  const target = await mkdtemp(join(tmpdir(), 'ui-merge-studio-candidate-'));
  git(repository, ['worktree', 'add', '--detach', target, 'main']);
  return { repository, target };
}

test('retries a transient ENOTEMPTY only while the real Git worktree remains registered', async () => {
  const { repository, target } = await preparedWorktree();
  let removals = 0;
  await removeTemporaryCandidateWorktree(target, async args => {
    if (args[1] === 'remove' && removals++ === 0) throw new Error('fatal: Directory not empty');
    return git(repository, args);
  });
  expect(removals).toBe(2);
  expect(git(repository, ['worktree', 'list', '--porcelain'])).not.toContain(target);
  await expect(access(target)).rejects.toMatchObject({ code: 'ENOENT' });
});

test('recognizes a still-registered worktree through a symlinked temp directory', async () => {
  const { repository, target } = await preparedWorktree();
  const aliasRoot = await mkdtemp(join(tmpdir(), 'ums-temp-alias-'));
  const alias = join(aliasRoot, 'temp-link');
  await symlink(tmpdir(), alias, 'dir');
  let removals = 0;
  try {
    await removeTemporaryCandidateWorktree(target, async args => {
      if (args[1] === 'remove' && removals++ === 0) throw new Error('Directory not empty');
      if (args[1] === 'list') return `worktree ${join(alias, basename(target))}\nHEAD abcdef\ndetached\n`;
      return git(repository, args);
    });
    expect(removals).toBe(2);
    expect(git(repository, ['worktree', 'list', '--porcelain'])).not.toContain(target);
    await expect(access(target)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(aliasRoot, { recursive: true, force: true });
  }
});

test('removes a residual directory only after Git has already deregistered the worktree', async () => {
  const { repository, target } = await preparedWorktree();
  git(repository, ['worktree', 'remove', '--force', target]);
  await mkdir(target);
  await writeFile(join(target, 'late-writer.txt'), 'transient output');
  let removals = 0;
  await removeTemporaryCandidateWorktree(target, async args => {
    if (args[1] === 'remove') { removals++; throw new Error('ENOTEMPTY'); }
    return git(repository, args);
  });
  expect(removals).toBe(1);
  await expect(access(target)).rejects.toMatchObject({ code: 'ENOENT' });
});

test('preserves the registered worktree and reports a persistent ENOTEMPTY', async () => {
  const { repository, target } = await preparedWorktree();
  try {
    let removals = 0;
    await expect(removeTemporaryCandidateWorktree(target, async args => {
      if (args[1] === 'remove') { removals++; throw new Error('Directory not empty'); }
      return git(repository, args);
    })).rejects.toThrow('Directory not empty');
    expect(removals).toBe(3);
    expect(git(repository, ['worktree', 'list', '--porcelain'])).toContain(`worktree ${target}`);
    await expect(access(target)).resolves.toBeUndefined();
  } finally {
    git(repository, ['worktree', 'remove', '--force', target]);
  }
});

test.each([
  ['empty', ''],
  ['missing worktree records', 'HEAD abcdef\ndetached\n'],
  ['blank worktree path', 'worktree \nHEAD abcdef\n'],
  ['relative worktree path', 'worktree ./not-an-absolute-path\nHEAD abcdef\n'],
])('refuses orphan removal when Git returns an %s inventory', async (_label, inventory) => {
  const { repository, target } = await preparedWorktree();
  try {
    await expect(removeTemporaryCandidateWorktree(target, async args => {
      if (args[1] === 'remove') throw new Error('Directory not empty');
      if (args[1] === 'list') return inventory;
      return git(repository, args);
    })).rejects.toThrow('Refusing orphan cleanup: invalid Git worktree inventory');
    expect(git(repository, ['worktree', 'list', '--porcelain'])).toContain(`worktree ${target}`);
    await expect(access(target)).resolves.toBeUndefined();
  } finally {
    git(repository, ['worktree', 'remove', '--force', target]);
  }
});

test('refuses unowned paths and does not hide unrelated Git errors', async () => {
  const { repository, target } = await preparedWorktree();
  const unrelated = await mkdtemp(join(tmpdir(), 'unrelated-worktree-'));
  try {
    await expect(removeTemporaryCandidateWorktree(unrelated, async args => git(repository, args))).rejects.toThrow('Refusing to remove unrecognized');
    await expect(access(unrelated)).resolves.toBeUndefined();
    await expect(removeTemporaryCandidateWorktree(target, async () => { throw new Error('permission denied'); })).rejects.toThrow('permission denied');
    expect(git(repository, ['worktree', 'list', '--porcelain'])).toContain(`worktree ${target}`);
  } finally {
    git(repository, ['worktree', 'remove', '--force', target]);
    await rm(unrelated, { recursive: true, force: true });
  }
});
