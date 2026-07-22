import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

const roots: string[] = [];
export function createRepository(files: Record<string, string | Buffer>) { const root = mkdtempSync(resolve(tmpdir(), 'ums-analysis-')); roots.push(root); execFileSync('git', ['init','-b','main',root]); writeFiles(root, files); git(root, ['add','.']); git(root, ['-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','base']); return root; }
export function writeFiles(root: string, files: Record<string, string | Buffer>) { for (const [path, content] of Object.entries(files)) { const target = resolve(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content); } }
export function git(root: string, args: string[]) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
export function commit(root: string, message = 'change') { git(root, ['add','-A']); git(root, ['-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m',message]); return git(root, ['rev-parse','HEAD']); }
export function cleanupRepositories() { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); }
