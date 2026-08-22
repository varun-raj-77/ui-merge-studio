import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { configureExportedConst, findDeclarationRange, parseModule, projectJsxRegion, reconcileExport, reconcileImport, reconstructTestModule, replaceDeclaration } from '../../packages/candidate-generation/src/astTransform';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { buildSourceIndex } from '../../packages/source-analysis/src/sourceIndex';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';

const fixture = resolve(import.meta.dirname, '../../fixtures/generated/product-catalogue');
const repository = new GitSourceRepository(fixture);
function selection(branch:string,path:string,line:number,componentName:string,previewId:string):SourceIdentity{return{boundaryId:`${componentName}-boundary`,instanceId:`${componentName}-instance`,repositoryRelativePath:path,line,column:8,componentName,exportName:componentName,branch,previewId,sessionId:`${previewId}-session`,generation:1,confidence:'exact'};}
async function realArtifacts(){
  const analyzer=new FeatureSliceAnalyzer(fixture);
  return Promise.all([
    analyzer.analyze({baseRef:'main',branchRef:'branch-a',expectedBranchCommit:await repository.resolveRef('branch-a'),selection:selection('branch-a','src/features/catalogue/CategorySidebar.tsx',10,'CategorySidebar','left')}),
    analyzer.analyze({baseRef:'main',branchRef:'branch-b',expectedBranchCommit:await repository.resolveRef('branch-b'),selection:selection('branch-b','src/features/catalogue/ProductQuickViewShelf.tsx',9,'ProductQuickViewShelf','right')})
  ]);
}

describe('candidate transformation utilities',()=>{
  test('reconciles named aliases and exports without duplication and replaces declarations by AST identity',()=>{let code="import { A } from './dep';\nexport function View(){return <A/>}\n";code=reconcileImport(code,'src/View.tsx',{source:'./dep',local:'Renamed',imported:'B',kind:'value',reason:'test'});code=reconcileImport(code,'src/View.tsx',{source:'./dep',local:'Renamed',imported:'B',kind:'value',reason:'test'});code=reconcileExport(code,'src/View.tsx','View','./View');code=reconcileExport(code,'src/View.tsx','View','./View');code=replaceDeclaration(code,'src/View.tsx','View','function View(){return <Renamed/>}');expect(code.match(/Renamed/g)?.length).toBe(2);expect(code.match(/export \{ View \}/g)?.length).toBe(1);expect(findDeclarationRange(code,'src/View.tsx','View')).not.toBeNull();expect(()=>parseModule(code,'src/View.tsx')).not.toThrow();});
  test('projects the same JSX child from LF preflight text and CRLF worktree text',()=>{const base="export function App(){\n  return <main><section>Foundation</section></main>\n}\n";const source="import { Selected } from './Selected';\nexport function App(){\n  return <main><Selected/><section>Foundation</section><p>Unrelated</p></main>\n}\n";const boundary={path:'src/Selected.tsx',symbol:'Selected'};const lf=projectJsxRegion(base,source,'src/App.tsx','App',boundary);const crlf=projectJsxRegion(base.replace(/\n/g,'\r\n'),source,'src/App.tsx','App',boundary);expect(crlf.evidence).toEqual(lf.evidence);expect(crlf.code).toContain('<Selected/>');expect(crlf.code).not.toContain('Unrelated');});
  test('refuses selected JSX nested inside an expression instead of replacing the enclosing expression',()=>{const base="export function Grid({enabled}:{enabled:boolean}){return <main>{enabled ? <span>Foundation</span> : null}</main>}\n";const source="import { Selected } from './Selected';\nexport function Grid({enabled}:{enabled:boolean}){return <main>{enabled ? <span>UNRELATED SOURCE CHANGE</span> : <Selected/>}</main>}\n";const boundary={path:'src/Selected.tsx',symbol:'Selected'};expect(()=>projectJsxRegion(base,source,'src/Grid.tsx','Grid',boundary)).toThrow('overlaps an expression or enclosing child replacement');});
  test('writes a typed exported const deterministically without duplicate values',()=>{const source="export const quickViewTargetIds = ['p-101', 'p-102'] as const;\n";const first=configureExportedConst(source,'src/config.ts','quickViewTargetIds',['p-102','p-104']);const second=configureExportedConst(source,'src/config.ts','quickViewTargetIds',['p-102','p-104']);expect(first).toBe(second);expect(first).toContain('\"p-102\", \"p-104\"');expect(first).not.toContain('p-101');});
  test('writes the exact category object deterministically and refuses malformed source shapes',()=>{
    const source="export const categorySidebarConfiguration = { enabledCategoryIds: ['all'], defaultCategoryId: 'all', showHeading: true, showProductCounts: false } as const;\n";
    const value={enabledCategoryIds:['audio','desk','travel'],defaultCategoryId:'desk',showHeading:false,showProductCounts:true};
    const first=configureExportedConst(source,'src/config/category.ts','categorySidebarConfiguration',value);
    expect(first).toBe(configureExportedConst(source,'src/config/category.ts','categorySidebarConfiguration',value));
    expect(first).toBe('export const categorySidebarConfiguration = {\n  \"defaultCategoryId\": \"desk\",\n  \"enabledCategoryIds\": [\"audio\", \"desk\", \"travel\"],\n  \"showHeading\": false,\n  \"showProductCounts\": true\n} as const;\n');
    expect(()=>configureExportedConst("export const categorySidebarConfiguration = makeConfiguration();\n",'src/config/category.ts','categorySidebarConfiguration',value)).toThrow('incompatible source shape');
    expect(()=>configureExportedConst("const categorySidebarConfiguration = {};\n",'src/config/category.ts','categorySidebarConfiguration',value)).toThrow('must be an exported const');
  });
  test('reconstructs the quick-view test without the unrelated inventory test',async()=>{const artifact=(await realArtifacts())[1];const index=await buildSourceIndex(repository,artifact.slice.repository.branchCommit);const slice=artifact.slice.testFileSlices.find(item=>item.path==='src/test/quick-view.test.tsx')!;const source=await repository.readFile(artifact.slice.repository.branchCommit,slice.path);const output=reconstructTestModule(source,slice.path,index.moduleByPath.get(slice.path)!,slice);expect(output).toContain('opens, focuses, and closes quick view');expect(output).not.toContain('inventory summary');expect(output).toContain('@testing-library/react');});
});

