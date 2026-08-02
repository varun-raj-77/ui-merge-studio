import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';
import { categorySidebarCandidateSourceConfiguration, createCategorySidebarConfigurationSelection } from '../../apps/studio/src/categorySidebarConfiguration';

const fixture=resolve(import.meta.dirname,'../../fixtures/generated/product-catalogue');const repository=new GitSourceRepository(fixture);
function selection(branch:string,path:string,line:number,componentName:string,previewId:string):SourceIdentity{return{boundaryId:`${componentName}-boundary`,instanceId:`${componentName}-instance`,repositoryRelativePath:path,line,column:8,componentName,exportName:componentName,branch,previewId,sessionId:`${previewId}-session`,generation:1,confidence:'exact'};}
async function artifacts(){const analyzer=new FeatureSliceAnalyzer(fixture);return Promise.all([
  analyzer.analyze({baseRef:'main',branchRef:'branch-a',expectedBranchCommit:await repository.resolveRef('branch-a'),selection:selection('branch-a','src/features/catalogue/CategorySidebar.tsx',17,'CategorySidebar','left')}),
  analyzer.analyze({baseRef:'main',branchRef:'branch-b',expectedBranchCommit:await repository.resolveRef('branch-b'),selection:selection('branch-b','src/features/catalogue/ProductCardWithQuickView.tsx',6,'ProductCardWithQuickView','right')})
]);}

test('generates and verifies the Product Catalogue candidate, then repeats idempotently',async()=>{
  const base=await repository.resolveRef('main');const sourceRefs=['branch-a','branch-b','branch-incompatible'];const sourceBefore=await Promise.all(sourceRefs.map(ref=>repository.resolveRef(ref)));
  const generator=new CandidateGenerator(fixture,{artifactRoot:resolve(fixture,'..','..','..')});
  const selectedArtifacts=await artifacts();
  const categoryConfigurationInput=createCategorySidebarConfigurationSelection({enabledCategoryIds:['travel','audio','desk'],defaultCategoryId:'desk',showHeading:false,showProductCounts:true});
  const request={repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'combined-result',artifacts:selectedArtifacts,analyzerSchemaVersion:2 as const,sourceConfigurations:[
    categorySidebarCandidateSourceConfiguration({sliceId:selectedArtifacts[0].analysisId,sidebarSelected:true,selection:categoryConfigurationInput}),
    {sliceId:selectedArtifacts[1].analysisId,path:'src/config/quickViewTargets.ts',declaration:'quickViewTargetIds',value:['p-105']}
  ]};
  const first=await generator.generate(request);
  expect(first.status,first.message).toBe('succeeded');
  expect(first.verification.map(item=>item.status)).toEqual(['passed','passed','passed','passed','passed']);
  expect(await repository.git(['rev-parse','combined-result^'])).toBe(base);
  const planned=[...new Set(first.plan.operations.map(item=>item.target.path))].sort();
  const changed=(await repository.git(['diff','--name-only','main..combined-result'])).split(/\r?\n/).filter(Boolean).sort();
  expect(changed).toEqual(planned);
  const workspace=await repository.readFile('combined-result','src/features/catalogue/CatalogueWorkspace.tsx');
  const grid=await repository.readFile('combined-result','src/features/catalogue/ProductGrid.tsx');
  const header=await repository.readFile('combined-result','src/features/catalogue/CatalogueHeader.tsx');
  const quickViewTest=await repository.readFile('combined-result','src/test/quick-view.test.tsx');
  const categoryConfiguration=await repository.readFile('combined-result','src/config/categorySidebarConfiguration.ts');
  const quickViewConfiguration=await repository.readFile('combined-result','src/config/quickViewTargets.ts');
  expect(workspace).toContain('CategorySidebar');
  expect(grid).toContain('ProductCardWithQuickView');
  expect(header).not.toContain('PromotionalBanner');
  expect(quickViewTest).toContain('opens, focuses, and closes quick view');
  expect(quickViewTest).not.toContain('inventory summary');
  expect(categoryConfiguration).toContain('"enabledCategoryIds": ["audio", "desk", "travel"]');
  expect(categoryConfiguration).toContain('"defaultCategoryId": "desk"');
  expect(categoryConfiguration).toContain('"showHeading": false');
  expect(categoryConfiguration).toContain('"showProductCounts": true');
  expect(categoryConfiguration).not.toContain('"all"');
  expect(quickViewConfiguration).toContain('["p-105"]');
  expect(quickViewConfiguration).not.toContain('p-101');
  expect(await repository.fileExists('combined-result','src/utils/inventorySummary.ts')).toBe(false);
  const second=await generator.generate(request);
  expect(second.status,second.message).toBe('succeeded');
  expect(second.repository.idempotent).toBe(true);
  expect(second.repository.candidateTree).toBe(first.repository.candidateTree);
  expect(second.plan).toEqual(first.plan);
  expect(await Promise.all(sourceRefs.map(ref=>repository.resolveRef(ref)))).toEqual(sourceBefore);
  expect((await repository.git(['worktree','list','--porcelain']))).not.toContain('ui-merge-studio-candidate-');
},240_000);
