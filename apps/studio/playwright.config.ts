import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../../tests/e2e',
  // External proofs require separately configured unrelated repositories and
  // some create real candidate branches. Their dedicated configs provide the
  // repository, branch, route, and verification-command contracts.
  testIgnore: ['external-*.spec.ts'],
  timeout: 120_000,
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
      UI_MERGE_CANDIDATE_BRANCH: 'phase0-canonical-e2e-result'
    }
  }
});
