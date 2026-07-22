import { afterEach, expect, test } from 'vitest';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from './testRepository';

afterEach(cleanupRepositories);
test('returns a deterministic partial slice for a dynamic unresolved dependency and cycles terminate', async () => {
  const root = createRepository({ 'src/App.tsx': "export function App(){return <main/>}\n", 'src/A.ts': "import { b } from './B'; export const a=()=>b();\n", 'src/B.ts': "import { a } from './A'; export const b=()=>String(a);\n" }); git(root,['switch','-c','feature']); writeFiles(root,{ 'src/App.tsx': "import { DynamicFeature } from './DynamicFeature'; export function App(){return <main><DynamicFeature/></main>}\n", 'src/DynamicFeature.tsx': "const modulePath='./unknown'; export function DynamicFeature(){ const load=()=>import(modulePath); return <section>{String(load)}</section> }\n" }); const branchCommit = commit(root); const selection: SourceIdentity = { boundaryId:'dynamic',instanceId:'dynamic-1',repositoryRelativePath:'src/DynamicFeature.tsx',line:1,column:43,componentName:'DynamicFeature',exportName:'DynamicFeature',branch:'feature',previewId:'left',sessionId:'session',generation:1,confidence:'exact' };
  const analyzer = new FeatureSliceAnalyzer(root); const request = { baseRef:'main',branchRef:'feature',expectedBranchCommit:branchCommit,selection }; const first=(await analyzer.analyze(request)).slice; const second=(await analyzer.analyze(request)).slice;
  expect(first.status).toBe('partial'); expect(first.boundary.status).toBe('unresolved'); expect(first.unresolvedDependencies.some(item => item.reason.includes('Dynamic import'))).toBe(true); expect(second).toEqual(first);
});

test('refuses an unchanged selection with no changed supported dependency or integration edge', async () => {
  const root = createRepository({ 'src/App.tsx': "export function App(){return <main>stable</main>}\n", 'src/Other.ts': "export const other='base';\n" });
  git(root,['switch','-c','feature']); writeFiles(root,{ 'src/Other.ts': "export const other='changed';\n" }); const branchCommit = commit(root);
  const selection: SourceIdentity = { boundaryId:'app',instanceId:'app-1',repositoryRelativePath:'src/App.tsx',line:1,column:8,componentName:'App',exportName:'App',branch:'feature',previewId:'left',sessionId:'session',generation:1,confidence:'exact' };
  const result = (await new FeatureSliceAnalyzer(root).analyze({ baseRef:'main',branchRef:'feature',expectedBranchCommit:branchCommit,selection })).slice;
  expect(result.status).toBe('refused'); expect(result.includedChanges).toEqual([]); expect(result.boundary.status).toBe('unresolved'); expect(result.unresolvedDependencies[0].reason).toContain('selected definition is unchanged');
  expect(result.excludedChanges).toEqual([expect.objectContaining({ path: 'src/Other.ts', proof: 'unproven' })]);
});
