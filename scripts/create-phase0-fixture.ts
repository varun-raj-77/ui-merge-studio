import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { generated, git, isDirtyRepo, overlay, removeGenerated } from './fixture-lib';

const targetArg = process.argv.find(arg => arg.startsWith('--target='));
const target = targetArg ? resolve(targetArg.slice('--target='.length)) : generated;
const recreate = process.argv.includes('--recreate');

if (existsSync(target)) {
  if (isDirtyRepo(target)) throw new Error(`Refusing to overwrite dirty generated fixture: ${target}`);
  if (!recreate) throw new Error(`Target exists. Pass --recreate after confirming it is disposable: ${target}`);
  if (target !== generated) throw new Error('--recreate is restricted to the standard generated fixture path');
  removeGenerated(target);
}
mkdirSync(target, { recursive: true });
overlay('base', target);
git(target, ['init', '-b', 'main']);
git(target, ['config', 'user.name', 'Phase 0 Fixture']);
git(target, ['config', 'user.email', 'phase0-fixture@example.invalid']);
git(target, ['add', '.']);
git(target, ['commit', '-m', 'Establish product catalogue baseline']);
const base = git(target, ['rev-parse', 'HEAD']);

function variation(branch: string, overlayName: string, message: string) {
  git(target, ['checkout', '-b', branch, base]);
  overlay(overlayName, target);
  git(target, ['add', '-A']);
  // Re-hash same-size replacements on Windows where checkout and overlay writes
  // can share a coarse filesystem timestamp and otherwise look racily clean.
  git(target, ['add', '--renormalize', '.']);
  git(target, ['commit', '-m', message]);
}
variation('branch-a', 'branch-a', 'Add category filter sidebar');
variation('branch-b', 'branch-b', 'Add product quick view');
variation('branch-incompatible', 'branch-incompatible', 'Change product identity contract');
git(target, ['checkout', 'main']);
console.log(`Fixture: ${target}`);
for (const branch of ['main', 'branch-a', 'branch-b', 'branch-incompatible']) console.log(`${branch}: ${git(target, ['rev-parse', branch])}`);
console.log('Verify with: npm run fixture:verify');
