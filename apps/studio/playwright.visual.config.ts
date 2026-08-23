import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../../tests/visual',
  timeout: 120_000,
  workers: 1,
  outputDir: '../../test-results/prompt-024-playwright',
  use: {
    baseURL: 'http://127.0.0.1:4310',
    trace: 'retain-on-failure'
  }
});
