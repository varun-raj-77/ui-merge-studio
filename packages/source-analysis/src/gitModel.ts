import { execFile } from 'node:child_process';
import { posix } from 'node:path';
import { promisify } from 'node:util';
import type { ChangedFile, SourceRegion } from './types';

const execFileAsync = promisify(execFile);
export function validateRepositoryPath(path: string) { const normalized = path.replaceAll('\\', '/'); if (!normalized || normalized.startsWith('/') || normalized.includes('\0') || normalized.split('/').some(part => part === '..' || part === '')) throw new Error(`Unsafe repository-relative path: ${path}`); return posix.normalize(normalized); }

export class GitSourceRepository {
  constructor(readonly root: string) {}
  async git(args: string[]) { return (await execFileAsync('git', args, { cwd: this.root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })).stdout.trim(); }
  async resolveRef(ref: string) { if (!/^[A-Za-z0-9._/-]+$/.test(ref) || ref.startsWith('-') || ref.includes('..')) throw new Error(`Unsafe Git ref: ${ref}`); return this.git(['rev-parse', '--verify', `${ref}^{commit}`]); }
  async mergeBase(baseRef: string, branchRef: string) { return this.git(['merge-base', baseRef, branchRef]); }
  async listFiles(commit: string) { const output = await this.git(['ls-tree', '-r', '--name-only', '-z', commit]); return output.split('\0').filter(Boolean).map(validateRepositoryPath).sort(); }
  async readFile(commit: string, path: string) { return this.git(['show', `${commit}:${validateRepositoryPath(path)}`]); }
  async fileExists(commit: string, path: string) { try { await this.readFile(commit, path); return true; } catch { return false; } }
  async changedFiles(baseCommit: string, branchCommit: string): Promise<ChangedFile[]> {
    const output = await this.git(['diff', '--name-status', '--find-renames', '-z', baseCommit, branchCommit]);
    const tokens = output.split('\0').filter(Boolean); const result: ChangedFile[] = [];
    for (let index = 0; index < tokens.length;) {
      const rawStatus = tokens[index++]; const code = rawStatus[0];
      let previousPath: string | null = null; let path: string;
      if (code === 'R') { previousPath = validateRepositoryPath(tokens[index++]); path = validateRepositoryPath(tokens[index++]); }
      else path = validateRepositoryPath(tokens[index++]);
      let status: ChangedFile['status'] = code === 'A' ? 'added' : code === 'M' ? 'modified' : code === 'D' ? 'deleted' : code === 'R' ? 'renamed' : 'unsupported';
      if (status !== 'deleted' && await this.isBinaryChange(baseCommit, branchCommit, path)) status = 'binary';
      const hunks = status === 'deleted' ? [] : await this.changedHunks(baseCommit, branchCommit, path);
      result.push({ path, previousPath, status, hunks });
    }
    return result.sort((left, right) => left.path.localeCompare(right.path));
  }
  async isBinaryChange(baseCommit: string, branchCommit: string, path: string) { const output = await this.git(['diff', '--numstat', baseCommit, branchCommit, '--', validateRepositoryPath(path)]); return output.split(/\r?\n/).some(line => line.startsWith('-\t-\t')); }
  async changedHunks(baseCommit: string, branchCommit: string, path: string): Promise<SourceRegion[]> {
    const patch = await this.git(['diff', '--unified=0', '--no-color', baseCommit, branchCommit, '--', validateRepositoryPath(path)]);
    if (/^Binary files /m.test(patch)) return [];
    const regions: SourceRegion[] = [];
    for (const line of patch.split(/\r?\n/)) { const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/); if (match) { const startLine = Number(match[1]); const count = Number(match[2] ?? 1); regions.push({ startLine, endLine: count === 0 ? startLine : startLine + count - 1 }); } }
    return regions;
  }
}
