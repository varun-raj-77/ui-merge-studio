import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { RepositoryController } from '../../packages/repository-controller/src/repositoryController';
import { allocatePort, createPreviewIdentity, PreviewController } from '../../packages/preview-runtime/src/previewController';
const paths: string[] = [];
function tempGit(path: string, args: string[]) { return execFileSync('git', ['--git-dir', resolve(path, '.git'), '--work-tree', path, ...args], { cwd: path }); }
function repo() { const path = mkdtempSync(resolve(tmpdir(), 'ums-repo-')); paths.push(path); execFileSync('git', ['init', '-b', 'main', path]); writeFileSync(resolve(path, 'README.md'), 'fixture'); tempGit(path, ['add', '.']); tempGit(path, ['-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','base']); tempGit(path, ['update-ref', 'refs/heads/candidate', 'HEAD']); return path; }
afterEach(() => paths.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));
describe('preview repository control', () => {
  test('inspects explicit branches and creates/removes an isolated worktree', async () => { const controller = new RepositoryController(repo()); expect((await controller.inspect()).branches).toEqual(['candidate','main']); const path = await controller.createWorktree('candidate'); expect(path).toContain('ui-merge-studio-preview-'); await controller.removeWorktree(path); });
  test('refuses missing, dirty, and invalid repositories or branches', async () => { await expect(new RepositoryController(resolve(tmpdir(), 'missing-ums')).inspect()).rejects.toThrow(); const path = repo(); writeFileSync(resolve(path, 'dirty.txt'), 'dirty'); await expect(new RepositoryController(path).createWorktree('main')).rejects.toThrow('dirty'); const clean = repo(); await expect(new RepositoryController(clean).createWorktree('sidebar-by-semantics')).rejects.toThrow('Invalid branch'); });
  test('allocates available ports and recovers from an occupied port', async () => { const occupied = await allocatePort(); const server = createServer().listen(occupied, '127.0.0.1'); const recovered = await allocatePort(); expect(recovered).not.toBe(occupied); await new Promise<void>(accept => server.close(() => accept())); });
  test('reports startup failure before creating a child for an invalid branch', async () => { const controller = new PreviewController(new RepositoryController(repo()), resolve('missing-config.ts')); await expect(controller.start('missing')).rejects.toThrow('Invalid branch'); expect(controller.session()).toBeNull(); await controller.stop(); });
  test('creates session identities that include controller slot, ref, generation, and unique session ID', () => { expect(createPreviewIdentity('left', 'main', 3, () => 'uuid-1')).toEqual({ previewId: 'left', branch: 'main', generation: 3, sessionId: 'uuid-1' }); expect(() => createPreviewIdentity('left', 'main', 0)).toThrow('valid preview identity'); });
});
