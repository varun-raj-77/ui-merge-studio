import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const workflow = readFileSync(resolve(import.meta.dirname, '../../.github/workflows/verify.yml'), 'utf8');

describe('read-only GitHub verification workflow guardrails', () => {
  test('pins both Node.js 24-compatible actions to reviewed immutable commit hashes', () => {
    expect(workflow).toContain('actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3');
    expect(workflow).toContain('actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6.5.0');
    expect(workflow).toContain('node-version: \'24\'');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('contents: read');
  });

  test('retains locked dependency install and limited disposable fixture scope', () => {
    expect(workflow).toContain('npm ci --no-audit --no-fund');
    expect(workflow).toContain('npm run fixture:create');
    expect(workflow).toContain('npm run fixture:verify');
    expect(workflow).toContain('git diff --exit-code');
    expect(workflow).toContain('working-directory: UI merge studio');
  });

  test('bounds Chromium installation without removing its OS dependencies', () => {
    const step = workflow.split('      - name: Install Chromium for bounded browser journeys\n')[1]
      ?.split('      - name: Check real Showcase journeys')[0];
    expect(step).toBeDefined();
    expect(step).toContain('timeout-minutes: 20');
    expect(step).toContain('npx playwright --version');
    expect(step).toContain('npx playwright install --with-deps chromium');
    expect(step).toContain('Chromium and system dependencies installed in');
  });

  test('preserves all three bounded browser suites rather than replacing them with smoke-only checks', () => {
    expect(workflow).toContain('tests/e2e/guided-experience.spec.ts');
    expect(workflow).toContain('tests/e2e/showcase-evidence.spec.ts');
    expect(workflow).toContain('tests/e2e/integration-plan.spec.ts');
    expect(workflow).toContain('tests/e2e/foundation-support.spec.ts');
    expect(workflow).toContain('tests/e2e/local-canonical-plan.spec.ts');
    expect(workflow).toContain('tests/e2e/local-selection-provenance.spec.ts');
    expect(workflow).toContain('tests/e2e/two-feature-candidate-browser.spec.ts');
    expect(workflow).not.toMatch(/vercel (?:deploy|promote|rollback)|--prod|test:e2e:external/);
  });
});
