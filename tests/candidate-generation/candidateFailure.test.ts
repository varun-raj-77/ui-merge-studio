import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import type { FeatureSliceArtifact } from '../../packages/source-analysis/src/types';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';
import type { CandidateConflict, CandidateOperation } from '../../packages/candidate-generation/src/types';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

afterEach(cleanupRepositories);
const noOpVerification=[{name:'controlled-no-op',executable:process.execPath,args:['-e','process.exit(0)']}];
function source(branch:string,name:string,line:number):SourceIdentity{return{boundaryId:`${name}-boundary`,instanceId:`${name}-instance`,repositoryRelativePath:'src/Shared.tsx',line,column:8,componentName:name,exportName:name,branch,previewId:branch,sessionId:`${branch}-session`,generation:1,confidence:'exact'};}
function rehash(artifact:FeatureSliceArtifact){artifact.analysisId=createHash('sha256').update(JSON.stringify(artifact.slice)).digest('hex').slice(0,16);artifact.relativePath=`.ums/analysis/${artifact.analysisId}/feature-slice.json`;return artifact;}
function clone(artifact:FeatureSliceArtifact){return structuredClone(artifact);}
async function analyzedPair(leftBody:string,rightBody:string,rightSelection:'Left'|'Right'='Right'){
  const base="export function Left(){return <div>base left</div>}\nexport function Right(){return <div>base right</div>}\n";
  const root=createRepository({'.gitignore':'.ums/\n','src/Shared.tsx':base,'src/One.tsx':"export function One(){return <span>one</span>}\n",'src/Two.tsx':"export function Two(){return <span>two</span>}\n"});
  git(root,['switch','-c','feature-left']);writeFiles(root,{'src/Shared.tsx':leftBody});const leftCommit=commit(root,'left change');
  git(root,['switch','main']);git(root,['switch','-c','feature-right']);writeFiles(root,{'src/Shared.tsx':rightBody});const rightCommit=commit(root,'right change');
  const analyzer=new FeatureSliceAnalyzer(root);const artifacts=await Promise.all([
    analyzer.analyze({baseRef:'main',branchRef:'feature-left',expectedBranchCommit:leftCommit,selection:source('feature-left','Left',leftBody.slice(0,leftBody.indexOf('export function Left')).split('\n').length)}),
    analyzer.analyze({baseRef:'main',branchRef:'feature-right',expectedBranchCommit:rightCommit,selection:source('feature-right',rightSelection,rightBody.slice(0,rightBody.indexOf(`export function ${rightSelection}`)).split('\n').length)})
  ]);
  return{root,repository:new GitSourceRepository(root),base:git(root,['rev-parse','main']),artifacts};
}
async function analyzedSelectedIntegration(baseApp:string,sourceApp:string,candidateBranch:string){
  const root=createRepository({'.gitignore':'.ums/\n','src/App.tsx':baseApp});git(root,['switch','-c','feature']);
  writeFiles(root,{'src/App.tsx':sourceApp,'src/Selected.tsx':"export function Selected(){return <aside>Selected behavior</aside>}\n"});
  const branchCommit=commit(root,'selected integration plus co-located changes');
  const selected:SourceIdentity={boundaryId:'selected',instanceId:'selected-1',repositoryRelativePath:'src/Selected.tsx',line:1,column:8,componentName:'Selected',exportName:'Selected',branch:'feature',previewId:'left',sessionId:'session',generation:1,confidence:'exact'};
  const artifact=await new FeatureSliceAnalyzer(root).analyze({baseRef:'main',branchRef:'feature',expectedBranchCommit:branchCommit,selection:selected});
  const repository=new GitSourceRepository(root);const base=await repository.resolveRef('main');const generator=new CandidateGenerator(root,{verificationCommands:noOpVerification});
  return{root,repository,generator,request:{repositoryRoot:root,baseRef:'main',expectedBaseCommit:base,candidateBranch,artifacts:[artifact],analyzerSchemaVersion:2 as const}};
}

