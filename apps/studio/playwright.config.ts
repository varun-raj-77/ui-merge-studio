import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../../tests/e2e',
  // These two proofs require a separately configured unrelated repository and
  // create real source/candidate branches. They are not part of the hosted
  // fresh-production suite and must be invoked with their dedicated external setup.
  testIgnore: ['external-vite-candidate.spec.ts', 'external-vite-mapping.spec.ts'],
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4310',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run build && npm run preview:showcase',
    cwd: '../..',
    url: 'http://127.0.0.1:4310',
    timeout: 120_000,
    reuseExistingServer: false
  }
});
