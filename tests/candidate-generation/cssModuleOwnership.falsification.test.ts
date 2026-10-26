import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { LocalPlanAuthority, localRepositoryId } from '../../apps/studio/localPlanAuthority';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { localIntegrationPlanIdentity } from '../../packages/integration-plan/src/localPlan';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { buildSourceIndex } from '../../packages/source-analysis/src/sourceIndex';
import { instrumentReactSource } from '../../packages/source-instrumentation/src/instrumentReactSource';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

afterEach(cleanupRepositories);

const featurePath = 'src/features/revenue/RevenuePulseBadge.tsx';
const stylePath = 'src/features/revenue/RevenuePulseBadge.module.css';
const featureSource = "import styles from './RevenuePulseBadge.module.css';\nexport function RevenuePulseBadge(){return <section className={styles.pulse} aria-label=\"Revenue pulse\">Revenue pulse</section>}\n";
const appSource = "import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n";

function repository(base: Record<string, string> = {}) {
  return createRepository({
    'package.json': '{"scripts":{"typecheck":"tsc --noEmit","test":"echo ok","build":"vite build"}}\n',
    'src/App.tsx': 'export function App(){return <main><h1>Dashboard</h1></main>}\n',
    ...base
  });
}

async function renderedSlice(root: string) {
  const branchCommit = commit(root, 'test: selected CSS Module feature and unrelated changes');
  const preview: PreviewSession = {
    previewId: 'right', branch: 'prompt020-revenue-pulse', repositoryPath: root,
    commit: branchCommit, branchCommit, packageManager: 'npm', generation: 1,
    sessionId: 'css-module-rendered-session', protocolVersion: 2,
    url: 'http://127.0.0.1:5191', origin: 'http://127.0.0.1:5191',
    port: 5191, processId: 5191, worktreePath: root, status: 'running', failure: null
  };
  const gitRepository = new GitSourceRepository(root);
  const source = await gitRepository.readFile(branchCommit, featurePath);
  const instrumented = instrumentReactSource(source, resolve(root, featurePath), {
    repositoryRoot: root, branch: preview.branch,
    selectionReceipt: () => 'rendered-' + 'c'.repeat(32)
  });
  const mapping = instrumented?.boundaries.find(item => item.source.componentName === 'RevenuePulseBadge');
  if (!mapping) throw new Error('Missing exact rendered RevenuePulseBadge boundary.');
  const authority = new LocalPlanAuthority(root, localRepositoryId(root), 'main', 'combined-result', () => preview, () => [preview], 'external-react-vite');
  authority.registerInstrumentedBoundaries(preview, [mapping]);
  const selection = authority.resolveRenderedSelection(preview, mapping.selectionReceipt);
  const artifact = await new FeatureSliceAnalyzer(root).analyzeExternal({
    baseRef: 'main', branchRef: preview.branch, expectedBranchCommit: branchCommit, selection
  });
  const evidence = await authority.register(preview, artifact, '/');
  const plan = { version: 2 as const, foundation: evidence.foundation, selections: [evidence.selection] };
  const projected = await authority.project({ plan, planIdentity: localIntegrationPlanIdentity(plan) });
  return { artifact, request: projected.request, branchCommit, gitRepository };
}

function addFeature(root: string, css: string, other: Record<string, string> = {}) {
  writeFiles(root, {
    'src/App.tsx': appSource,
    [featurePath]: featureSource,
    [stylePath]: css,
    ...other
  });
}