test('combines compatible declarations in one shared file and repeats with an identical tree',async()=>{
  const setup=await analyzedPair("export function Left(){return <div>LEFT</div>}\nexport function Right(){return <div>base right</div>}\n","export function Left(){return <div>base left</div>}\nexport function Right(){return <div>RIGHT</div>}\n");
  const generator=new CandidateGenerator(setup.root,{verificationCommands:noOpVerification});const request={repositoryRoot:setup.root,baseRef:'main',expectedBaseCommit:setup.base,candidateBranch:'combined-result',artifacts:setup.artifacts,analyzerSchemaVersion:2 as const};
  const first=await generator.generate(request);expect(first.status,first.message).toBe('succeeded');expect(first.plan.conflicts).toEqual([]);const output=await setup.repository.readFile('combined-result','src/Shared.tsx');expect(output).toContain('LEFT');expect(output).toContain('RIGHT');expect(await setup.repository.git(['rev-list','--count','main..combined-result'])).toBe('1');
  const second=await generator.generate(request);expect(second.status,second.message).toBe('succeeded');expect(second.repository).toMatchObject({candidateCommit:first.repository.candidateCommit,candidateTree:first.repository.candidateTree,idempotent:true});expect((await setup.repository.git(['worktree','list','--porcelain']))).not.toContain('ui-merge-studio-candidate-');
},90_000);

test('reconstructs exported arrow-function components from their complete variable declaration boundary',async()=>{
  const base="export const Left=()=> <div>base left</div>\nexport const Right=()=> <div>base right</div>\n";
  const root=createRepository({'.gitignore':'.ums/\n','src/Shared.tsx':base});
  git(root,['switch','-c','feature-left']);writeFiles(root,{'src/Shared.tsx':"export const Left=()=> <div>LEFT</div>\nexport const Right=()=> <div>base right</div>\n"});const leftCommit=commit(root,'left arrow change');
  git(root,['switch','main']);git(root,['switch','-c','feature-right']);writeFiles(root,{'src/Shared.tsx':"export const Left=()=> <div>base left</div>\nexport const Right=()=> <div>RIGHT</div>\n"});const rightCommit=commit(root,'right arrow change');
  const analyzer=new FeatureSliceAnalyzer(root);const artifacts=await Promise.all([
    analyzer.analyze({baseRef:'main',branchRef:'feature-left',expectedBranchCommit:leftCommit,selection:source('feature-left','Left',1)}),
    analyzer.analyze({baseRef:'main',branchRef:'feature-right',expectedBranchCommit:rightCommit,selection:source('feature-right','Right',2)})
  ]);
  const repository=new GitSourceRepository(root);const report=await new CandidateGenerator(root,{verificationCommands:noOpVerification}).generate({repositoryRoot:root,baseRef:'main',expectedBaseCommit:await repository.resolveRef('main'),candidateBranch:'combined-result',artifacts,analyzerSchemaVersion:2});
  expect(report.status,report.message).toBe('succeeded');
  const output=await repository.readFile('combined-result','src/Shared.tsx');expect(output).toContain('<div>LEFT</div>');expect(output).toContain('<div>RIGHT</div>');
});

