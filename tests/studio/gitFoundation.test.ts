import { afterEach, describe, expect, it } from 'vitest';
import { resolveIntegrationRepository, validatePinnedIntegrationRepository } from '../../packages/integration-plan/src/gitFoundation';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

afterEach(cleanupRepositories);

function repositoryWithBranches() {
  const root = createRepository({ 'src/base.ts': 'export const base = true;\n' });
  git(root, ['switch', '-c', 'version-a']);
  writeFiles(root, { 'src/a.ts': 'export const a = true;\n' });
  commit(root, 'version a');
  git(root, ['switch', 'main']);
  git(root, ['switch', '-c', 'version-b']);
  writeFiles(root, { 'src/b.ts': 'export const b = true;\n' });
  commit(root, 'version b');
  git(root, ['switch', 'main']);
  return { root, repository: new GitSourceRepository(root) };
}

describe('Git-backed foundation resolution', () => {
  it('pins foundation, source heads, and their verified common ancestor', async () => {
    const { repository } = repositoryWithBranches();
    const resolved = await resolveIntegrationRepository(repository, 'repo:test', 'version-a', ['version-b']);
    expect(resolved.foundation.branchRef).toBe('version-a');
    expect(resolved.foundation.commitSha).toBe(await repository.resolveRef('version-a'));
    expect(resolved.foundation.commonAncestorCommit).toBe(await repository.resolveRef('main'));
    expect(resolved.sourceCommits).toEqual({ 'version-b': await repository.resolveRef('version-b') });
    await expect(validatePinnedIntegrationRepository(repository, resolved.foundation, resolved.sourceCommits)).resolves.toBeUndefined();
  });

  it('refuses a stale foundation and a stale selected source branch', async () => {
    const first = repositoryWithBranches();
    const foundationPlan = await resolveIntegrationRepository(first.repository, 'repo:test', 'version-a', ['version-b']);
    git(first.root, ['switch', 'version-a']);
    writeFiles(first.root, { 'src/a.ts': 'export const a = "moved";\n' });
    commit(first.root, 'move foundation');
    await expect(validatePinnedIntegrationRepository(first.repository, foundationPlan.foundation, foundationPlan.sourceCommits)).rejects.toThrow(/changed after this plan/i);

    const second = repositoryWithBranches();
    const sourcePlan = await resolveIntegrationRepository(second.repository, 'repo:test', 'version-a', ['version-b']);
    git(second.root, ['switch', 'version-b']);
    writeFiles(second.root, { 'src/b.ts': 'export const b = "moved";\n' });
    commit(second.root, 'move source');
    await expect(validatePinnedIntegrationRepository(second.repository, sourcePlan.foundation, sourcePlan.sourceCommits)).rejects.toThrow(/changed after this plan/i);
  });

  it('refuses a missing foundation and unrelated histories', async () => {
    const { root, repository } = repositoryWithBranches();
    await expect(resolveIntegrationRepository(repository, 'repo:test', 'missing', ['version-b'])).rejects.toThrow(/foundation branch is not available/i);
    git(root, ['switch', '--orphan', 'unrelated']);
    writeFiles(root, { 'src/unrelated.ts': 'export const unrelated = true;\n' });
    commit(root, 'unrelated root');
    await expect(resolveIntegrationRepository(repository, 'repo:test', 'version-a', ['unrelated'])).rejects.toThrow(/usable history/i);
  });
});
