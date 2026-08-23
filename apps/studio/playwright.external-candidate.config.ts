import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const externalRepository = resolve(process.env.UI_MERGE_EXTERNAL_CANDIDATE_REPOSITORY ?? resolve(workspaceRoot, '.validation-worktrees/prompt020-external-vite'));
const commandShell = process.platform === 'win32' ? (process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe') : 'npm';
const npmArguments = (args: string[]) => process.platform === 'win32' ? ['/d', '/s', '/c', 'npm', ...args] : args;
const verificationCommands = [
  { name: 'install', executable: commandShell, args: npmArguments(['ci', '--no-audit', '--no-fund']) },
  { name: 'typecheck', executable: commandShell, args: npmArguments(['exec', 'tsc', '--', '-b', '--pretty', 'false']) },
  { name: 'production-build', executable: commandShell, args: npmArguments(['run', 'build']) }
];

export default defineConfig({
  testDir: '../../tests/e2e',
  testMatch: 'external-candidate-generation.spec.ts',
  timeout: 600_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4310',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    cwd: '../..',
    url: 'http://127.0.0.1:4310',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      UI_MERGE_REPOSITORY_PATH: externalRepository,
      UI_MERGE_BASE_REF: 'main',
      UI_MERGE_LEFT_BRANCH: 'main',
      UI_MERGE_RIGHT_BRANCH: 'prompt020-revenue-pulse',
      UI_MERGE_CANDIDATE_BRANCH: 'combined-result',
      UI_MERGE_PREVIEW_ROUTE: '/auth/login',
      UI_MERGE_VERIFICATION_COMMANDS: JSON.stringify(verificationCommands),
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'safe.directory',
      GIT_CONFIG_VALUE_0: externalRepository.replaceAll('\\', '/')
    }
  }
});
