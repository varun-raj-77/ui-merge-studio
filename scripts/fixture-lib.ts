import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, relative, resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '..');
export const template = resolve(root, 'fixtures/product-catalogue-template');
export const generated = resolve(root, 'fixtures/generated/product-catalogue');
export const branches = ['main', 'branch-a', 'branch-b', 'branch-incompatible'] as const;
export function git(cwd: string, args: string[]) { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
export function run(cwd: string, command: string, args: string[]) { execFileSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' }); }
export function copyTree(source: string, target: string) {
  for (const file of filesRecursive(source)) {
    const destination = resolve(target, relative(source, file));
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(file, destination);
  }
}
export function overlay(name: string, target = generated) {
  const source = resolve(template, name);
  copyTree(source, target);
  for (const file of filesRecursive(source)) {
    const destination = resolve(target, relative(source, file));
    if (!readFileSync(file).equals(readFileSync(destination))) throw new Error(`Fixture overlay copy mismatch: ${relative(source, file)}`);
  }
}
export function isDirtyRepo(path: string) { return existsSync(resolve(path, '.git')) && git(path, ['status', '--porcelain']).length > 0; }
export function filesRecursive(path: string): string[] { return readdirSync(path).flatMap(name => { const item = resolve(path, name); return lstatSync(item).isDirectory() ? filesRecursive(item) : [item]; }); }
export function text(path: string) { return readFileSync(path, 'utf8'); }
export function removeGenerated(path: string) { const expectedParent = resolve(root, 'fixtures/generated'); const resolved = resolve(path); if (dirname(resolved) !== expectedParent || !statSync(expectedParent).isDirectory()) throw new Error(`Refusing unsafe removal: ${resolved}`); rmSync(resolved, { recursive: true, force: true }); }