test('projects an evidence-connected JSX child without copying an unrelated sibling from the same parent declaration',async()=>{
  const base="export function App(){return <main><section>Foundation content</section></main>}\n";
  const root=createRepository({'.gitignore':'.ums/\n','src/App.tsx':base});
  git(root,['switch','-c','feature']);
  writeFiles(root,{
    'src/App.tsx':"import { SelectedBanner } from './SelectedBanner';\nexport function App(){return <main><SelectedBanner/><section>Foundation content</section><p>Unselected sibling behavior</p></main>}\n",
    'src/SelectedBanner.tsx':"export function SelectedBanner(){return <aside>Selected behavior</aside>}\n"
  });
  const branchCommit=commit(root,'selected child plus unrelated sibling');
  const selected:SourceIdentity={boundaryId:'selected-banner',instanceId:'selected-banner-1',repositoryRelativePath:'src/SelectedBanner.tsx',line:1,column:8,componentName:'SelectedBanner',exportName:'SelectedBanner',branch:'feature',previewId:'left',sessionId:'session',generation:1,confidence:'exact'};
  const artifact=await new FeatureSliceAnalyzer(root).analyze({baseRef:'main',branchRef:'feature',expectedBranchCommit:branchCommit,selection:selected});
  expect(artifact.slice.status,JSON.stringify(artifact.slice.unresolvedDependencies,null,2)).toBe('resolved');
  expect(artifact.slice.boundary).toMatchObject({original:'SelectedBanner',analyzed:'App',status:'expanded-to-integration-boundary'});
  const repository=new GitSourceRepository(root);const baseCommit=await repository.resolveRef('main');
  const generator=new CandidateGenerator(root,{verificationCommands:noOpVerification});
  const request={repositoryRoot:root,baseRef:'main',expectedBaseCommit:baseCommit,candidateBranch:'combined-result',artifacts:[artifact],analyzerSchemaVersion:2 as const};
  const preflight=await generator.preflight(request);
  expect(preflight.plan.status,JSON.stringify(preflight.plan.unresolved,null,2)).toBe('ready');
  expect(preflight.plan.operations).toContainEqual(expect.objectContaining({
    kind:'replace-jsx-region',target:expect.objectContaining({path:'src/App.tsx',symbol:'App'}),
    jsxProjection:expect.objectContaining({mode:'insert-child',renderedBoundary:{path:'src/SelectedBanner.tsx',symbol:'SelectedBanner'},integrationBoundary:{path:'src/App.tsx',symbol:'App'},excludedSourceSiblingCount:1,anchor:expect.objectContaining({side:'before'})})
  }));
  const report=await generator.generate(request);
  expect(report.status,report.message).toBe('succeeded');
  const output=await repository.readFile('combined-result','src/App.tsx');
  expect(output).toContain('SelectedBanner');
  expect(output).toContain('Foundation content');
  expect(output).not.toContain('Unselected sibling behavior');
  expect(report.appliedOperations.find(item=>item.path==='src/App.tsx')?.detail).toContain('SelectedBanner');
},90_000);

test('refuses ambiguous JSX parent identity before creating a candidate worktree or branch',async()=>{
  const base="export function App(){return <><main><section>First</section></main><main><section>Second</section></main></>}\n";
  const root=createRepository({'.gitignore':'.ums/\n','src/App.tsx':base});git(root,['switch','-c','feature']);
  writeFiles(root,{
    'src/App.tsx':"import { SelectedBanner } from './SelectedBanner';\nexport function App(){return <><main><SelectedBanner/><section>First</section></main><main><section>Second</section></main></>}\n",
    'src/SelectedBanner.tsx':"export function SelectedBanner(){return <aside>Selected</aside>}\n"
  });
  const branchCommit=commit(root,'ambiguous parent insertion');
  const selected:SourceIdentity={boundaryId:'selected-banner',instanceId:'selected-banner-1',repositoryRelativePath:'src/SelectedBanner.tsx',line:1,column:8,componentName:'SelectedBanner',exportName:'SelectedBanner',branch:'feature',previewId:'left',sessionId:'session',generation:1,confidence:'exact'};
  const artifact=await new FeatureSliceAnalyzer(root).analyze({baseRef:'main',branchRef:'feature',expectedBranchCommit:branchCommit,selection:selected});const repository=new GitSourceRepository(root);const baseCommit=await repository.resolveRef('main');
  const generator=new CandidateGenerator(root,{verificationCommands:noOpVerification});const request={repositoryRoot:root,baseRef:'main',expectedBaseCommit:baseCommit,candidateBranch:'ambiguous-result',artifacts:[artifact],analyzerSchemaVersion:2 as const};
  const preflight=await generator.preflight(request);expect(preflight.plan.status).toBe('refused');expect(preflight.plan.unresolved.map(item=>item.reason).join(' ')).toContain('found 2 base parents');expect(preflight.plan.unresolved.map(item=>item.reason).join(' ')).toContain('Full declaration replacement fallback is forbidden');expect(preflight.plan.operations.some(item=>item.target.path==='src/App.tsx'&&item.kind==='replace-declaration')).toBe(false);
  const report=await generator.generate(request);expect(report.status).toBe('refused');expect(report.stage).toBe('plan');expect(report.cleanup.detail).toBe('No worktree created.');expect(await repository.resolveRef('ambiguous-result').catch(()=>null)).toBeNull();
},90_000);