test('plans the controlled slices as supported direct-child integrations deterministically',async()=>{
  const artifacts=await realArtifacts();const base=await repository.resolveRef('main');const generator=new CandidateGenerator(fixture);
  const request={repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'combined-result',artifacts,analyzerSchemaVersion:2 as const};
  const first=await generator.preflight(request);const second=await generator.preflight(request);
  expect(first.plan.status).toBe('ready');
  expect(second).toEqual(first);
  const paths=new Set(first.plan.operations.map(item=>item.target.path));
  expect(paths).toContain('src/features/catalogue/CategorySidebar.tsx');
  expect(paths).toContain('src/features/catalogue/ProductQuickView.tsx');
  expect(paths).toContain('src/test/quick-view.test.tsx');
  expect(paths).not.toContain('src/features/catalogue/CatalogueHeader.tsx');
  expect(paths).not.toContain('src/utils/inventorySummary.ts');
  expect(first.plan.operations.find(item=>item.target.path==='src/test/quick-view.test.tsx')?.kind).toBe('reconstruct-test-file');
  expect(first.plan.unresolved).toEqual([]);
  expect(first.plan.operations).toContainEqual(expect.objectContaining({
    kind:'replace-jsx-region',target:expect.objectContaining({path:'src/features/catalogue/CatalogueWorkspace.tsx',symbol:'CatalogueWorkspace'}),
    jsxProjection:expect.objectContaining({mode:'insert-child',renderedBoundary:{path:'src/features/catalogue/CategorySidebar.tsx',symbol:'CategorySidebar'},anchor:expect.objectContaining({side:'before'})})
  }));
  expect(first.plan.operations).toContainEqual(expect.objectContaining({
    kind:'replace-jsx-region',target:expect.objectContaining({path:'src/features/catalogue/ProductGrid.tsx',symbol:'ProductGrid'}),
    jsxProjection:expect.objectContaining({mode:'insert-child',renderedBoundary:{path:'src/features/catalogue/ProductQuickViewShelf.tsx',symbol:'ProductQuickViewShelf'},anchor:expect.objectContaining({side:'before'})})
  }));
  expect(first.plan.operations.some(item=>item.kind==='replace-declaration'&&(item.target.symbol==='CatalogueWorkspace'||item.target.symbol==='ProductGrid'))).toBe(false);
},90_000);

