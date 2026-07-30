import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { CandidateGenerator } from '../packages/candidate-generation/src/candidateGenerator';
import { FeatureSliceAnalyzer } from '../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../packages/source-analysis/src/gitModel';
import type { FeatureSliceArtifact } from '../packages/source-analysis/src/types';
import { validatePublicShowcaseReport, type ArtifactId, type FeatureId, type PublicFeature, type PublicShowcaseReport } from '../packages/showcase-evidence/src/schema';
import { captureShowcaseSelections } from './capture-showcase-selections';
import { verifyFixture } from './verify-phase0-fixture';
import { generatedManifestPath, hashDirectory, manifestHash, normalizedJson, publicRoot, reportPath, repositoryRoot } from './showcase-lib';

const fixture = resolve(repositoryRoot, 'fixtures/generated/product-catalogue');
const repo = new GitSourceRepository(fixture);
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const artifactRoot = resolve(publicRoot, 'showcase-runs');
const publicRepository = 'https://github.com/varun-raj-77/ui-merge-studio';
const commands = ['npm ci --no-audit --no-fund','npm run typecheck','npm test','npm test -- src/test/category-sidebar.test.tsx src/test/quick-view.test.tsx','npm run build'];

function git(args: string[], cwd = fixture) { return execFileSync('git', ['-c', `safe.directory=${fixture.replaceAll('\\', '/')}`, ...args], { cwd, encoding:'utf8', stdio:['ignore','pipe','pipe'] }).trim(); }
function run(command: string, args: string[], cwd: string) { execFileSync(command, args, { cwd, stdio:'inherit', shell:process.platform === 'win32' }); }
function cleanCommand(name:string) { return ({ install:commands[0],typecheck:commands[1],tests:commands[2],'focused-feature-tests':commands[3],'production-build':commands[4] } as Record<string,string>)[name] ?? name; }
function gatePurpose(name:string) { return ({ install:'Install exactly the locked fixture dependencies.',typecheck:'Check the generated candidate with TypeScript.',tests:'Run the complete Product Catalogue fixture suite.','focused-feature-tests':'Run the two AST-selected feature test modules.','production-build':'Compile the candidate as a production Vite application.' } as Record<string,string>)[name] ?? 'Verify the generated candidate.'; }
function feature(id:FeatureId,name:string,summary:string,branchLabel:'Branch A'|'Branch B',artifact:FeatureSliceArtifact):PublicFeature {
  const slice=artifact.slice;const sourceFile=slice.selection.repositoryRelativePath;const support=new Map<string,string>();
  for(const item of slice.includedChanges)if(item.path!==sourceFile)support.set(item.path,item.reason);
  return { id,name,summary,branchLabel,branch:slice.repository.branchRef,branchCommit:slice.repository.branchCommit,selectedBoundary:slice.boundary.original,analyzedBoundary:slice.boundary.analyzed,sourceFile,sourceLine:slice.selection.line,supportingFiles:[...support].map(([path,reason])=>({path,reason})).sort((a,b)=>a.path.localeCompare(b.path)),excludedFiles:slice.excludedChanges.map(item=>({path:item.path,symbol:item.symbol?.name??null,reason:item.reason})).sort((a,b)=>`${a.path}:${a.symbol}`.localeCompare(`${b.path}:${b.symbol}`)) };
}
function buildArtifact(id:ArtifactId,label:string,ref:string,commit:string,outputRoot:string,temporaryRoot:string) {
  const worktree=resolve(temporaryRoot,id);git(['worktree','add','--detach',worktree,commit]);
  try { run(npmExecutable,['ci','--no-audit','--no-fund'],worktree);run(npmExecutable,['run','build','--','--base=./'],worktree);const dist=resolve(worktree,'dist');if(!existsSync(resolve(dist,'index.html')))throw new Error(`Missing build output for ${id}.`);const target=resolve(outputRoot,id);mkdirSync(target,{recursive:true});cpSync(dist,target,{recursive:true});const indexPath=resolve(target,'index.html');writeFileSync(indexPath,`<base href="./"><script>history.replaceState({}, "", "/catalogue")</script>${readFileSync(indexPath,'utf8')}`);return{id,label,ref,commit,path:`/showcase-runs/${outputRoot.split(/[\\/]/).at(-1)}/${id}/`,sha256:hashDirectory(target)}; }
  finally { try{git(['worktree','remove','--force',worktree]);}catch{} }
}