test('refuses overlapping JSX expression replacement deterministically before candidate mutation',async()=>{
  const setup=await analyzedSelectedIntegration(
    "export function App({enabled}:{enabled:boolean}){return <main>{enabled ? <span>Foundation</span> : null}</main>}\n",
    "import { Selected } from './Selected';\nexport function App({enabled}:{enabled:boolean}){return <main>{enabled ? <span>UNRELATED SOURCE CHANGE</span> : <Selected/>}</main>}\n",
    'expression-refusal'
  );
  const first=await setup.generator.preflight(setup.request);const second=await setup.generator.preflight(setup.request);
  expect(second).toEqual(first);expect(first.plan.status).toBe('refused');
  const reason=first.plan.unresolved.map(item=>item.reason).join(' ');expect(reason).toContain('overlaps an expression or enclosing child replacement');expect(reason).toContain('Full declaration replacement fallback is forbidden');
  expect(first.plan.operations.some(item=>item.target.path==='src/App.tsx'&&(item.kind==='replace-jsx-region'||item.kind==='replace-declaration'))).toBe(false);
  const firstReport=await setup.generator.generate(setup.request);const secondReport=await setup.generator.generate(setup.request);
  expect(firstReport).toMatchObject({status:'refused',stage:'plan',cleanup:{detail:'No worktree created.'}});expect(secondReport.message).toBe(firstReport.message);
  expect(await setup.repository.resolveRef('expression-refusal').catch(()=>null)).toBeNull();expect((await setup.repository.git(['worktree','list','--porcelain']))).not.toContain('ui-merge-studio-candidate-');
  await expect(setup.repository.readFile('expression-refusal','src/App.tsx')).rejects.toThrow();expect(firstReport.message).not.toContain('UNRELATED SOURCE CHANGE');
},90_000);

test('refuses the historical controlled-fixture declaration-wide integration shape instead of widening ownership',async()=>{
  const setup=await analyzedSelectedIntegration(
    "export function App(){return <main><section>Foundation text</section></main>}\n",
    "import { useState } from 'react';\nimport { Selected } from './Selected';\nexport function App(){const [count,setCount]=useState(0);const track=()=>setCount(value=>value+1);return <div data-mode=\"source\" onClick={track}><Selected/><section>UNRELATED SOURCE TEXT {count}</section></div>}\n",
    'declaration-fallback-refusal'
  );
  const preflight=await setup.generator.preflight(setup.request);expect(preflight.plan.status).toBe('refused');
  expect(preflight.plan.unresolved).toContainEqual(expect.objectContaining({path:'src/App.tsx',reason:expect.stringContaining('Full declaration replacement fallback is forbidden')}));
  expect(preflight.plan.operations.filter(item=>item.target.path==='src/App.tsx')).toEqual([]);
  expect(JSON.stringify(preflight.plan.operations)).not.toContain('replace-declaration');
  const report=await setup.generator.generate(setup.request);expect(report).toMatchObject({status:'refused',stage:'plan',cleanup:{detail:'No worktree created.'}});
  expect(await setup.repository.resolveRef('declaration-fallback-refusal').catch(()=>null)).toBeNull();await expect(setup.repository.readFile('declaration-fallback-refusal','src/App.tsx')).rejects.toThrow();
},90_000);

test('deduplicates identical declaration requirements while retaining both slice identities',async()=>{
  const same="export function Left(){return <div>SAME</div>}\nexport function Right(){return <div>base right</div>}\n";const setup=await analyzedPair(same,same,'Left');
  const plan=(await new CandidateGenerator(setup.root,{verificationCommands:noOpVerification}).preflight({repositoryRoot:setup.root,baseRef:'main',expectedBaseCommit:setup.base,candidateBranch:'combined-result',artifacts:setup.artifacts,analyzerSchemaVersion:2})).plan;
  expect(plan.status).toBe('ready');const operation=plan.operations.find(item=>item.target.symbol==='Left')!;expect(operation.sliceIds).toHaveLength(2);expect(plan.operations.filter(item=>item.target.symbol==='Left')).toHaveLength(1);
});

