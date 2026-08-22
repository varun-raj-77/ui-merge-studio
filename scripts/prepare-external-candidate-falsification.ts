import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(import.meta.dirname, '..');
const defaultSource = 'C:/Users/rekha/OneDrive/Documents/ui-merge-vite-validation';
const source = resolve(process.env.UI_MERGE_EXTERNAL_SOURCE ?? defaultSource);
const managedRoot = resolve(workspaceRoot, '.validation-worktrees');
const output = resolve(process.env.UI_MERGE_EXTERNAL_CANDIDATE_REPOSITORY ?? resolve(managedRoot, 'prompt020-external-vite'));
const foundationCommit = '8223897259151c450f954e462c57df3703d5508d';
const featureBranch = 'prompt020-revenue-pulse';
const patches = [
  resolve(workspaceRoot, 'tests/external-vite/revenue-pulse.patch'),
  resolve(workspaceRoot, 'tests/external-feature-slice/revenue-pulse-dependencies.patch')
];

if (!existsSync(resolve(source, '.git'))) throw new Error(`External React/Vite repository is unavailable: ${source}`);
if (output !== managedRoot && !output.startsWith(`${managedRoot}\\`) && !output.startsWith(`${managedRoot}/`)) {
  throw new Error(`Refusing to replace external candidate output outside ${managedRoot}: ${output}`);
}

async function git(args: string[], cwd = workspaceRoot, environment: NodeJS.ProcessEnv = process.env) {
  const result = await execFileAsync('git', args, { cwd, env: environment, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, windowsHide: true });
  return result.stdout.trim();
}

await mkdir(dirname(output), { recursive: true });
await rm(output, { recursive: true, force: true });
await git(['-c', `safe.directory=${source.replaceAll('\\', '/')}`, 'clone', '--no-hardlinks', '--no-checkout', source, output]);
await git(['checkout', '--detach', foundationCommit], output);
await git(['config', 'user.name', 'UI Merge external candidate proof'], output);
await git(['config', 'user.email', 'external-candidate@ui-merge.invalid'], output);
await git(['switch', '-C', 'main'], output);
await git(['switch', '-c', featureBranch], output);
for (const patch of patches) await git(['apply', '--recount', '--index', patch], output);
await git(['commit', '-m', 'feat: add revenue pulse with unrelated footer experiment'], output, {
  ...process.env,
  GIT_AUTHOR_DATE: '2026-08-22T18:00:00Z',
  GIT_COMMITTER_DATE: '2026-08-22T18:00:00Z'
});
const featureCommit = await git(['rev-parse', featureBranch], output);
await git(['switch', 'main'], output);
const status = await git(['status', '--short'], output);
if (status) throw new Error(`Prepared external candidate repository is not clean:\n${status}`);

console.log(JSON.stringify({ source, output, foundationCommit, baseBranch: 'main', featureBranch, featureCommit, candidateBranch: 'combined-result' }, null, 2));
