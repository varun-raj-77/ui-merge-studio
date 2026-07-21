import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '..');
export const template = resolve(root, 'fixtures/support-dashboard-template');
export const generated = resolve(root, 'fixtures/generated/support-dashboard');
export const branches = ['main', 'branch-sidebar', 'branch-inspector', 'branch-incompatible-route'] as const;
export function git(cwd: string, args: string[]) { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
export function run(cwd: string, command: string, args: string[]) { execFileSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' }); }
export function copyTree(source: string, target: string) { mkdirSync(dirname(target), { recursive: true }); cpSync(source, target, { recursive: true, force: true }); }
export function overlay(name: string, target = generated) { copyTree(resolve(template, name), target); }
export function isDirtyRepo(path: string) { return existsSync(resolve(path, '.git')) && git(path, ['status', '--porcelain']).length > 0; }
export function filesRecursive(path: string): string[] { return readdirSync(path).flatMap(name => { const item = resolve(path, name); return lstatSync(item).isDirectory() ? filesRecursive(item) : [item]; }); }
export function text(path: string) { return readFileSync(path, 'utf8'); }
export function removeGenerated(path: string) { const expectedParent = resolve(root, 'fixtures/generated'); const resolved = resolve(path); if (dirname(resolved) !== expectedParent || !statSync(expectedParent).isDirectory()) throw new Error(`Refusing unsafe removal: ${resolved}`); rmSync(resolved, { recursive: true, force: true }); }