test('refuses incompatible edits to the same declaration with source and evidence identities',async()=>{
  const setup=await analyzedPair("export function Left(){return <div>ONE</div>}\nexport function Right(){return <div>base right</div>}\n","export function Left(){return <div>TWO</div>}\nexport function Right(){return <div>base right</div>}\n",'Left');
  const preflight=await new CandidateGenerator(setup.root).preflight({repositoryRoot:setup.root,baseRef:'main',expectedBaseCommit:setup.base,candidateBranch:'combined-result',artifacts:setup.artifacts,analyzerSchemaVersion:2});expect(preflight.plan.status).toBe('refused');expect(preflight.plan.conflicts).toContainEqual(expect.objectContaining({kind:'overlapping-declaration',path:'src/Shared.tsx',symbol:'Left',sliceIds:expect.arrayContaining(setup.artifacts.map(item=>item.analysisId)),evidenceEdgeIds:expect.any(Array)}));expect(()=>git(setup.root,['rev-parse','combined-result'])).toThrow();
});

test('refuses conflicting import aliases and exported names before mutation',async()=>{
  const importSetup=await analyzedPair("import { One as Shared } from './One';\nexport function Left(){return <Shared/>}\nexport function Right(){return <div>base right</div>}\n","import { Two as Shared } from './Two';\nexport function Left(){return <Shared/>}\nexport function Right(){return <div>base right</div>}\n",'Left');
  const importPlan=(await new CandidateGenerator(importSetup.root).preflight({repositoryRoot:importSetup.root,baseRef:'main',expectedBaseCommit:importSetup.base,candidateBranch:'combined-result',artifacts:importSetup.artifacts,analyzerSchemaVersion:2})).plan;expect(importPlan.status).toBe('refused');expect(importPlan.conflicts).toContainEqual(expect.objectContaining({kind:'conflicting-import-alias',path:'src/Shared.tsx',symbol:'Shared'}));
  const operation=(id:string,sliceId:string,source:string):CandidateOperation=>({id,sliceIds:[sliceId],evidenceEdgeIds:[`edge:${sliceId}`],kind:'insert-export',source:{branchCommit:id.repeat(40).slice(0,40),path:'src/index.ts',region:null,contentHash:id},target:{path:'src/index.ts',region:null,symbol:'SharedExport'},precondition:{baseContentHash:'base',targetContentHash:null,description:'base'},postcondition:{expectedContentHash:id,description:'export'},detail:'controlled export conflict',exportRequirement:{exported:'SharedExport',imported:'One',source}});
  const generator=new CandidateGenerator(importSetup.root);const detect=(generator as unknown as {detectConflicts(operations:CandidateOperation[]):CandidateConflict[]}).detectConflicts.bind(generator);expect(detect([operation('a','slice-left','./One'),operation('b','slice-right','./Two')])).toContainEqual(expect.objectContaining({kind:'conflicting-export',path:'src/index.ts',symbol:'SharedExport',sliceIds:['slice-left','slice-right']}));
},60_000);

