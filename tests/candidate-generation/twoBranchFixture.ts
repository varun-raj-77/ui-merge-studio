import { symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LocalPlanAuthority, localRepositoryId } from '../../apps/studio/localPlanAuthority';
import { localIntegrationPlanIdentity } from '../../packages/integration-plan/src/localPlan';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { instrumentReactSource } from '../../packages/source-instrumentation/src/instrumentReactSource';
import { commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

const leftFeature = "import { leftStatus } from './statusCopy';\nexport function StatusBadge(){return <strong>{leftStatus}</strong>}\n";
const rightFeature = "import { rightForecast } from './forecastCopy';\nexport function ForecastChip(){return <strong>{rightForecast}</strong>}\n";

export type Choice = { previewId: 'left' | 'right'; branch: string; path: string; name: string };
export const choices: Choice[] = [
  { previewId: 'left', branch: 'feature-status', path: 'src/left/StatusBadge.tsx', name: 'StatusBadge' },
  { previewId: 'right', branch: 'feature-forecast', path: 'src/right/ForecastChip.tsx', name: 'ForecastChip' }
];

function branchFiles(choice: Choice, sharedParent: boolean, brokenRight = false): Record<string, string> {
  const feature = choice.previewId === 'left' ? leftFeature : brokenRight
    ? "import { rightForecast } from './forecastCopy';\nexport function ForecastChip(){const invalid: number = 'wrong type';return <strong>{rightForecast}{invalid}</strong>}\n"
    : rightFeature;
  const copy: Record<string, string> = choice.previewId === 'left'
    ? { 'src/left/statusCopy.ts': "export const leftStatus='Status: healthy';\n" }
    : { 'src/right/forecastCopy.ts': "export const rightForecast='Forecast: stable';\n" };
  const integration = sharedParent
    ? choice.previewId === 'left'
      ? "import { StatusBadge } from './left/StatusBadge';\nexport function App(){return <main><StatusBadge/><h1>Dashboard</h1></main>}\n"
      : "import { ForecastChip } from './right/ForecastChip';\nexport function App(){return <main><h1>Dashboard</h1><ForecastChip/></main>}\n"
    : choice.previewId === 'left'
      ? "import { StatusBadge } from './StatusBadge';\nexport function LeftPanel(){return <section><StatusBadge/><h2>Left panel</h2></section>}\n"
      : "import { ForecastChip } from './ForecastChip';\nexport function RightPanel(){return <aside><h2>Right panel</h2><ForecastChip/></aside>}\n";
  const integrationPath = sharedParent ? 'src/App.tsx'
    : choice.previewId === 'left' ? 'src/left/LeftPanel.tsx' : 'src/right/RightPanel.tsx';
  return {
    [choice.path]: feature,
    ...copy,
    [integrationPath]: integration,
    [choice.previewId === 'left' ? 'src/left/UnselectedExperiment.tsx' : 'src/right/UnselectedExperiment.tsx']:
      'export function UnselectedExperiment(){return <span>UNSELECTED EXPERIMENT</span>}\n'
  };
}

export async function createTwoBranchPlan(sharedParent = false, runnable = false, brokenRight = false) {
  const root = createRepository({
    '.gitignore': '.ums/\nnode_modules\ndist/\n',
    'package.json': '{"name":"ums-multibranch-proof","private":true,"scripts":{"dev":"vite","build":"vite build"}}\n',
    'src/App.tsx': sharedParent
      ? 'export function App(){return <main><h1>Dashboard</h1></main>}\n'
      : "import { LeftPanel } from './left/LeftPanel';\nimport { RightPanel } from './right/RightPanel';\nexport function App(){return <main><LeftPanel/><RightPanel/></main>}\n",
    'src/left/LeftPanel.tsx': 'export function LeftPanel(){return <section><h2>Left panel</h2></section>}\n',
    'src/right/RightPanel.tsx': 'export function RightPanel(){return <aside><h2>Right panel</h2></aside>}\n',
    ...(runnable ? {
      'index.html': '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
      'src/main.tsx': "import { createElement } from 'react'; import { createRoot } from 'react-dom/client'; import { App } from './App'; createRoot(document.getElementById('root')!).render(createElement(App));\n",
      'vite.config.ts': "export default { esbuild: { jsx: 'automatic' } };\n",
      'tsconfig.json': JSON.stringify({
        compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM'], module: 'ESNext', moduleResolution: 'Bundler',
          jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true },
        include: ['src']
      }) + '\n'
    } : {})
  });
  const base = git(root, ['rev-parse', 'main']);
  const sessions = new Map<string, PreviewSession>();
  const commits = new Map<string, string>();
  for (const choice of choices) {
    git(root, ['switch', '-c', choice.branch, 'main']);
    writeFiles(root, branchFiles(choice, sharedParent, brokenRight && choice.previewId === 'right'));
    const sha = commit(root, 'Add selected feature and unrelated experiment');
    commits.set(choice.branch, sha);
    sessions.set(choice.previewId, {
      previewId: choice.previewId,
      branch: choice.branch,
      repositoryPath: root,
      commit: sha,
      branchCommit: sha,
      packageManager: 'npm',
      generation: 1,
      sessionId: 'ums06-' + choice.previewId,
      protocolVersion: 2,
      url: 'http://127.0.0.1:5191',
      origin: 'http://127.0.0.1:5191',
      port: 5191,
      processId: 5191,
      worktreePath: root,
      status: 'running',
      failure: null
    });
  }
  git(root, ['switch', 'main']);
  const authority = new LocalPlanAuthority(root, localRepositoryId(root), 'main', 'combined-result',
    id => sessions.get(id) ?? null, () => [...sessions.values()], 'external-react-vite');
  const selections = [];
  let foundation: Awaited<ReturnType<typeof authority.foundation>> | null = null;
  for (const choice of choices) {
    const session = sessions.get(choice.previewId)!;
    const source = await new GitSourceRepository(root).readFile(session.branchCommit, choice.path);
    const instrumented = instrumentReactSource(source, resolve(root, choice.path), {
      repositoryRoot: root,
      branch: choice.branch,
      selectionReceipt: () => 'rendered-' + (choice.previewId === 'left' ? 'l' : 'r').repeat(32)
    });
    const mapping = instrumented?.boundaries.find(item => item.source.componentName === choice.name);
    if (!mapping) throw new Error('Missing instrumented JSX boundary for ' + choice.name);
    authority.registerInstrumentedBoundaries(session, [mapping]);
    const selection = authority.resolveRenderedSelection(session, mapping.selectionReceipt);
    const artifact = await new FeatureSliceAnalyzer(root).analyzeExternal({
      baseRef: 'main',
      branchRef: choice.branch,
      expectedBranchCommit: session.branchCommit,
      selection
    });
    if (artifact.slice.status !== 'resolved') throw new Error('Unresolved selected feature: ' + JSON.stringify(artifact.slice.unresolvedDependencies));
    const registered = await authority.register(session, artifact, '/');
    foundation = registered.foundation;
    selections.push(registered.selection);
  }
  const plan = { version: 2 as const, foundation: foundation!, selections };
  const projected = await authority.project({ plan, planIdentity: localIntegrationPlanIdentity(plan) });
  return { root, base, commits, request: projected.request, planIdentity: projected.planIdentity };
}

const trustedWorkspace = resolve(import.meta.dirname, '../..');
const trustedNodeModules = resolve(trustedWorkspace, 'node_modules');
export const realVerification = [
  { name: 'candidate-typescript', executable: process.execPath,
    args: [resolve(trustedNodeModules, 'typescript/bin/tsc'), '--project', 'tsconfig.json'] },
  { name: 'candidate-vite-build', executable: process.execPath,
    args: [resolve(trustedNodeModules, 'vite/bin/vite.js'), 'build', '--config', 'vite.config.ts'] }
];

export function linkTrustedDependencies(worktree: string) {
  // No npm install, lifecycle scripts, or network: use already-locked CI deps.
  // The temp candidate .gitignore excludes this symlink and generated dist.
  symlinkSync(trustedNodeModules, join(worktree, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
}