test('plans an instance configuration after the Quick View slice exactly once',async()=>{
  const quickView=(await realArtifacts())[1];const base=await repository.resolveRef('main');const generator=new CandidateGenerator(fixture);
  const configuration={sliceId:quickView.analysisId,path:'src/config/quickViewTargets.ts',declaration:'quickViewTargetIds',value:['p-102','p-104']};
  const first=await generator.preflight({repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'showcase-s0-q-102-104',artifacts:[quickView],analyzerSchemaVersion:2,sourceConfigurations:[configuration]});
  const second=await generator.preflight({repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'showcase-s0-q-102-104',artifacts:[quickView],analyzerSchemaVersion:2,sourceConfigurations:[configuration]});
  expect(first).toEqual(second);
  expect(first.plan.status).toBe('ready');
  expect(first.plan.unresolved).toEqual([]);
  expect(first.plan.operations).toContainEqual(expect.objectContaining({kind:'replace-jsx-region',target:expect.objectContaining({path:'src/features/catalogue/ProductGrid.tsx',symbol:'ProductGrid'}),jsxProjection:expect.objectContaining({mode:'insert-child'})}));
  expect(first.plan.operations.filter(item=>item.kind==='configure-exported-const')).toHaveLength(1);
  expect(first.plan.operations.filter(item=>item.target.path==='src/config/quickViewTargets.ts'&&item.kind==='add-file')).toHaveLength(1);
},90_000);

test('plans category configuration once and still refuses stale source or a missing parent slice',async()=>{
  const [category,quickView]=await realArtifacts();const base=await repository.resolveRef('main');const generator=new CandidateGenerator(fixture);
  const path='src/config/categorySidebarConfiguration.ts';
  const source=await repository.readFile(category.slice.repository.branchCommit,path);
  const expectedSourceContentHash=createHash('sha256').update(`${source.replace(/\r\n/g,'\n')}\n`).digest('hex');
  const configuration={sliceId:category.analysisId,path,declaration:'categorySidebarConfiguration',value:{enabledCategoryIds:['audio','desk','travel'],defaultCategoryId:'desk',showHeading:false,showProductCounts:true},expectedSourceContentHash};
  const request={repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'configured-category-proof',artifacts:[category],analyzerSchemaVersion:2 as const,sourceConfigurations:[configuration]};
  const first=await generator.preflight(request);const second=await generator.preflight(request);
  expect(first).toEqual(second);
  expect(first.plan.status).toBe('ready');
  expect(first.plan.unresolved).toEqual([]);
  expect(first.plan.operations).toContainEqual(expect.objectContaining({kind:'replace-jsx-region',target:expect.objectContaining({path:'src/features/catalogue/CatalogueWorkspace.tsx',symbol:'CatalogueWorkspace'}),jsxProjection:expect.objectContaining({mode:'insert-child'})}));
  expect(first.plan.operations.filter(item=>item.kind==='configure-exported-const'&&item.target.path===path)).toHaveLength(1);
  const stale=await generator.preflight({...request,candidateBranch:'configured-category-stale',sourceConfigurations:[{...configuration,expectedSourceContentHash:'0'.repeat(64)}]});
  expect(stale.plan.status).toBe('refused');
  expect(stale.plan.unresolved.map(item=>item.reason).join(' ')).toContain('changed after it was inspected');
  const absent=await generator.preflight({...request,candidateBranch:'configured-category-absent',artifacts:[quickView]});
  expect(absent.plan.status).toBe('refused');
  expect(absent.plan.unresolved.map(item=>item.reason).join(' ')).toContain('does not reference a selected slice');
},90_000);
