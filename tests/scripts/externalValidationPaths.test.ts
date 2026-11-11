import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { defaultExternalViteSource, validateExternalCheckoutOutput } from '../../scripts/external-validation-paths';

const workspace = resolve('disposable-ums-validation-workspace');
const root = join(workspace, '.validation-worktrees');

test('uses the same public pinned-upstream source for fresh external candidate preparation', () => {
  expect(defaultExternalViteSource).toBe('https://github.com/larry-xue/react-admin-dashboard.git');
});

test('allows a direct disposable checkout below the validation root', () => {
  const candidate = join(root, 'prompt020-external-vite');
  expect(validateExternalCheckoutOutput(workspace, candidate)).toBe(candidate);
});

test.each([
  ['the validation root itself', root],
  ['a sibling with a deceptive prefix', join(workspace, '.validation-worktrees-old')],
  ['a nested checkout below a subdirectory', join(root, 'nested', 'candidate')],
  ['a checkout outside the workspace', resolve(workspace, '..', 'different-workspace', 'candidate')],
  ['a traversal that resolves back to the validation root', join(root, 'candidate', '..')]
])('refuses to remove %s', (_case, target) => {
  expect(() => validateExternalCheckoutOutput(workspace, target)).toThrow(
    /Refusing to replace external validation output/
  );
});
