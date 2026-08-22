import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const externalRepository = resolve(process.env.UI_MERGE_EXTERNAL_REPOSITORY ?? resolve(workspaceRoot, '.validation-worktrees/prompt015-external-vite'));
const commandShell = process.platform === 'win32' ? (process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe') : 'npm';
const npmArguments = (args: string[]) => process.platform === 'win32' ? ['/d', '/s', '/c', 'npm', ...args] : args;
const verificationCommands = [
  { name: 'install', executable: commandShell, args: npmArguments(['ci', '--no-audit', '--no-fund']) },
  { name: 'lint', executable: commandShell, args: npmArguments(['run', 'lint']) },
  { name: 'production-build-with-typescript', executable: commandShell, args: npmArguments(['run', 'build']) }
];

export default defineConfig({
  testDir: '../../tests/e2e',
  testMatch: 'external-vite-falsification.spec.ts',
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
      UI_MERGE_BASE_REF: 'prompt014-foundation',
      UI_MERGE_LEFT_BRANCH: 'prompt014-workspace-status',
      UI_MERGE_RIGHT_BRANCH: 'prompt014-revenue-pulse',
      UI_MERGE_CANDIDATE_BRANCH: 'prompt015-external-candidate',
      UI_MERGE_PREVIEW_ROUTE: '/auth/login',
      UI_MERGE_VERIFICATION_COMMANDS: JSON.stringify(verificationCommands)
    }
  }
});
