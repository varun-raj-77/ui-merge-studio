import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { LocalPlanAuthority, localRepositoryId } from '../../apps/studio/localPlanAuthority';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { FeatureSliceAnalyzer, FeatureSliceRefusal } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { instrumentReactSource } from '../../packages/source-instrumentation/src/instrumentReactSource';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from './testRepository';

afterEach(cleanupRepositories);

function preview(root: string, branch: string, branchCommit: string): PreviewSession {
  return { previewId: 'left', branch, repositoryPath: root, commit: branchCommit, branchCommit, packageManager: 'npm', generation: 1, sessionId: 'external-feature-session', protocolVersion: 2, url: 'http://127.0.0.1:5190', origin: 'http://127.0.0.1:5190', port: 5190, processId: 5190, worktreePath: root, status: 'running', failure: null };
}

async function trustedSelection(root: string, branch: string, branchCommit: string, path: string, componentName: string) {
  const current = preview(root, branch, branchCommit);
  const repository = new GitSourceRepository(root);
  const source = await repository.readFile(branchCommit, path);
  const selectionReceipt = `rendered-${'r'.repeat(32)}`;
  const instrumented = instrumentReactSource(source, resolve(root, path), { repositoryRoot: root, branch, selectionReceipt: () => selectionReceipt });
  const mapping = instrumented?.boundaries.find(item => item.source.componentName === componentName);
  if (!mapping) throw new Error(`Instrumentation did not find ${componentName} in ${path}.`);
  const authority = new LocalPlanAuthority(root, localRepositoryId(root), 'main', 'unused-candidate', () => current, () => [current]);
  authority.registerInstrumentedBoundaries(current, [mapping]);
  return { authority, preview: current, receipt: mapping.selectionReceipt, selection: authority.resolveRenderedSelection(current, mapping.selectionReceipt) };
}

async function analyzeSelected(root: string, branchCommit: string, path: string, componentName: string) {
  const trusted = await trustedSelection(root, 'feature', branchCommit, path, componentName);
  const request = { baseRef: 'main', branchRef: 'feature', expectedBranchCommit: branchCommit, selection: trusted.selection };
  return { trusted, request, artifact: await new FeatureSliceAnalyzer(root).analyzeExternal(request) };
}

function baseRepository() {
  return createRepository({
    'package.json': '{"scripts":{"dev":"vite"},"dependencies":{"@vitejs/plugin-react":"latest","react":"latest","vite":"latest"}}\n',
    'vite.config.ts': "import react from '@vitejs/plugin-react'; import { defineConfig } from 'vite'; export default defineConfig({plugins:[react()]});\n",
    'src/App.tsx': "export function App(){return <main>Dashboard</main>}\n"
  });
}

