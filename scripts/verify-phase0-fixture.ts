import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { branches, generated, git } from './fixture-lib';

export function verifyFixture(repo = generated) {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => { if (!condition) failures.push(message); };
  check(existsSync(resolve(repo, '.git')), 'generated fixture repository is missing');
  if (failures.length) throw new Error(failures.join('\n'));
  check(git(repo, ['status', '--porcelain']) === '', 'working tree must be clean');
  const existing = git(repo, ['branch', '--format=%(refname:short)']).split(/\r?\n/);
  for (const branch of branches) check(existing.includes(branch), `missing branch: ${branch}`);
  check(!existing.includes('combined-result'), 'combined-result branch is forbidden');
  const tags = git(repo, ['tag', '--list']).split(/\r?\n/).filter(Boolean);
  check(tags.length === 0, 'tags are forbidden in the controlled fixture');
  if (failures.length) throw new Error(failures.join('\n'));
  const base = git(repo, ['rev-parse', 'main']);
  for (const branch of ['branch-sidebar', 'branch-inspector']) {
    check(git(repo, ['merge-base', 'main', branch]) === base, `${branch} does not use the exact main base`);
    check(git(repo, ['rev-list', '--count', `main..${branch}`]) === '1', `${branch} must be exactly one commit ahead`);
  }
  const sidebarDiff = git(repo, ['show', '--format=', 'branch-sidebar']);
  check(sidebarDiff.includes('Operations Command Center'), 'sidebar commit lacks unrelated heading change');
  check(sidebarDiff.includes('sidebarStorageKey') && sidebarDiff.includes('Collapse sidebar'), 'sidebar commit lacks useful behavior');
  check(sidebarDiff.includes("persists state"), 'sidebar commit lacks supporting behavior test');
  const inspectorDiff = git(repo, ['show', '--format=', 'branch-inspector']);
  check(inspectorDiff.includes('sortTicketsNewestFirst'), 'inspector commit lacks unrelated sorting change');
  check(inspectorDiff.includes('Copy reference') && inspectorDiff.includes('Activity filters'), 'inspector commit lacks useful behavior');
  check(inspectorDiff.includes('clipboard failure'), 'inspector commit lacks supporting behavior test');
  const trackedNames = branches.flatMap(branch => git(repo, ['ls-tree', '-r', '--name-only', branch]).split(/\r?\n/));
  const forbidden = trackedNames.filter(name => /(?:\.patch$|combined-result|feature-manifest|selected-slice)/i.test(name));
  check(forbidden.length === 0, `forbidden prepared artifacts: ${forbidden.join(', ')}`);
  const sidebarNames = git(repo, ['diff', '--name-only', 'main..branch-sidebar']);
  const inspectorNames = git(repo, ['diff', '--name-only', 'main..branch-inspector']);
  check(sidebarNames.includes('src/hooks/useSidebarState.ts') && sidebarNames.includes('src/test/sidebar.test.tsx'), 'sidebar commit lacks required supporting source or test');
  check(inspectorNames.includes('src/utils/sortTickets.ts') && inspectorNames.includes('src/test/inspector.test.tsx'), 'inspector commit lacks required sorting change source or test');
  check(!sidebarNames.includes('ActivityFilters'), 'sidebar contains inspector behavior');
  check(!inspectorNames.includes('useSidebarState'), 'inspector contains sidebar behavior');
  if (failures.length) throw new Error(failures.join('\n'));

  for (const [branch, evidence] of [['branch-sidebar', 'Operations Command Center'], ['branch-inspector', 'sortTicketsNewestFirst']] as const) {
    const temp = mkdtempSync(resolve(tmpdir(), 'phase0-cherry-'));
    try { git(temp, ['clone', '--quiet', '--no-hardlinks', repo, '.']); git(temp, ['checkout', '--quiet', 'main']); git(temp, ['config', 'user.name', 'Verifier']); git(temp, ['config', 'user.email', 'verifier@example.invalid']); git(temp, ['cherry-pick', git(repo, ['rev-parse', branch])]); const sources = git(temp, ['grep', '-n', evidence]); check(Boolean(sources), `${branch} cherry-pick lacks mixed evidence`); } finally { rmSync(temp, { recursive: true, force: true }); }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log(`PASS: fixture contract verified at ${repo}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) verifyFixture();
