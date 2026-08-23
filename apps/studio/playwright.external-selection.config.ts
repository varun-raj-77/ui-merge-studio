import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const externalRepository = resolve(process.env.UI_MERGE_EXTERNAL_REPOSITORY ?? 'C:/Users/rekha/OneDrive/Documents/ui-merge-vite-validation');

export default defineConfig({
  testDir: '../../tests/e2e',
  testMatch: 'external-rendered-selection.spec.ts',
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
      UI_MERGE_RIGHT_BRANCH: 'ui-merge-validation-alternate',
      UI_MERGE_CANDIDATE_BRANCH: 'prompt018-unused-candidate',
      UI_MERGE_PREVIEW_ROUTE: '/auth/login',
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'safe.directory',
      GIT_CONFIG_VALUE_0: externalRepository.replaceAll('\\', '/')
    }
  }
});
