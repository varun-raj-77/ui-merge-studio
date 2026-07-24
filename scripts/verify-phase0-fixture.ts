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
  const hasCandidate = existing.includes('combined-result');
  const tags = git(repo, ['tag', '--list']).split(/\r?\n/).filter(Boolean);
  check(tags.length === 0, 'tags are forbidden in the controlled fixture');
  if (failures.length) throw new Error(failures.join('\n'));
  const base = git(repo, ['rev-parse', 'main']);
  for (const branch of ['branch-sidebar', 'branch-inspector']) {
    check(git(repo, ['merge-base', 'main', branch]) === base, `${branch} does not use the exact main base`);
    check(git(repo, ['rev-list', '--count', `main..${branch}`]) === '1', `${branch} must be exactly one commit ahead`);
  }
  if (hasCandidate) {
    check(git(repo,['merge-base','main','combined-result'])===base,'combined-result must start from the exact main base');
    const candidateCount=git(repo,['rev-list','--count','main..combined-result']);check(candidateCount==='1','combined-result must be exactly one verified generated commit ahead');
    if(candidateCount==='1') {
      check(git(repo,['rev-parse','combined-result^'])===base,'combined-result parent must be the exact main commit');
      const candidateSource=git(repo,['show','combined-result:src/features/navigation/AppSidebar.tsx']);const candidateInspector=git(repo,['show','combined-result:src/features/tickets/ActivityFilters.tsx']);const candidatePage=git(repo,['show','combined-result:src/features/tickets/TicketPage.tsx']);const candidateTest=git(repo,['show','combined-result:src/test/inspector.test.tsx']);
      check(candidateSource.includes('Collapse sidebar')&&candidateInspector.includes('Activity filters'),'combined-result lacks selected feature source');
      check(candidatePage.includes('Support Tickets')&&!candidatePage.includes('Operations Command Center'),'combined-result contains the unrelated heading change');
      check(!git(repo,['ls-tree','-r','--name-only','combined-result']).split(/\r?\n/).includes('src/utils/sortTickets.ts'),'combined-result contains the unrelated sorting implementation');
      check(!candidateTest.includes('sorts ticket list newest first'),'combined-result contains the unrelated sorting test');
      const candidateNames=git(repo,['diff','--name-only','main..combined-result']).split(/\r?\n/);check(!candidateNames.some(name=>name.startsWith('dist/')||name.startsWith('.ums/')||name==='node_modules'),'combined-result tracks generated runtime/build output');
    }
  }
  const sidebarDiff = git(repo, ['show', '--format=', 'branch-sidebar']);
  for (const branch of ['main', 'branch-sidebar', 'branch-inspector', 'branch-incompatible-route']) {
    const sidebarSource = git(repo, ['show', `${branch}:src/features/navigation/AppSidebar.tsx`]);
    check(sidebarSource.includes('Sample Support Desk'), `${branch} lacks deterministic demo branding`);
    check(sidebarSource.includes('Demo application · Fake ticket data'), `${branch} lacks deterministic fake-data context`);
    check(!sidebarSource.includes('Beacon Ops'), `${branch} retains obsolete demo branding`);
  }
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
