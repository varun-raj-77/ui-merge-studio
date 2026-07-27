import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadRepositoryConfiguration } from '../../apps/studio/repositoryConfig';

describe('bounded local repository configuration', () => {
  test('preserves the controlled defaults', () => {
    const configuration = loadRepositoryConfiguration('C:/studio', {});
    expect(configuration).toMatchObject({
      repositoryPath: resolve('C:/studio', 'fixtures/generated/support-dashboard'),
      baseRef: 'main',
      previewPath: '/tickets',
      preferredBranches: [],
      candidateBranch: 'combined-result',
      verificationCommands: undefined
    });
  });

  test('accepts external refs, route, candidate, and deterministic verification commands', () => {
    const commands = [{ name: 'typecheck', executable: 'npm', args: ['exec', 'tsc', '--', '-b'] }];
    const configuration = loadRepositoryConfiguration('C:/studio', {
      UI_MERGE_REPOSITORY_PATH: 'C:/external',
      UI_MERGE_BASE_REF: 'base',
      UI_MERGE_PREVIEW_ROUTE: '/auth/login',
      UI_MERGE_LEFT_BRANCH: 'left',
      UI_MERGE_RIGHT_BRANCH: 'right',
      UI_MERGE_CANDIDATE_BRANCH: 'combined',
      UI_MERGE_VERIFICATION_COMMANDS: JSON.stringify(commands)
    });
    expect(configuration).toMatchObject({ repositoryPath: 'C:/external', baseRef: 'base', previewPath: '/auth/login', preferredBranches: ['left', 'right'], candidateBranch: 'combined', verificationCommands: commands });
  });

  test('refuses malformed verification configuration', () => {
    expect(() => loadRepositoryConfiguration('C:/studio', { UI_MERGE_VERIFICATION_COMMANDS: '[{"name":"typecheck"}]' })).toThrow('UI_MERGE_VERIFICATION_COMMANDS');
  });
});
