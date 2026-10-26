import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const workflow = read('.github/workflows/ums23-external-validation.yml');
const protocol = read('docs/ums23-external-proof-protocol.md');
const preparer = read('scripts/prepare-external-vite-falsification.ts');

describe('UMS-23 external proof execution boundary', () => {
  test('is a manual opt-in rather than automatic execution of third-party code', () => {
    expect(workflow).toMatch(/\bon:\n  workflow_dispatch:\n/);
    expect(workflow).not.toMatch(/^  (?:push|pull_request|schedule|repository_dispatch):/m);
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toMatch(/expected_sha:\n\s+description:/);
    expect(workflow).toContain('test "$EXPECTED_SHA" = "$ACTUAL_SHA"');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"');
    expect(workflow).not.toMatch(/\$\{\{\s*secrets\.|vercel\s+(?:deploy|promote|rollback)|--prod|force[- ]promote/i);
    expect(protocol).toContain('separate, explicit owner decision');
  });

  test('pins upstream and foundation and runs the existing real browser falsification test', () => {
    expect(workflow).toContain('https://github.com/larry-xue/react-admin-dashboard.git');
    expect(workflow).toContain('8223897259151c450f954e462c57df3703d5508d');
    expect(preparer).toContain('8223897259151c450f954e462c57df3703d5508d');
    expect(workflow).toContain('npm run external:prepare');
    expect(workflow).toContain('npm run test:e2e:external');
    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow).toContain('git diff --exit-code');
  });

  test('does not claim a successful new external run without its runtime evidence', () => {
    expect(protocol).toContain('no fresh external rerun claimed');
    expect(protocol).toContain('not broad compatibility evidence');
    expect(protocol).toContain('Failure is valid evidence');
  });
});
