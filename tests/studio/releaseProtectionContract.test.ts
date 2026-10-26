import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const workflow = read('.github/workflows/verify.yml');
const runbook = read('docs/release-protection-rollout.md');

describe('UMS-22 release gate contract (source only, not remote enforcement)', () => {
  test('pins the exact full CI job name required by GitHub and Vercel policies', () => {
    const check = 'Typecheck, tests, build, and browser journeys';
    const names = [...workflow.matchAll(/^    name: (.+)$/gm)].map(match => match[1]);
    expect(names).toEqual([check]);
    expect(runbook).toContain(check);
    expect(runbook).toContain('GitHub Actions');
    expect(runbook).not.toContain('Vercel Preview Comments | **ON**');
  });

  test('runs on every main pull request and push, with no path exclusions or deploy credentials', () => {
    expect(workflow).toContain('  pull_request:\n    branches: [main]');
    expect(workflow).toContain('  push:\n    branches: [main]');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).not.toMatch(/continue-on-error:\s*true|paths-ignore:|vercel\s+(?:deploy|promote|rollback)|--prod|test:e2e:external/);
  });

  test('requires real verification stages and all seven named browser specs', () => {
    for (const cmd of ['npm ci --no-audit --no-fund', 'npm run typecheck', 'npm test', 'npm run fixture:verify', 'npm run showcase:validate', 'npm run build']) {
      expect(workflow).toContain(cmd);
    }
    for (const spec of ['guided-experience', 'showcase-evidence', 'integration-plan', 'foundation-support', 'local-canonical-plan', 'local-selection-provenance', 'two-feature-candidate-browser']) {
      expect(workflow).toContain(`tests/e2e/${spec}.spec.ts`);
    }
  });

  test('keeps platform activation and failure-path testing explicitly separate', () => {
    expect(runbook).toContain('NOT an enabled protection policy');
    expect(runbook).toContain('main.protected === true');
    expect(runbook).toContain('UNKNOWN (not readable here)');
    expect(runbook).toContain('Do not mark UMS-22 as **enforced**');
    expect(runbook).toContain('Do not use Force Promote');
  });
});
