import { execFile } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(import.meta.dirname, '..');
const source = process.env.UI_MERGE_EXTERNAL_SOURCE ?? 'https://github.com/larry-xue/react-admin-dashboard.git';
const managedRoot = resolve(workspaceRoot, '.validation-worktrees');
const output = resolve(process.env.UI_MERGE_EXTERNAL_SLICE_REPOSITORY ?? resolve(managedRoot, 'prompt019-external-vite'));
const foundationCommit = '8223897259151c450f954e462c57df3703d5508d';
const foundationBranch = 'prompt019-foundation';
const featureBranch = 'prompt019-revenue-pulse';
const patches = [
  resolve(workspaceRoot, 'tests/external-vite/revenue-pulse.patch'),
  resolve(workspaceRoot, 'tests/external-feature-slice/revenue-pulse-dependencies.patch')
];

if (output !== managedRoot && !output.startsWith(`${managedRoot}\\`) && !output.startsWith(`${managedRoot}/`)) {
  throw new Error(`Refusing to replace external feature-slice output outside ${managedRoot}: ${output}`);
}

async function git(args: string[], cwd = workspaceRoot, environment: NodeJS.ProcessEnv = process.env) {
  const result = await execFileAsync('git', args, { cwd, env: environment, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, windowsHide: true });
  return result.stdout.trim();
}

await mkdir(dirname(output), { recursive: true });
await rm(output, { recursive: true, force: true });
await git(['clone', '--no-hardlinks', '--no-checkout', source, output]);
await git(['checkout', '--detach', foundationCommit], output);
await git(['config', 'user.name', 'UI Merge external slice proof'], output);
await git(['config', 'user.email', 'external-slice@ui-merge.invalid'], output);
await git(['switch', '-C', foundationBranch], output);
await git(['switch', '-C', featureBranch], output);
for (const patch of patches) await git(['apply', '--recount', '--index', patch], output);
await git(['commit', '-m', 'feat: add revenue pulse feature slice proof'], output, {
  ...process.env,
  GIT_AUTHOR_DATE: '2026-08-22T17:00:00Z',
  GIT_COMMITTER_DATE: '2026-08-22T17:00:00Z'
});
const featureCommit = await git(['rev-parse', featureBranch], output);
await git(['switch', foundationBranch], output);
const status = await git(['status', '--short'], output);
if (status) throw new Error(`Prepared external feature-slice repository is not clean:\n${status}`);

console.log(JSON.stringify({ source, output, foundationCommit, foundationBranch, featureBranch, featureCommit }, null, 2));