export async function prepareShowcase() {
  if(!existsSync(resolve(fixture,'.git')))throw new Error('Missing controlled fixture. Run npm run fixture:create.');
  verifyFixture(fixture);
  const base=await repo.resolveRef('main');const branchA=await repo.resolveRef('branch-a');const branchB=await repo.resolveRef('branch-b');const incompatibleCommit=await repo.resolveRef('branch-incompatible');
  if(await repo.git(['merge-base','branch-a','branch-b'])!==base)throw new Error('Incompatible common base for controlled branches.');
  const selections=await captureShowcaseSelections(fixture,resolve(repositoryRoot,'apps/studio/preview.vite.config.ts'));
  const analyzer=new FeatureSliceAnalyzer(fixture);
  const [category,quickView,incompatible]=await Promise.all([
    analyzer.analyze({baseRef:'main',branchRef:'branch-a',expectedBranchCommit:branchA,selection:selections.categorySidebar}),
    analyzer.analyze({baseRef:'main',branchRef:'branch-b',expectedBranchCommit:branchB,selection:selections.quickView}),
    analyzer.analyze({baseRef:'main',branchRef:'branch-incompatible',expectedBranchCommit:incompatibleCommit,selection:selections.identityBadge})
  ]);
  for(const artifact of [category,quickView,incompatible])if(artifact.slice.status!=='resolved')throw new Error(`Visual selection did not resolve: ${artifact.slice.status}.`);
  const generator=new CandidateGenerator(fixture,{artifactRoot:repositoryRoot});
  const generated=await generator.generate({repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'combined-result',artifacts:[category,quickView],analyzerSchemaVersion:2});
  if(generated.status!=='succeeded'||!generated.repository.candidateCommit)throw new Error(`Candidate generation failed: ${generated.message}`);
  const refusal=await generator.preflight({repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'incompatible-result',artifacts:[quickView,incompatible],analyzerSchemaVersion:2});
  const conflict=refusal.plan.conflicts.find(item=>item.kind==='changed-dependency-contract');
  if(refusal.plan.status!=='refused'||!conflict)throw new Error('The Product.id incompatibility was not refused by engine preflight.');
  const candidate=generated.repository.candidateCommit;const stableRunId=createHash('sha256').update([base,branchA,branchB,candidate].join(':')).digest('hex').slice(0,16);const outputRoot=resolve(artifactRoot,stableRunId);const temporaryRoot=mkdtempSync(resolve(tmpdir(),'ui-merge-showcase-'));rmSync(outputRoot,{recursive:true,force:true});mkdirSync(outputRoot,{recursive:true});
  try {
    const artifacts=[
      buildArtifact('baseline','Baseline','main',base,outputRoot,temporaryRoot),
      buildArtifact('branch-a','Branch A','branch-a',branchA,outputRoot,temporaryRoot),
      buildArtifact('branch-b','Branch B','branch-b',branchB,outputRoot,temporaryRoot),
      buildArtifact('combined-result','Combined result','combined-result',candidate,outputRoot,temporaryRoot)
    ] as PublicShowcaseReport['artifacts'];
    const withoutHash={
      schemaVersion:2,runId:stableRunId,generatedAt:new Date().toISOString(),fixture:'fixtures/generated/product-catalogue',engineVersion:generated.version,
      repository:{baseRef:'main',commonBaseCommit:base,branchA:{name:'branch-a',commit:branchA},branchB:{name:'branch-b',commit:branchB},candidateBranch:'combined-result',candidateCommit:candidate,compatibility:'compatible'},
      selectedFeatureIds:['category-sidebar','quick-view'],
      features:[feature('category-sidebar','Collapsible category sidebar','Filters the product grid and preserves accessible collapse state.','Branch A',category),feature('quick-view','Product quick-view inspector','Opens a focused, keyboard-dismissible product detail panel.','Branch B',quickView)],
      refusal:{status:'refused',branch:'branch-incompatible',branchCommit:incompatibleCommit,selectedBoundary:incompatible.slice.boundary.original,sourceFile:incompatible.slice.selection.repositoryRelativePath,sourceLine:incompatible.slice.selection.line,pairedWith:'quick-view',conflictKind:conflict.kind,contractPath:conflict.path,contractSymbol:conflict.symbol,reason:conflict.reason,manualResolution:conflict.manualResolution,evidenceReference:`run-report.json#/refusal`},
      verification:generated.verification.map(item=>({id:item.name,command:cleanCommand(item.name),purpose:gatePurpose(item.name),exitCode:item.exitCode,result:'passed',evidenceReference:`run-report.json#/verification/${item.name}`})),
      commands:['npm run showcase:prepare',...commands],result:'succeeded',artifacts,
      links:{report:`${publicRepository}/blob/main/docs/evidence/showcase/latest/run-report.json`,completion:`${publicRepository}/blob/main/docs/evaluation.md`,evaluation:`${publicRepository}/blob/main/docs/evaluation.md`,architecture:`${publicRepository}/blob/main/docs/adr/0010-recorded-real-artifact-showcase.md`,limitations:`${publicRepository}/blob/main/docs/limitations.md`,source:publicRepository,localSetup:`${publicRepository}#run-the-controlled-demo`}
    } satisfies Omit<PublicShowcaseReport,'manifestSha256'>;
    const report=validatePublicShowcaseReport({...withoutHash,manifestSha256:manifestHash(withoutHash)});mkdirSync(dirname(reportPath),{recursive:true});mkdirSync(dirname(generatedManifestPath),{recursive:true});writeFileSync(reportPath,normalizedJson(report));writeFileSync(generatedManifestPath,normalizedJson(report));console.log(`PASS: prepared Product Catalogue engine run ${stableRunId} at ${candidate}.`);
  } finally { rmSync(temporaryRoot,{recursive:true,force:true});if(git(['worktree','list','--porcelain']).includes('ui-merge-showcase-'))throw new Error('Temporary Showcase worktree cleanup failed.'); }
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))prepareShowcase();