describe('preflight input and unsupported-slice safeguards',()=>{
  const fixture=resolve(import.meta.dirname,'../../fixtures/generated/product-catalogue');const repository=new GitSourceRepository(fixture);
  async function realArtifacts(){const analyzer=new FeatureSliceAnalyzer(fixture);const make=(branch:string,path:string,line:number,name:string):SourceIdentity=>({boundaryId:name,instanceId:`${name}-instance`,repositoryRelativePath:path,line,column:8,componentName:name,exportName:name,branch,previewId:branch,sessionId:`${branch}-session`,generation:1,confidence:'exact'});return Promise.all([analyzer.analyze({baseRef:'main',branchRef:'branch-a',expectedBranchCommit:await repository.resolveRef('branch-a'),selection:make('branch-a','src/features/catalogue/CategorySidebar.tsx',10,'CategorySidebar')}),analyzer.analyze({baseRef:'main',branchRef:'branch-b',expectedBranchCommit:await repository.resolveRef('branch-b'),selection:make('branch-b','src/features/catalogue/ProductQuickViewShelf.tsx',9,'ProductQuickViewShelf')})]);}
  test('rejects stale base, invalid branch, unsupported schema, partial slices, and missing evidence',async()=>{const artifacts=await realArtifacts();const base=await repository.resolveRef('main');const generator=new CandidateGenerator(fixture);const request={repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'combined-result',artifacts,analyzerSchemaVersion:2};
    const cases:[string,typeof request][]=[
      ['Stale base commit',{...request,expectedBaseCommit:'0'.repeat(40)}],
      ['Invalid candidate branch',{...request,candidateBranch:'Combined/Unsafe'}],
      ['Unsupported analyzer schema',{...request,analyzerSchemaVersion:1 as 2}],
      ['only resolved slices',{...request,artifacts:[rehash(Object.assign(clone(artifacts[0]),{slice:{...clone(artifacts[0]).slice,status:'partial'}})),artifacts[1]]}],
      ['only resolved slices',{...request,artifacts:[rehash(Object.assign(clone(artifacts[0]),{slice:{...clone(artifacts[0]).slice,status:'refused'}})),artifacts[1]]}],
      ['Feature branch',{...request,artifacts:[rehash((()=>{const item=clone(artifacts[0]);item.slice.repository.branchCommit='0'.repeat(40);return item;})()),artifacts[1]]}],
      ['Feature branch validation failed',{...request,artifacts:[rehash((()=>{const item=clone(artifacts[0]);item.slice.repository.branchRef='foreign-feature';item.slice.selection.branch='foreign-feature';return item;})()),artifacts[1]]}],
      ['missing evidence',{...request,artifacts:[rehash((()=>{const item=clone(artifacts[0]);item.slice.includedChanges[0].evidenceEdgeIds=['missing-edge'];return item;})()),artifacts[1]]}]
    ];
    for(const [message,value] of cases){const result=await generator.preflight(value);expect(result.plan.status,message).toBe('refused');expect(result.plan.unresolved.some(item=>item.reason.includes(message)),JSON.stringify(result.plan.unresolved)).toBe(true);}
  },120_000);
  test('refuses path traversal, unresolved test dependencies, and mixed-file stylesheet ownership',async()=>{const artifacts=await realArtifacts();const base=await repository.resolveRef('main');const generator=new CandidateGenerator(fixture);
    const unresolved=clone(artifacts[1]);unresolved.slice.unresolvedDependencies.push({path:'src/test/inspector.test.tsx',symbol:null,reason:'Synthetic unresolved helper',edge:'test-support',manualNextStep:'Resolve helper ownership.',ancestorBoundaryMayHelp:false});rehash(unresolved);
    const partialCss=clone(artifacts[0]);const style=partialCss.slice.includedChanges.find(item=>item.path==='src/features/catalogue/category-sidebar.css')!;partialCss.slice.excludedChanges.push({path:style.path,symbol:null,branchChangeId:style.branchChangeId,classification:'ambiguous-shared-region',proof:'unproven',reason:'Synthetic unrelated CSS rule in the same file.'});rehash(partialCss);
    const traversal=clone(artifacts[0]);const original=traversal.slice.includedChanges[0].path;traversal.slice.includedChanges[0].path='../escape.ts';traversal.slice.changedFiles.find(item=>item.path===original)!.path='../escape.ts';rehash(traversal);
    const first=await generator.preflight({repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'combined-result',artifacts:[artifacts[0],unresolved],analyzerSchemaVersion:2});expect(first.plan.status).toBe('refused');expect(first.plan.unresolved.some(item=>item.reason.includes('unresolved dependencies'))).toBe(true);
    const second=await generator.preflight({repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'combined-result',artifacts:[partialCss,artifacts[1]],analyzerSchemaVersion:2});expect(second.plan.status).toBe('refused');expect(second.plan.unresolved).toContainEqual(expect.objectContaining({path:'src/features/catalogue/category-sidebar.css',reason:expect.stringContaining('contains excluded source changes')}));
    const third=await generator.preflight({repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'combined-result',artifacts:[traversal,artifacts[1]],analyzerSchemaVersion:2});expect(third.plan.status).toBe('refused');expect(third.plan.unresolved).toContainEqual(expect.objectContaining({path:'../escape.ts',reason:expect.stringContaining('Unsafe repository-relative path')}));
  },90_000);
});

