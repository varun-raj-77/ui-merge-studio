import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { findDeclarationRange, parseModule, reconcileExport, reconcileImport, reconstructTestModule, replaceDeclaration } from '../../packages/candidate-generation/src/astTransform';
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
    analyzer.analyze({baseRef:'main',branchRef:'branch-a',expectedBranchCommit:await repository.resolveRef('branch-a'),selection:selection('branch-a','src/features/catalogue/CategorySidebar.tsx',5,'CategorySidebar','left')}),
    analyzer.analyze({baseRef:'main',branchRef:'branch-b',expectedBranchCommit:await repository.resolveRef('branch-b'),selection:selection('branch-b','src/features/catalogue/ProductQuickView.tsx',5,'ProductQuickView','right')})
  ]);
}

describe('candidate transformation utilities',()=>{
  test('reconciles named aliases and exports without duplication and replaces declarations by AST identity',()=>{let code="import { A } from './dep';\nexport function View(){return <A/>}\n";code=reconcileImport(code,'src/View.tsx',{source:'./dep',local:'Renamed',imported:'B',kind:'value',reason:'test'});code=reconcileImport(code,'src/View.tsx',{source:'./dep',local:'Renamed',imported:'B',kind:'value',reason:'test'});code=reconcileExport(code,'src/View.tsx','View','./View');code=reconcileExport(code,'src/View.tsx','View','./View');code=replaceDeclaration(code,'src/View.tsx','View','function View(){return <Renamed/>}');expect(code.match(/Renamed/g)?.length).toBe(2);expect(code.match(/export \{ View \}/g)?.length).toBe(1);expect(findDeclarationRange(code,'src/View.tsx','View')).not.toBeNull();expect(()=>parseModule(code,'src/View.tsx')).not.toThrow();});
  test('reconstructs the quick-view test without the unrelated inventory test',async()=>{const artifact=(await realArtifacts())[1];const index=await buildSourceIndex(repository,artifact.slice.repository.branchCommit);const slice=artifact.slice.testFileSlices.find(item=>item.path==='src/test/quick-view.test.tsx')!;const source=await repository.readFile(artifact.slice.repository.branchCommit,slice.path);const output=reconstructTestModule(source,slice.path,index.moduleByPath.get(slice.path)!,slice);expect(output).toContain('opens, focuses, and closes quick view');expect(output).not.toContain('inventory summary');expect(output).toContain('@testing-library/react');});
});

test('builds a deterministic ready plan with selected dependencies and no unrelated changes',async()=>{
  const artifacts=await realArtifacts();const base=await repository.resolveRef('main');const generator=new CandidateGenerator(fixture);
  const request={repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'combined-result',artifacts,analyzerSchemaVersion:2 as const};
  const first=await generator.preflight(request);const second=await generator.preflight(request);
  expect(first.plan.status,JSON.stringify({unresolved:first.plan.unresolved,conflicts:first.plan.conflicts},null,2)).toBe('ready');
  expect(second).toEqual(first);
  const paths=new Set(first.plan.operations.map(item=>item.target.path));
  expect(paths).toContain('src/features/catalogue/CategorySidebar.tsx');
  expect(paths).toContain('src/features/catalogue/ProductQuickView.tsx');
  expect(paths).toContain('src/test/quick-view.test.tsx');
  expect(paths).not.toContain('src/features/catalogue/CatalogueHeader.tsx');
  expect(paths).not.toContain('src/utils/inventorySummary.ts');
  expect(first.plan.operations.find(item=>item.target.path==='src/test/quick-view.test.tsx')?.kind).toBe('reconstruct-test-file');
},90_000);
