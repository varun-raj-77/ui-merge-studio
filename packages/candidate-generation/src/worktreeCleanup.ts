import { realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

type GitCommand = (args: string[]) => Promise<string>;

async function isRegisteredWorktree(porcelain: string, target: string) {
  // Git can report the real path of a symlinked OS temp directory (notably on macOS).
  // Resolve parent directories so this stays accurate even if Git partially removed target.
  const canonicalTarget = resolve(await realpath(dirname(target)), basename(target));
  for (const line of porcelain.split(/\r?\n/)) {
    if (!line.startsWith('worktree ')) continue;
    const listed = line.slice('worktree '.length);
    if (basename(listed) !== basename(target)) continue;
    const canonicalListed = resolve(await realpath(dirname(listed)), basename(listed));
    if (canonicalListed === canonicalTarget) return true;
  }
  return false;
}

function isTransientRemovalError(error: unknown) {
  const details = error instanceof Error ? `${error.message} ${'stderr' in error ? String(error.stderr) : ''}` : String(error);
  return /\bENOTEMPTY\b|Directory not empty/i.test(details);
}

/** Remove only our disposable candidate worktree, including an orphan after a partial Git removal. */
export async function removeTemporaryCandidateWorktree(path: string, git: GitCommand) {
  const target = resolve(path);
  if (dirname(target) !== resolve(tmpdir()) || !/^ui-merge-studio-candidate-[a-zA-Z0-9_-]+$/.test(basename(target))) {
    throw new Error(`Refusing to remove unrecognized candidate worktree ${target}.`);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await git(['worktree', 'remove', '--force', target]);
      break;
    } catch (error) {
      if (!isTransientRemovalError(error)) throw error;
      // Git can deregister a worktree before reporting ENOTEMPTY while a process exits.
      // Never treat it as removed if Git still owns the path.
      const porcelain = await git(['worktree', 'list', '--porcelain']);
      if (!await isRegisteredWorktree(porcelain, target)) break;
      if (attempt === 2) throw error;
      await delay(75 * (attempt + 1));
    }
  }

  await rm(target, { recursive: true, force: true });
}
