import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '../../tests/e2e', timeout: 120_000, workers: 1, use: { baseURL: 'http://127.0.0.1:4310', trace: 'retain-on-failure' }, webServer: { command: 'npm run build && npm run preview:showcase', cwd: '../..', url: 'http://127.0.0.1:4310', timeout: 120_000, reuseExistingServer: false } });