describe('strict external React TypeScript Vite feature slices', () => {
  test('creates a deterministic source-graph artifact and excludes unrelated branch changes and exports', async () => {
    const root = baseRepository(); git(root, ['switch', '-c', 'feature']);
    writeFiles(root, {
      'src/App.tsx': "import { RevenuePulse } from './features/revenue/RevenuePulse';\nexport function App(){return <main><h1>Dashboard</h1><RevenuePulse/></main>}\n",
      'src/features/revenue/RevenuePulse.tsx': "import pulseIcon from './pulse.svg';\nimport './revenue-pulse.css';\nimport { useRevenuePulse } from './useRevenuePulse';\nexport function RevenuePulse(){const pulse=useRevenuePulse();return <section className=\"revenue-pulse\"><img src={pulseIcon} alt=\"\"/><strong>{pulse.label}</strong></section>}\n",
      'src/features/revenue/useRevenuePulse.ts': "import { useMemo } from 'react';\nimport { revenueStates, type RevenueState } from './revenueState';\nexport const useRevenuePulse=():RevenueState=>useMemo(()=>revenueStates.healthy,[]);\n",
      'src/features/revenue/revenueState.ts': "export interface RevenueState { label:string }\nexport const revenueStates:Record<'healthy',RevenueState>={healthy:{label:'Revenue pulse: healthy'}};\nexport const unrelatedRevenueExport='not selected';\n",
      'src/features/revenue/revenue-pulse.css': '.revenue-pulse{display:flex;gap:0.5rem}\n',
      'src/features/revenue/pulse.svg': '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="7"/></svg>\n',
      'src/features/forecast/ForecastPanel.tsx': "export function ForecastPanel(){return <aside>Unrelated forecast experiment</aside>}\n"
    });
    const branchCommit = commit(root, 'feat: add revenue pulse and unrelated forecast experiment');
    const { artifact, request } = await analyzeSelected(root, branchCommit, 'src/features/revenue/RevenuePulse.tsx', 'RevenuePulse');
    const replay = await new FeatureSliceAnalyzer(root).analyzeExternal(request);
    const includedPaths = new Set(artifact.slice.includedChanges.map(item => item.path));

    expect(artifact.slice.status, JSON.stringify(artifact.slice.unresolvedDependencies, null, 2)).toBe('resolved');
    expect(artifact.slice.selection).toBe(request.selection);
    expect(includedPaths).toEqual(new Set([
      'src/App.tsx',
      'src/features/revenue/RevenuePulse.tsx',
      'src/features/revenue/pulse.svg',
      'src/features/revenue/revenue-pulse.css',
      'src/features/revenue/revenueState.ts',
      'src/features/revenue/useRevenuePulse.ts'
    ]));
    expect(artifact.slice.includedChanges.map(item => item.category)).toEqual(expect.arrayContaining(['selected-definition', 'integration', 'hook', 'type', 'style', 'asset']));
    expect(artifact.slice.evidence.map(item => item.type)).toEqual(expect.arrayContaining(['imports-symbol', 'uses-type', 'imports-style', 'imports-asset']));
    expect(artifact.slice.excludedChanges).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'src/features/forecast/ForecastPanel.tsx', proof: 'proven' }),
      expect.objectContaining({ path: 'src/features/revenue/revenueState.ts', symbol: expect.objectContaining({ name: 'unrelatedRevenueExport' }), proof: 'proven' })
    ]));
    expect(replay).toEqual(artifact);
  });

  test('requires a trusted source identity before reading the dependency graph', async () => {
    const root = baseRepository();
    const analyzer = new FeatureSliceAnalyzer(root);
    await expect(analyzer.analyzeExternal({ baseRef: 'main', branchRef: 'main', expectedBranchCommit: git(root, ['rev-parse', 'HEAD']), selection: undefined } as unknown as { baseRef: string; branchRef: string; expectedBranchCommit: string; selection: SourceIdentity }))
      .rejects.toBeInstanceOf(FeatureSliceRefusal);
    await expect(analyzer.analyzeExternal({ baseRef: 'main', branchRef: 'main', expectedBranchCommit: git(root, ['rev-parse', 'HEAD']), selection: undefined } as unknown as { baseRef: string; branchRef: string; expectedBranchCommit: string; selection: SourceIdentity }))
      .rejects.toThrow(/trusted SourceIdentity is required/i);
  });

  test('refuses a stale rendered-selection receipt after the preview identity changes', async () => {
    const root = baseRepository(); git(root, ['switch', '-c', 'feature']);
    writeFiles(root, { 'src/RevenuePulse.tsx': "export function RevenuePulse(){return <section>Revenue pulse</section>}\n" });
    const branchCommit = commit(root); const trusted = await trustedSelection(root, 'feature', branchCommit, 'src/RevenuePulse.tsx', 'RevenuePulse');
    const restarted = { ...trusted.preview, sessionId: 'restarted-session', generation: trusted.preview.generation + 1 };
    expect(() => trusted.authority.resolveRenderedSelection(restarted, trusted.receipt)).toThrow(/unknown or stale/i);
  });

  test('refuses an ambiguous reverse integration dependency', async () => {
    const root = createRepository({
      'src/Shells.tsx': "export function Dashboard(){return <main/>}\nexport function Sidebar(){return <aside/>}\n"
    });
    git(root, ['switch', '-c', 'feature']);
    writeFiles(root, {
      'src/Shells.tsx': "import { RevenuePulse } from './RevenuePulse';\nexport function Dashboard(){return <main><RevenuePulse/></main>}\nexport function Sidebar(){return <aside><RevenuePulse/></aside>}\n",
      'src/RevenuePulse.tsx': "export function RevenuePulse(){return <section>Revenue pulse</section>}\n"
    });
    const branchCommit = commit(root); const { artifact } = await analyzeSelected(root, branchCommit, 'src/RevenuePulse.tsx', 'RevenuePulse');
    expect(artifact.slice.status).toBe('refused');
    expect(artifact.slice.unresolvedDependencies).toContainEqual(expect.objectContaining({ edge: 'ambiguous-dependency', reason: expect.stringContaining('2 supported reverse render paths') }));
  });

  test('refuses an unsupported dynamic import', async () => {
    const root = baseRepository(); git(root, ['switch', '-c', 'feature']);
    writeFiles(root, {
      'src/App.tsx': "import { RevenuePulse } from './RevenuePulse'; export function App(){return <main><RevenuePulse/></main>}\n",
      'src/RevenuePulse.tsx': "const modulePath='./RevenueDetails'; export function RevenuePulse(){const load=()=>import(modulePath);return <section>{String(load)}</section>}\n"
    });
    const branchCommit = commit(root); const { artifact } = await analyzeSelected(root, branchCommit, 'src/RevenuePulse.tsx', 'RevenuePulse');
    expect(artifact.slice.status).toBe('refused');
    expect(artifact.slice.unresolvedDependencies).toContainEqual(expect.objectContaining({ edge: 'unresolved-static-analysis', reason: expect.stringContaining('Dynamic import') }));
  });

  test('refuses a reachable circular dependency', async () => {
    const root = baseRepository(); git(root, ['switch', '-c', 'feature']);
    writeFiles(root, {
      'src/App.tsx': "import { RevenuePulse } from './RevenuePulse'; export function App(){return <main><RevenuePulse/></main>}\n",
      'src/RevenuePulse.tsx': "import { pulseCopy } from './pulseCopy'; export function RevenuePulse(){return <section>{pulseCopy()}</section>}\n",
      'src/pulseCopy.ts': "import { RevenuePulse } from './RevenuePulse'; export const pulseCopy=()=>RevenuePulse.name;\n"
    });
    const branchCommit = commit(root); const { artifact } = await analyzeSelected(root, branchCommit, 'src/RevenuePulse.tsx', 'RevenuePulse');
    expect(artifact.slice.status).toBe('refused');
    expect(artifact.slice.unresolvedDependencies).toContainEqual(expect.objectContaining({ edge: 'circular-dependency', reason: expect.stringContaining('not safely handled') }));
  });

  test('refuses a local dependency outside the supported source boundary', async () => {
    const root = baseRepository(); git(root, ['switch', '-c', 'feature']);
    writeFiles(root, {
      'src/App.tsx': "import { RevenuePulse } from './RevenuePulse'; export function App(){return <main><RevenuePulse/></main>}\n",
      'src/RevenuePulse.tsx': "import { pulseCopy } from '../shared/pulseCopy'; export function RevenuePulse(){return <section>{pulseCopy}</section>}\n",
      'shared/pulseCopy.ts': "export const pulseCopy='Revenue pulse';\n"
    });
    const branchCommit = commit(root); const { artifact } = await analyzeSelected(root, branchCommit, 'src/RevenuePulse.tsx', 'RevenuePulse');
    expect(artifact.slice.status).toBe('refused');
    expect(artifact.slice.unresolvedDependencies).toContainEqual(expect.objectContaining({ edge: 'outside-supported-boundary', path: 'shared/pulseCopy.ts' }));
  });
});

