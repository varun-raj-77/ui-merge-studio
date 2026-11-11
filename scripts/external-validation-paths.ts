import { basename, dirname, resolve } from 'node:path';

/** The common public upstream, still checked out at each script's pinned foundation commit. */
export const defaultExternalViteSource = 'https://github.com/larry-xue/react-admin-dashboard.git';

/**
 * These scripts discard and recreate an entire checkout. Only an immediate child
 * of the app-managed validation root may be replaced; never the root itself,
 * its siblings, or a nested user-supplied checkout.
 */
export function validateExternalCheckoutOutput(workspaceRoot: string, output: string) {
  const managedRoot = resolve(workspaceRoot, '.validation-worktrees');
  const target = resolve(output);
  if (dirname(target) !== managedRoot || !basename(target)) {
    throw new Error(`Refusing to replace external validation output outside a direct child of ${managedRoot}: ${target}`);
  }
  return target;
}
