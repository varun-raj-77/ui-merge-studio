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
git(target, ['commit', '-m', 'Establish dashboard baseline']);
const base = git(target, ['rev-parse', 'HEAD']);

function variation(branch: string, overlayName: string, message: string) {
  git(target, ['checkout', '-b', branch, base]);
  overlay(overlayName, target);
  git(target, ['add', '.']);
  git(target, ['commit', '-m', message]);
}
variation('branch-sidebar', 'sidebar', 'Implement sidebar branch variation');
variation('branch-inspector', 'inspector', 'Implement inspector branch variation');
variation('branch-incompatible-route', 'incompatible', 'Implement path-route branch variation');
git(target, ['checkout', 'main']);
console.log(`Fixture: ${target}`);
for (const branch of ['main', 'branch-sidebar', 'branch-inspector', 'branch-incompatible-route']) console.log(`${branch}: ${git(target, ['rev-parse', branch])}`);
console.log('Verify with: npm run fixture:verify');

