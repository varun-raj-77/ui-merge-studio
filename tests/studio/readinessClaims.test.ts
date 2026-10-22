import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const file = (path: string) => readFileSync(resolve(root, path), 'utf8');
const workflow = file('.github/workflows/verify.yml');
const readme = file('README.md');
const ci = file('docs/continuous-integration.md');
const audit = file('docs/product-readiness-audit.md');

describe('UMS-21 honest product readiness claims', () => {
  test('keeps the hosted Showcase distinct from real local Git work', () => {
    expect(readme).toContain('Hosted vs. local');
    expect(readme).toContain('Real Git/worktree execution');
    expect(readme).toContain('There is no GitHub authentication, push, pull-request, collaboration, or production-readiness claim.');
    expect(audit).toContain('General-purpose merge product / arbitrary repositories / security-hardened multi-user SaaS: NOT READY');
  });

  test('CI documentation accounts for every exact browser spec without implying external tests ran', () => {
    const expected = [
      'guided-experience', 'showcase-evidence', 'integration-plan', 'foundation-support',
      'local-canonical-plan', 'local-selection-provenance', 'two-feature-candidate-browser'
    ];
    for (const name of expected) {
      const path = `tests/e2e/${name}.spec.ts`;
      expect(workflow).toContain(path);

    }
    expect(ci).toContain('seven explicitly named specs');
    expect(ci).toContain('14 Showcase browser tests');
    expect(ci).toContain('external:prepare');
    expect(workflow).not.toContain('test:e2e:external');
  });

  test('describes post-merge CI independently of production READY', () => {
    expect(ci).toContain('not** a passed post-merge test suite');
    expect(audit).toContain('READY does not imply post-merge CI passed');
    expect(audit).toContain('separately authorized');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toMatch(/vercel (?:deploy|promote|rollback)|--prod/);
  });

  test('preserves the bounded local compatibility/trust assertions in readiness documentation', () => {
    expect(audit).toContain('pnpm/yarn');
    expect(audit).toContain('not sandboxes');
    expect(audit).toContain('one unrelated');
    expect(audit).toContain('last-attempt snapshot');
    expect(audit).toContain('NOT READY');
  });
});
