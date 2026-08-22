import { resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { LocalPlanAuthority, localRepositoryId } from '../../apps/studio/localPlanAuthority';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { localIntegrationPlanIdentity } from '../../packages/integration-plan/src/localPlan';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { instrumentReactSource } from '../../packages/source-instrumentation/src/instrumentReactSource';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

afterEach(cleanupRepositories);
const noOpVerification = [{ name: 'proof-verification', executable: process.execPath, args: ['-e', 'process.exit(0)'] }];

function baseRepository() {
  return createRepository({
    'package.json': '{"scripts":{"typecheck":"tsc --noEmit","test":"echo ok","build":"vite build"}}\n',
    'src/App.tsx': "export function App(){return <main><h1>Dashboard</h1></main>}\n"
  });
}

function preview(root:string,branchCommit:string):PreviewSession {
  return { previewId:'right',branch:'prompt020-revenue-pulse',repositoryPath:root,commit:branchCommit,branchCommit,packageManager:'npm',generation:1,sessionId:'prompt020-rendered-session',protocolVersion:2,url:'http://127.0.0.1:5191',origin:'http://127.0.0.1:5191',port:5191,processId:5191,worktreePath:root,status:'running',failure:null };
}

async function artifactFromRenderedSelection(root:string,branchCommit:string,path='src/features/revenue/RevenuePulseBadge.tsx',componentName='RevenuePulseBadge') {
  const current=preview(root,branchCommit); const repository=new GitSourceRepository(root); const source=await repository.readFile(branchCommit,path);
  const instrumented=instrumentReactSource(source,resolve(root,path),{repositoryRoot:root,branch:current.branch,selectionReceipt:()=>`rendered-${'p'.repeat(32)}`});
  const mapping=instrumented?.boundaries.find(item=>item.source.componentName===componentName);
  if(!mapping)throw new Error(`Missing instrumented boundary ${componentName}.`);
  const authority=new LocalPlanAuthority(root,localRepositoryId(root),'main','combined-result',()=>current,()=>[current],'external-react-vite');
  authority.registerInstrumentedBoundaries(current,[mapping]);
  const selection=authority.resolveRenderedSelection(current,mapping.selectionReceipt);
  const artifact=await new FeatureSliceAnalyzer(root).analyzeExternal({baseRef:'main',branchRef:current.branch,expectedBranchCommit:branchCommit,selection});
  const evidence=await authority.register(current,artifact,'/');
  const plan={version:2 as const,foundation:evidence.foundation,selections:[evidence.selection]};
  const projected=await authority.project({plan,planIdentity:localIntegrationPlanIdentity(plan)});
  return {artifact,request:projected.request};
}

function writeRevenueFeature(root:string,app:string,extra:Record<string,string>={}) {
  writeFiles(root,{
    'src/App.tsx':app,
    'src/features/revenue/RevenuePulseBadge.tsx':"import icon from './pulse.svg';\nimport { useRevenuePulse } from './useRevenuePulse';\nexport function RevenuePulseBadge(){const pulse=useRevenuePulse();return <section aria-label=\"Revenue pulse\"><img src={icon} alt=\"\"/><strong>{pulse.label}</strong></section>}\nexport const unrelatedRevenueCopy='Unrelated module export';\n",
    'src/features/revenue/useRevenuePulse.ts':"import { useMemo } from 'react';\nimport { revenueStates, type RevenueState } from './revenueState';\nexport const useRevenuePulse=():RevenueState=>useMemo(()=>revenueStates.healthy,[]);\n",
    'src/features/revenue/revenueState.ts':"export interface RevenueState { label:string }\nexport const revenueStates:Record<'healthy',RevenueState>={healthy:{label:'Revenue pulse: healthy'}};\n",
    'src/features/revenue/pulse.svg':'<svg xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="7"/></svg>\n',
    'src/FooterExperiment.tsx':"export function FooterExperiment(){return <footer>Unrelated footer experiment</footer>}\n",
    ...extra
  });
}

describe('bounded external React/Vite candidate generation',()=>{
  test('generates only a rendered feature slice and repeats to the identical tree',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);
    writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n");
    const branchCommit=commit(root,'feat: revenue pulse plus unrelated footer experiment');const {artifact,request}=await artifactFromRenderedSelection(root,branchCommit);
    expect(artifact.slice.status).toBe('resolved');
    const generator=new CandidateGenerator(root,{artifactRoot:resolve(process.cwd()),verificationCommands:noOpVerification});const preflight=await generator.preflight(request);
    expect(preflight.plan.status,JSON.stringify(preflight.plan,null,2)).toBe('ready');
    expect(preflight.plan.repository.generationProfile).toBe('external-react-vite');
    expect(new Set(preflight.plan.operations.map(item=>item.target.path))).toEqual(new Set([
      'src/App.tsx','src/features/revenue/RevenuePulseBadge.tsx','src/features/revenue/pulse.svg','src/features/revenue/revenueState.ts','src/features/revenue/useRevenuePulse.ts'
    ]));
    const first=await generator.generate(request);const second=await generator.generate(request);
    expect(first).toMatchObject({status:'succeeded',repository:{candidateBranch:'combined-result',idempotent:false}});
    expect(second).toMatchObject({status:'succeeded',repository:{candidateBranch:'combined-result',idempotent:true,candidateTree:first.repository.candidateTree}});
    expect(git(root,['diff','--name-only','main..combined-result']).split(/\r?\n/)).toEqual([
      'src/App.tsx','src/features/revenue/RevenuePulseBadge.tsx','src/features/revenue/pulse.svg','src/features/revenue/revenueState.ts','src/features/revenue/useRevenuePulse.ts'
    ]);
    expect(git(root,['grep','-n','Revenue pulse: healthy','combined-result'])).toContain('revenueState.ts');
    expect(()=>git(root,['grep','-n','Unrelated footer experiment','combined-result'])).toThrow();
    expect(()=>git(root,['grep','-n','Unrelated module export','combined-result'])).toThrow();
    expect(git(root,['show','-s','--format=%B','combined-result'])).toContain(`UI-Merge-Plan: ${request.integrationPlan!.identity}`);
    expect(git(root,['show','-s','--format=%B','combined-result'])).toContain(`UI-Merge-Generation: ${first.generationId}`);
    expect(git(root,['show','-s','--format=%B','combined-result'])).toContain('UI-Merge-Profile: external-react-vite');
  });

  test('refuses an added source module with unrelated unindexed top-level content',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);
    writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n",{
      'src/features/revenue/RevenuePulseBadge.tsx':"import icon from './pulse.svg';\nimport { useRevenuePulse } from './useRevenuePulse';\nexport function RevenuePulseBadge(){const pulse=useRevenuePulse();return <section aria-label=\"Revenue pulse\"><img src={icon} alt=\"\"/>{pulse.label}</section>}\nclass UnindexedRevenueWorker {}\n"
    });
    const analyzed=await artifactFromRenderedSelection(root,commit(root));
    expect(analyzed.artifact.slice.status).toBe('resolved');
    const preflight=await new CandidateGenerator(root).preflight(analyzed.request);
    expect(preflight.plan.status).toBe('refused');
    expect(preflight.plan.unresolved).toContainEqual(expect.objectContaining({path:'src/features/revenue/RevenuePulseBadge.tsx',reason:expect.stringContaining('Unsupported top-level ClassDeclaration')}));
    expect(()=>git(root,['rev-parse','combined-result'])).toThrow();
  });

  test('refuses an added source module with a program directive',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);
    writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n",{
      'src/features/revenue/RevenuePulseBadge.tsx':"\"use client\";\nimport { useRevenuePulse } from './useRevenuePulse';\nexport function RevenuePulseBadge(){const pulse=useRevenuePulse();return <section aria-label=\"Revenue pulse\">{pulse.label}</section>}\n"
    });
    const analyzed=await artifactFromRenderedSelection(root,commit(root));
    expect(analyzed.artifact.slice.status).toBe('resolved');
    const preflight=await new CandidateGenerator(root).preflight(analyzed.request);
    expect(preflight.plan.status).toBe('refused');
    expect(preflight.plan.unresolved).toContainEqual(expect.objectContaining({path:'src/features/revenue/RevenuePulseBadge.tsx',reason:expect.stringContaining('Unsupported program directive ownership')}));
    expect(preflight.plan.unresolved.map(item=>item.reason).join(' ')).toContain('"use client"');
    expect(()=>git(root,['rev-parse','combined-result'])).toThrow();
  });

  test('refuses a whole global stylesheet, including a mixed used and unrelated rule',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);
    writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n",{
      'src/features/revenue/RevenuePulseBadge.tsx':"import './revenue-pulse.css';\nimport { useRevenuePulse } from './useRevenuePulse';\nexport function RevenuePulseBadge(){const pulse=useRevenuePulse();return <section className=\"revenue-pulse\" aria-label=\"Revenue pulse\">{pulse.label}</section>}\n",
      'src/features/revenue/revenue-pulse.css':'.revenue-pulse{display:flex}\n.unrelated-admin-shell{position:fixed}\n'
    });
    const analyzed=await artifactFromRenderedSelection(root,commit(root));const preflight=await new CandidateGenerator(root).preflight(analyzed.request);
    expect(preflight.plan.status).toBe('refused');
    expect(preflight.plan.unresolved).toContainEqual(expect.objectContaining({path:'src/features/revenue/revenue-pulse.css',reason:expect.stringContaining('CSS rule ownership is not implemented')}));
    expect(()=>git(root,['rev-parse','combined-result'])).toThrow();
  });

  test('refuses an added asset shared with an unrelated project declaration',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);
    writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n",{
      'src/features/revenue/UnrelatedBadge.tsx':"import icon from './pulse.svg';\nexport function UnrelatedBadge(){return <img src={icon} alt=\"Unrelated\"/>}\n"
    });
    const analyzed=await artifactFromRenderedSelection(root,commit(root));
    expect(analyzed.artifact.slice.status).toBe('refused');
    expect(analyzed.artifact.slice.unresolvedDependencies).toContainEqual(expect.objectContaining({path:'src/features/revenue/pulse.svg',edge:'non-exclusive-atomic-dependency',reason:expect.stringContaining('UnrelatedBadge')}));
    const preflight=await new CandidateGenerator(root).preflight(analyzed.request);expect(preflight.plan.status).toBe('refused');
    expect(()=>git(root,['rev-parse','combined-result'])).toThrow();
  });

  test('refuses stale feature-slice evidence after the source branch moves',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);
    writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n");
    const analyzed=await artifactFromRenderedSelection(root,commit(root));writeFiles(root,{'src/after-analysis.ts':"export const moved=true;\n"});commit(root,'move feature branch');
    const preflight=await new CandidateGenerator(root).preflight(analyzed.request);
    expect(preflight.plan.status).toBe('refused');expect(preflight.plan.unresolved).toContainEqual(expect.objectContaining({reason:expect.stringContaining('Feature branch prompt020-revenue-pulse moved')}));
    expect(()=>git(root,['rev-parse','combined-result'])).toThrow();
  });

  test('refuses same-tree candidate reuse when the existing commit has the wrong parent',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n");
    const branchCommit=commit(root);const {request}=await artifactFromRenderedSelection(root,branchCommit);const generator=new CandidateGenerator(root,{artifactRoot:resolve(process.cwd()),verificationCommands:noOpVerification});const first=await generator.generate(request);
    expect(first.status,first.message).toBe('succeeded');git(root,['branch','-D','combined-result']);
    const wrongParentCommit=git(root,['-c','user.name=Test','-c','user.email=test@example.invalid','commit-tree',first.repository.candidateTree!,'-p',branchCommit,'-m','Tree-equivalent commit with wrong parent']);
    git(root,['branch','combined-result',wrongParentCommit]);const replay=await generator.generate(request);
    expect(replay.status).toBe('refused');expect(replay.repository.idempotent).not.toBe(true);expect(replay.message).toContain('not exactly the expected foundation parent');expect(git(root,['rev-parse','combined-result'])).toBe(wrongParentCommit);
  });

  test('refuses same-tree same-parent reuse when canonical-plan provenance differs',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n");
    const branchCommit=commit(root);const {request}=await artifactFromRenderedSelection(root,branchCommit);const generator=new CandidateGenerator(root,{artifactRoot:resolve(process.cwd()),verificationCommands:noOpVerification});const first=await generator.generate(request);
    expect(first.status,first.message).toBe('succeeded');git(root,['branch','-D','combined-result']);
    const message=`Generate verified UI Merge Studio candidate\n\nUI-Merge-Plan: plan-v2-deadbeef\nUI-Merge-Generation: ${first.generationId}\nUI-Merge-Profile: external-react-vite`;
    const wrongPlanCommit=git(root,['-c','user.name=Test','-c','user.email=test@example.invalid','commit-tree',first.repository.candidateTree!,'-p',request.expectedBaseCommit,'-m',message]);
    git(root,['branch','combined-result',wrongPlanCommit]);const replay=await generator.generate(request);
    expect(replay.status).toBe('refused');expect(replay.repository.idempotent).not.toBe(true);expect(replay.message).toContain('plan/generation provenance does not match');expect(git(root,['rev-parse','combined-result'])).toBe(wrongPlanCommit);
  });

  test('refuses same-tree same-parent reuse when provenance trailers are missing',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n");
    const branchCommit=commit(root);const {request}=await artifactFromRenderedSelection(root,branchCommit);const generator=new CandidateGenerator(root,{artifactRoot:resolve(process.cwd()),verificationCommands:noOpVerification});const first=await generator.generate(request);
    expect(first.status,first.message).toBe('succeeded');git(root,['branch','-D','combined-result']);
    const missingProvenanceCommit=git(root,['-c','user.name=Test','-c','user.email=test@example.invalid','commit-tree',first.repository.candidateTree!,'-p',request.expectedBaseCommit,'-m','Tree-equivalent commit without provenance']);
    git(root,['branch','combined-result',missingProvenanceCommit]);const replay=await generator.generate(request);
    expect(replay.status).toBe('refused');expect(replay.repository.idempotent).not.toBe(true);expect(replay.message).toContain('plan/generation provenance does not match');expect(git(root,['rev-parse','combined-result'])).toBe(missingProvenanceCommit);
  });

  test('refuses a dirty source repository before candidate generation',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n");
    const analyzed=await artifactFromRenderedSelection(root,commit(root));writeFiles(root,{'src/dirty-after-analysis.ts':'export const dirty=true;\n'});
    const preflight=await new CandidateGenerator(root).preflight(analyzed.request);expect(preflight.plan.status).toBe('refused');expect(preflight.plan.unresolved).toContainEqual(expect.objectContaining({reason:expect.stringContaining('working tree is dirty')}));expect(()=>git(root,['rev-parse','combined-result'])).toThrow();
  });

  test('refuses when a foundation file hash changes in the candidate worktree after planning',async()=>{
    const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);writeRevenueFeature(root,"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';\nexport function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n");
    const analyzed=await artifactFromRenderedSelection(root,commit(root));const generator=new CandidateGenerator(root,{verificationCommands:noOpVerification,onWorktreePrepared:worktree=>writeFiles(worktree,{'src/App.tsx':'export function App(){return <main>changed after planning</main>}\n'})});
    const report=await generator.generate(analyzed.request);expect(report.status).toBe('refused');expect(report.message).toContain('Base content hash precondition failed for src/App.tsx');expect(report.cleanup.worktreeRemoved).toBe(true);expect(()=>git(root,['rev-parse','combined-result'])).toThrow();
  });

  test('refuses an unsupported dynamic import and a missing dependency during strict slicing',async()=>{
    for(const source of [
      "const path='./RevenueDetails';export function RevenuePulseBadge(){void import(path);return <section>Revenue pulse</section>}\n",
      "import { copy } from './missingRevenueConfig';export function RevenuePulseBadge(){return <section>{copy}</section>}\n"
    ]){
      const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);writeFiles(root,{
        'src/App.tsx':"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';export function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}\n",
        'src/features/revenue/RevenuePulseBadge.tsx':source
      });
      const {artifact}=await artifactFromRenderedSelection(root,commit(root));
      expect(artifact.slice.status).toBe('refused');expect(artifact.slice.unresolvedDependencies).toContainEqual(expect.objectContaining({edge:'unresolved-static-analysis'}));
    }
  });

  test('refuses ambiguous integration, same-parent unrelated JSX, and a missing anchor',async()=>{
    const cases=[
      {app:"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';export function App(){return <main><RevenuePulseBadge/><h1>Dashboard</h1></main>}export function Sidebar(){return <aside><RevenuePulseBadge/></aside>}\n",reason:/ambiguous-dependency/},
      {app:"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';export function App(){return <main><RevenuePulseBadge/><aside>Unrelated inline experiment</aside><h1>Dashboard</h1></main>}\n",reason:/same JSX integration parent/},
      {app:"import { RevenuePulseBadge } from './features/revenue/RevenuePulseBadge';export function App(){return <main><RevenuePulseBadge/><h2>Redesigned dashboard</h2></main>}\n",reason:/no unique unchanged sibling anchor/}
    ];
    for(const item of cases){
      const root=baseRepository();git(root,['switch','-c','prompt020-revenue-pulse']);writeRevenueFeature(root,item.app);const analyzed=await artifactFromRenderedSelection(root,commit(root));
      if(analyzed.artifact.slice.status==='resolved'){
        const preflight=await new CandidateGenerator(root).preflight(analyzed.request);expect(preflight.plan.status).toBe('refused');expect(preflight.plan.unresolved.map(value=>value.reason).join(' ')).toMatch(item.reason);
      }else expect(analyzed.artifact.slice.unresolvedDependencies.map(value=>value.edge).join(' ')).toMatch(item.reason);
      expect(()=>git(root,['rev-parse','combined-result'])).toThrow();
    }
  });
});
