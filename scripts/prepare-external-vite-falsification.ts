import { execFile } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(import.meta.dirname, '..');
const source = process.env.UI_MERGE_EXTERNAL_SOURCE ?? 'https://github.com/larry-xue/react-admin-dashboard.git';
const output = resolve(process.env.UI_MERGE_EXTERNAL_REPOSITORY ?? resolve(workspaceRoot, '.validation-worktrees/prompt015-external-vite'));
const managedRoot = resolve(workspaceRoot, '.validation-worktrees');
const foundationCommit = '8223897259151c450f954e462c57df3703d5508d';
const patches = [
  { branch: 'prompt014-workspace-status', file: resolve(workspaceRoot, 'tests/external-vite/workspace-status.patch'), date: '2026-08-14T12:00:00Z' },
  { branch: 'prompt014-revenue-pulse', file: resolve(workspaceRoot, 'tests/external-vite/revenue-pulse.patch'), date: '2026-08-14T12:01:00Z' }
];

if (output !== managedRoot && !output.startsWith(`${managedRoot}\\`) && !output.startsWith(`${managedRoot}/`)) {
  throw new Error(`Refusing to replace external validation output outside ${managedRoot}: ${output}`);
}

async function git(args: string[], cwd = workspaceRoot, environment: NodeJS.ProcessEnv = process.env) {
  const result = await execFileAsync('git', args, { cwd, env: environment, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, windowsHide: true });
  return result.stdout.trim();
}

await mkdir(dirname(output), { recursive: true });
await rm(output, { recursive: true, force: true });
await git(['clone', '--no-hardlinks', '--no-checkout', source, output]);
await git(['checkout', '--detach', foundationCommit], output);
await git(['config', 'user.name', 'UI Merge external falsification'], output);
await git(['config', 'user.email', 'external-falsification@ui-merge.invalid'], output);

for (const item of patches) {
  await git(['checkout', '--detach', foundationCommit], output);
  await git(['switch', '-c', item.branch], output);
  await git(['apply', '--recount', '--index', item.file], output);
  const environment = {
    ...process.env,
    GIT_AUTHOR_DATE: item.date,
    GIT_COMMITTER_DATE: item.date
  };
  await git(['commit', '-m', `feat: ${item.branch.replace('prompt014-', '').replaceAll('-', ' ')}`], output, environment);
}

await git(['checkout', '--detach', foundationCommit], output);
await git(['switch', '-c', 'prompt014-foundation'], output);
const status = await git(['status', '--short'], output);
if (status) throw new Error(`Prepared repository is not clean:\n${status}`);

const identities = Object.fromEntries(await Promise.all([
  'prompt014-foundation',
  ...patches.map(item => item.branch)
].map(async branch => [branch, await git(['rev-parse', branch], output)])));

console.log(JSON.stringify({ source, output, foundationCommit, identities }, null, 2));