describe('UMS-24B: external CSS Module ownership falsification', () => {
  test('indexes a selected default CSS Module binding but still refuses a conservative whole-file transfer', async () => {
    const root = repository();
    git(root, ['switch', '-c', 'prompt020-revenue-pulse']);
    addFeature(root, '.pulse{color:green}\n');
    const { artifact, request, branchCommit, gitRepository } = await renderedSlice(root);
    expect(artifact.slice.status).toBe('resolved');
    const index = await buildSourceIndex(gitRepository, branchCommit);
    const feature = index.moduleByPath.get(featurePath)!;
    expect(feature.imports).toContainEqual(expect.objectContaining({
      source: './RevenuePulseBadge.module.css', local: 'styles',
      resolvedPath: stylePath, kind: 'style'
    }));
    expect(feature.declarations.find(item => item.name === 'RevenuePulseBadge')?.dependencies).toContain('styles');
    expect(artifact.slice.includedChanges).toContainEqual(expect.objectContaining({
      path: stylePath, category: 'style', wholeFile: true, confidence: 'conservative'
    }));
    const generator = new CandidateGenerator(root);
    const first = await generator.preflight(request);
    const second = await generator.preflight(request);
    expect(second).toEqual(first);
    expect(first.plan.operations).toContainEqual(expect.objectContaining({
      kind: 'add-style-file', target: expect.objectContaining({ path: stylePath })
    }));
    expect(first.plan.status).toBe('refused');
    expect(first.plan.unresolved).toContainEqual(expect.objectContaining({
      path: stylePath, reason: expect.stringContaining('CSS rule ownership is not implemented')
    }));
    expect(() => git(root, ['rev-parse', 'combined-result'])).toThrow();
    expect(git(root, ['status', '--porcelain'])).toBe('');
  });

  test('does not claim exclusive ownership when an unrelated component imports the same CSS Module', async () => {
    const root = repository();
    git(root, ['switch', '-c', 'prompt020-revenue-pulse']);
    addFeature(root, '.pulse{color:green}\n.unrelated{display:none}\n', {
      'src/features/revenue/UnrelatedBadge.tsx':
        "import styles from './RevenuePulseBadge.module.css';\nexport function UnrelatedBadge(){return <aside className={styles.unrelated}>Not selected</aside>}\n"
    });
    const { artifact, request, branchCommit, gitRepository } = await renderedSlice(root);
    expect(artifact.slice.status).toBe('refused');
    expect(artifact.slice.unresolvedDependencies).toContainEqual(expect.objectContaining({
      path: stylePath, edge: 'non-exclusive-style-dependency',
      reason: expect.stringContaining('UnrelatedBadge')
    }));
    const index = await buildSourceIndex(gitRepository, branchCommit);
    const importers = index.modules.filter(module => module.imports.some(binding => binding.resolvedPath === stylePath)).map(module => module.path).sort();
    expect(importers).toEqual([featurePath, 'src/features/revenue/UnrelatedBadge.tsx']);
    expect(artifact.slice.includedChanges.some(change => change.path === stylePath && change.wholeFile && change.confidence === 'unresolved')).toBe(true);
    expect(artifact.slice.includedChanges.some(change => change.path === 'src/features/revenue/UnrelatedBadge.tsx')).toBe(false);
    const preflight = await new CandidateGenerator(root).preflight(request);
    expect(preflight.plan.status).toBe('refused');
    expect(preflight.plan.operations).toEqual([]);
    expect(preflight.plan.unresolved).toContainEqual(expect.objectContaining({
      path: '<slice>', reason: expect.stringContaining('only resolved slices can generate a candidate')
    }));
    expect(() => git(root, ['rev-parse', 'combined-result'])).toThrow();
    expect(git(root, ['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
  });

  test('refuses an existing CSS Module modified in both a selected and unrelated rule', async () => {
    const root = repository({
      [stylePath]: '.pulse{color:blue}\n.unrelated{display:block}\n'
    });
    git(root, ['switch', '-c', 'prompt020-revenue-pulse']);
    addFeature(root, '.pulse{color:green}\n.unrelated{display:none}\n');
    const { artifact, request } = await renderedSlice(root);
    expect(artifact.slice.status).toBe('refused');
    expect(artifact.slice.unresolvedDependencies).toContainEqual(expect.objectContaining({
      path: stylePath, edge: 'non-exclusive-style-dependency',
      reason: expect.stringContaining('absent from the foundation')
    }));
    expect(artifact.slice.includedChanges).toContainEqual(expect.objectContaining({
      path: stylePath, category: 'style', wholeFile: true
    }));
    const preflight = await new CandidateGenerator(root).preflight(request);
    expect(preflight.plan.status).toBe('refused');
    expect(preflight.plan.operations).toEqual([]);
    expect(preflight.plan.unresolved).toContainEqual(expect.objectContaining({
      path: '<slice>', reason: expect.stringContaining('only resolved slices can generate a candidate')
    }));
    expect(() => git(root, ['rev-parse', 'combined-result'])).toThrow();
    expect(git(root, ['status', '--porcelain'])).toBe('');
  });
  test('refuses a bare CSS Module import with no unique declaration owner', async () => {
    const root = repository();
    git(root, ['switch', '-c', 'prompt020-revenue-pulse']);
    addFeature(root, '.pulse{color:green}\n', {
      [featurePath]: "import styles from './RevenuePulseBadge.module.css';\nimport './RevenuePulseBadge.module.css';\nexport function RevenuePulseBadge(){return <section className={styles.pulse}>Revenue pulse</section>}\n"
    });
    const { artifact, request } = await renderedSlice(root);
    expect(artifact.slice.status).toBe('refused');
    expect(artifact.slice.unresolvedDependencies).toContainEqual(expect.objectContaining({
      path: stylePath, edge: 'non-exclusive-style-dependency',
      reason: expect.stringContaining('no unique statically bound declaration owner')
    }));
    const preflight = await new CandidateGenerator(root).preflight(request);
    expect(preflight.plan.status).toBe('refused');
    expect(() => git(root, ['rev-parse', 'combined-result'])).toThrow();
    expect(git(root, ['status', '--porcelain'])).toBe('');
  });

});