const preparedExternalRoot = resolve(import.meta.dirname, '../../.validation-worktrees/prompt019-external-vite');
const externalRepositoryTest = existsSync(resolve(preparedExternalRoot, '.git')) ? test : test.skip;

externalRepositoryTest('slices a rendered RevenuePulse selection from an unrelated external Vite repository without mutation', async () => {
  const root = resolve(process.env.UI_MERGE_EXTERNAL_SLICE_REPOSITORY ?? preparedExternalRoot);
  const repository = new GitSourceRepository(root);
  const baseRef = 'prompt019-foundation'; const branchRef = 'prompt019-revenue-pulse';
  const branchCommit = await repository.resolveRef(branchRef);
  const before = {
    status: await repository.git(['status', '--short']),
    branches: await repository.git(['for-each-ref', '--format=%(refname:short)', 'refs/heads/']),
    worktrees: await repository.git(['worktree', 'list', '--porcelain'])
  };
  const trusted = await trustedSelection(root, branchRef, branchCommit, 'src/views/dashboard/RevenuePulseBadge.tsx', 'RevenuePulseBadge');
  const request = { baseRef, branchRef, expectedBranchCommit: branchCommit, selection: trusted.selection };
  const analyzer = new FeatureSliceAnalyzer(root, resolve(process.cwd()));
  const first = await analyzer.analyzeExternal(request); const second = await analyzer.analyzeExternal(request);
  const includedPaths = new Set(first.slice.includedChanges.map(item => item.path));

  expect(first.slice.status, JSON.stringify(first.slice.unresolvedDependencies, null, 2)).toBe('resolved');
  expect(first.slice.boundary).toMatchObject({ original: 'RevenuePulseBadge', analyzed: 'RevenueTrendChart', status: 'expanded-to-integration-boundary' });
  expect(includedPaths).toEqual(new Set([
    'src/views/dashboard/RevenuePulseBadge.tsx',
    'src/views/dashboard/index.tsx',
    'src/views/dashboard/revenue-pulse.svg',
    'src/views/dashboard/revenuePulseConfig.ts',
    'src/views/dashboard/useRevenuePulse.ts'
  ]));
  expect(first.slice.includedChanges.map(item => item.category)).toEqual(expect.arrayContaining(['selected-definition', 'integration', 'hook', 'type', 'asset']));
  expect(first.slice.excludedChanges).toContainEqual(expect.objectContaining({ path: 'src/components/layout/index.tsx', symbol: expect.objectContaining({ name: 'PageLayout' }), classification: 'proven-unrelated', proof: 'proven' }));
  expect(second).toEqual(first);
  expect(JSON.parse(await readFile(resolve(process.cwd(), first.relativePath), 'utf8'))).toEqual(first.slice);
  expect({
    status: await repository.git(['status', '--short']),
    branches: await repository.git(['for-each-ref', '--format=%(refname:short)', 'refs/heads/']),
    worktrees: await repository.git(['worktree', 'list', '--porcelain'])
  }).toEqual(before);
}, 120_000);
