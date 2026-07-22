import { afterEach, expect, test } from 'vitest';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from './testRepository';

afterEach(cleanupRepositories);
async function analyzeTest(testSource: string, changeOther = false) {
  const root = createRepository({
    'src/components.tsx': "export function Other(){return <div>other contract</div>}\n",
    'src/App.tsx': "export function App(){return <main/>}\n",
    'src/Shell.tsx': "import { App } from './App'; export function Shell(){return <App/>}\n"
  });
  git(root,['switch','-c','feature']);
  writeFiles(root, {
    'src/components.tsx': `${changeOther ? "export function Other(){return <div>other changed contract</div>}" : "export function Other(){return <div>other contract</div>}"}\nexport function Feature(){return <section>feature contract</section>}\n`,
    'src/App.tsx': "import { Feature } from './components'; export function App(){return <main><Feature/></main>}\n",
    'src/feature.test.tsx': testSource
  });
  const branchCommit = commit(root); const selection: SourceIdentity = { boundaryId:'feature',instanceId:'feature-1',repositoryRelativePath:'src/components.tsx',line:2,column:8,componentName:'Feature',exportName:'Feature',branch:'feature',previewId:'left',sessionId:'session',generation:1,confidence:'exact' };
  return (await new FeatureSliceAnalyzer(root).analyze({ baseRef:'main',branchRef:'feature',expectedBranchCommit:branchCommit,selection })).slice;
}

test('slices nested tests, scoped hooks, helpers, fixtures, and mixed import specifiers', async () => {
  const slice = await analyzeTest("import { Feature as SelectedFeature, Other as OtherFeature } from './components';\nconst fixture={ready:true};\nconst renderFeature=()=> <SelectedFeature data-ready={fixture.ready}/>;\ndescribe('feature suite',()=>{\n  beforeEach(()=>fixture.ready);\n  test('included',()=>renderFeature());\n  describe('other suite',()=>{ beforeEach(()=>OtherFeature()); it('excluded',()=> <OtherFeature/>); });\n});\n");
  expect(slice.status).toBe('resolved'); const testSlice = slice.testFileSlices[0]; expect(testSlice.mode).toBe('test-units');
  expect(testSlice.includedUnits.map(unit => unit.kind)).toEqual(['describe','beforeEach','test']); expect(testSlice.includedUnits.find(unit => unit.kind === 'test')?.title).toBe('included');
  expect(testSlice.excludedUnits.map(unit => unit.kind)).toEqual(['beforeEach','describe','it']); expect(testSlice.excludedUnits.find(unit => unit.kind === 'it')?.title).toBe('excluded');
  expect(testSlice.requiredSupportDeclarations.map(item => item.name)).toEqual(['fixture','renderFeature']); expect(testSlice.requiredSupportDeclarations.every(item => item.changedHunks.length > 0)).toBe(true);
  expect(testSlice.requiredImports).toContainEqual(expect.objectContaining({ imported:'Feature', local:'SelectedFeature' })); expect(testSlice.excludedImports).toContainEqual(expect.objectContaining({ imported:'Other', local:'OtherFeature' }));
});

test('marks inseparable mixed top-level setup partial', async () => {
  const slice = await analyzeTest("import { Feature, Other } from './components';\nbeforeEach(()=>{ Feature(); Other(); });\ntest('included',()=>Feature());\ntest('excluded',()=>Other());\n", true);
  expect(slice.status).toBe('partial'); expect(slice.testFileSlices[0].mode).toBe('partial'); expect(slice.unresolvedDependencies).toContainEqual(expect.objectContaining({ edge:'ambiguous-shared-setup' }));
});

test('marks a dynamic test factory refused at file level and the feature slice partial', async () => {
  const slice = await analyzeTest("import { Feature } from './components';\nconst registry={feature:Feature}; const name='feature'; createFeatureTests(registry[name]);\n");
  expect(slice.status).toBe('partial'); expect(slice.testFileSlices[0].mode).toBe('refused'); expect(slice.unresolvedDependencies).toContainEqual(expect.objectContaining({ edge:'unsupported-test-analysis', reason:expect.stringContaining('test factory') }));
});

test('propagates an unresolved helper import and computed dynamic import without false resolution', async () => {
  const slice = await analyzeTest("import { Feature } from './components';\nimport { missing } from './missing';\nconst helper=()=>{ missing(); return Feature(); };\ntest('included',async()=>{ helper(); await import('./computed'); });\n");
  expect(slice.status).toBe('partial'); expect(slice.testFileSlices[0].includedUnits).toHaveLength(1); expect(slice.testFileSlices[0].requiredSupportDeclarations.map(item => item.name)).toContain('helper');
  expect(slice.unresolvedDependencies.map(item => item.reason)).toEqual(expect.arrayContaining([expect.stringContaining('Unresolved static import'), expect.stringContaining('Dynamic import')]));
});

test('produces deterministic normalized test-unit output', async () => {
  const source = "import { Feature, Other } from './components';\ntest('included',()=>Feature());\nit('excluded',()=>Other());\n";
  const first = await analyzeTest(source); const second = await analyzeTest(source);
  expect(second.testFileSlices).toEqual(first.testFileSlices);
});