test('refuses the real Product Catalogue product-ID contract conflict before mutation',async()=>{
  const fixture=resolve(import.meta.dirname,'../../fixtures/generated/product-catalogue');const repository=new GitSourceRepository(fixture);const analyzer=new FeatureSliceAnalyzer(fixture);
  const make=(branch:string,path:string,line:number,name:string):SourceIdentity=>({boundaryId:name,instanceId:`${name}-instance`,repositoryRelativePath:path,line,column:8,componentName:name,exportName:name,branch,previewId:branch,sessionId:`${branch}-session`,generation:1,confidence:'exact'});
  const artifacts=await Promise.all([
    analyzer.analyze({baseRef:'main',branchRef:'branch-b',expectedBranchCommit:await repository.resolveRef('branch-b'),selection:make('branch-b','src/features/catalogue/ProductQuickViewShelf.tsx',9,'ProductQuickViewShelf')}),
    analyzer.analyze({baseRef:'main',branchRef:'branch-incompatible',expectedBranchCommit:await repository.resolveRef('branch-incompatible'),selection:make('branch-incompatible','src/features/catalogue/ProductIdentityBadge.tsx',2,'ProductIdentityBadge')})
  ]);
  expect(artifacts.map(item=>item.slice.status)).toEqual(['resolved','resolved']);
  const preflight=await new CandidateGenerator(fixture).preflight({repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:await repository.resolveRef('main'),candidateBranch:'incompatible-result',artifacts,analyzerSchemaVersion:2});
  expect(preflight.plan.status).toBe('refused');
  expect(preflight.plan.conflicts).toContainEqual(expect.objectContaining({kind:'changed-dependency-contract',path:'src/types/product.ts',symbol:'Product',sliceIds:expect.arrayContaining(artifacts.map(item=>item.analysisId)),reason:expect.stringContaining('existing Product contract')}));
  await expect(repository.resolveRef('incompatible-result')).rejects.toThrow();
},90_000);

test('verification failure leaves no branch and removes the temporary worktree',async()=>{const setup=await analyzedPair("export function Left(){return <div>LEFT</div>}\nexport function Right(){return <div>base right</div>}\n","export function Left(){return <div>base left</div>}\nexport function Right(){return <div>RIGHT</div>}\n");const before=await Promise.all(['feature-left','feature-right'].map(ref=>setup.repository.resolveRef(ref)));const generator=new CandidateGenerator(setup.root,{verificationCommands:[{name:'intentional-failure',executable:process.execPath,args:['-e','process.exit(7)']}]});const report=await generator.generate({repositoryRoot:setup.root,baseRef:'main',expectedBaseCommit:setup.base,candidateBranch:'combined-result',artifacts:setup.artifacts,analyzerSchemaVersion:2});expect(report.status).toBe('failed');expect(report.verification).toContainEqual(expect.objectContaining({name:'intentional-failure',status:'failed',exitCode:7}));expect(report.cleanup.worktreeRemoved).toBe(true);expect(()=>git(setup.root,['rev-parse','combined-result'])).toThrow();expect(await Promise.all(['feature-left','feature-right'].map(ref=>setup.repository.resolveRef(ref)))).toEqual(before);});

test('an existing candidate with an unexpected tree is preserved and refused',async()=>{const setup=await analyzedPair("export function Left(){return <div>LEFT</div>}\nexport function Right(){return <div>base right</div>}\n","export function Left(){return <div>base left</div>}\nexport function Right(){return <div>RIGHT</div>}\n");git(setup.root,['branch','combined-result','feature-left']);const before=await setup.repository.resolveRef('combined-result');const report=await new CandidateGenerator(setup.root,{verificationCommands:noOpVerification}).generate({repositoryRoot:setup.root,baseRef:'main',expectedBaseCommit:setup.base,candidateBranch:'combined-result',artifacts:setup.artifacts,analyzerSchemaVersion:2});expect(report.status).toBe('refused');expect(report.message).toContain('different tree');expect(await setup.repository.resolveRef('combined-result')).toBe(before);expect(report.cleanup.worktreeRemoved).toBe(true);});
