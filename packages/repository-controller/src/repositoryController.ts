import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

export interface RepositoryInspection { repositoryPath: string; branches: string[]; clean: boolean }
export class RepositoryController {
  constructor(readonly repositoryPath: string) {}
  private async git(args: string[]) { return (await execFileAsync('git', args, { cwd: this.repositoryPath, encoding: 'utf8' })).stdout.trim(); }
  async resolveRef(ref: string) {
    if (!/^[A-Za-z0-9._/-]+$/.test(ref) || ref.startsWith('-') || ref.includes('..')) throw new Error(`Invalid branch: ${ref}`);
    try { return await this.git(['rev-parse', '--verify', `${ref}^{commit}`]); }
    catch { throw new Error(`Invalid branch: ${ref}`); }
  }
  async inspect(): Promise<RepositoryInspection> {
    await this.git(['rev-parse', '--is-inside-work-tree']);
    const branches = (await this.git(['for-each-ref', '--format=%(refname:short)', 'refs/heads/'])).split(/\r?\n/).filter(Boolean).sort();
    const clean = (await this.git(['status', '--porcelain'])) === '';
    return { repositoryPath: resolve(this.repositoryPath), branches, clean };
  }
  async createWorktree(branch: string) {
    const inspection = await this.inspect();
    if (!inspection.clean) throw new Error('Repository is dirty; preview startup is refused.');
    if (!inspection.branches.includes(branch)) throw new Error(`Invalid branch: ${branch}`);
    const path = await mkdtemp(join(tmpdir(), 'ui-merge-studio-preview-'));
    try { await this.git(['worktree', 'add', '--detach', path, branch]); return path; }
    catch (error) { await rm(path, { recursive: true, force: true }); throw error; }
  }
  async removeWorktree(path: string) {
    const expected = resolve(tmpdir()); const target = resolve(path);
    if (!target.startsWith(`${expected}\\ui-merge-studio-preview-`) && !target.startsWith(`${expected}/ui-merge-studio-preview-`)) throw new Error(`Refusing to remove unrecognized worktree: ${target}`);
    await this.git(['worktree', 'remove', '--force', target]);
    await rm(target, { recursive: true, force: true });
  }
}
