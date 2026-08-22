import { resolve } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { LocalPlanAuthority, localRepositoryId } from '../../apps/studio/localPlanAuthority';
import { localIntegrationPlanAdapter, localIntegrationPlanIdentity } from '../../packages/integration-plan/src/localPlan';
import { parseIntegrationPlan, serializeIntegrationPlan } from '../../packages/integration-plan/src/integrationPlan';
import {
  emptyCatalogueIntegrationPlan,
  catalogueFoundation,
  catalogueRepositoryId,
  canonicalizeCatalogueIntegrationPlan,
  integrationPlanToGenerationRequest,
  quickViewPlanDecision,
  replacePlanSelection,
  sidebarPlanDecision
} from '../../apps/studio/src/catalogueIntegrationPlan';

const fixture=resolve(import.meta.dirname,'../../fixtures/generated/product-catalogue');const repository=new GitSourceRepository(fixture);
function selection(branch:string,path:string,line:number,componentName:string,previewId:string):SourceIdentity{return{boundaryId:`${componentName}-boundary`,instanceId:`${componentName}-instance`,repositoryRelativePath:path,line,column:8,componentName,exportName:componentName,branch,previewId,sessionId:`${previewId}-session`,generation:1,confidence:'exact'};}
async function artifacts(){const analyzer=new FeatureSliceAnalyzer(fixture);return Promise.all([
  analyzer.analyze({baseRef:'main',branchRef:'branch-a',expectedBranchCommit:await repository.resolveRef('branch-a'),selection:selection('branch-a','src/features/catalogue/CategorySidebar.tsx',10,'CategorySidebar','left')}),
  analyzer.analyze({baseRef:'main',branchRef:'branch-b',expectedBranchCommit:await repository.resolveRef('branch-b'),selection:selection('branch-b','src/features/catalogue/ProductQuickViewShelf.tsx',9,'ProductQuickViewShelf','right')})
]);}

const phase5CandidateBranches = ['phase0-controlled-result', 'phase5-main-result', 'phase5-version-a-result', 'phase5-version-b-result', 'phase0-canonical-replay'];
afterEach(async () => {
  for (const branch of phase5CandidateBranches) {
    if (await repository.resolveRef(branch).catch(() => null)) await repository.git(['branch', '-D', branch]);
  }
});

async function fixtureCommits() {
  return {
    main: await repository.resolveRef('main'),
    'branch-a': await repository.resolveRef('branch-a'),
    'branch-b': await repository.resolveRef('branch-b'),
    'branch-incompatible': await repository.resolveRef('branch-incompatible')
  } as const;
}

async function foundationRequest(options: {
  foundation: 'main' | 'branch-a' | 'branch-b';
  candidateBranch: string;
  sidebar?: boolean;
  quickViews?: ('p-103' | 'p-105')[];
}) {
  const commits = await fixtureCommits();
  const selectedArtifacts = await artifacts();
  let plan = canonicalizeCatalogueIntegrationPlan({
    version: 2,
    foundation: catalogueFoundation(options.foundation, commits),
    selections: []
  });
  if (options.sidebar) plan = replacePlanSelection(plan, sidebarPlanDecision(undefined, commits['branch-a']));
  for (const productId of options.quickViews ?? []) plan = replacePlanSelection(plan, quickViewPlanDecision(productId, commits['branch-b']));
  const projection = integrationPlanToGenerationRequest(plan);
  const usedArtifacts = selectedArtifacts.filter(artifact => projection.selectedCapabilities.some(selection => selection.sourceBranch === artifact.slice.repository.branchRef));
  return {
    plan,
    projection,
    commits,
    request: {
      repositoryRoot: fixture,
      repositoryId: catalogueRepositoryId,
      baseRef: projection.foundation.branchRef,
      expectedBaseCommit: projection.foundation.commitSha,
      commonBaseRef: 'main',
      expectedCommonBaseCommit: projection.foundation.commonAncestorCommit,
      candidateBranch: options.candidateBranch,
      artifacts: usedArtifacts,
      analyzerSchemaVersion: 2 as const,
      sourceConfigurations: projection.sourceConfigurations.map(configuration => ({
        ...configuration,
        sliceId: usedArtifacts.find(artifact => artifact.slice.includedChanges.some(change => change.path === configuration.path))!.analysisId
      }))
    }
  };
}

test('generates the Product Catalogue through two safe direct-child integrations and excludes unrelated changes',async()=>{
  const base=await repository.resolveRef('main');const sourceRefs=['branch-a','branch-b','branch-incompatible'];const sourceBefore=await Promise.all(sourceRefs.map(ref=>repository.resolveRef(ref)));
  const generator=new CandidateGenerator(fixture,{artifactRoot:resolve(fixture,'..','..','..')});
  const selectedArtifacts=await artifacts();
  const plan=replacePlanSelection(
    replacePlanSelection(emptyCatalogueIntegrationPlan,sidebarPlanDecision({enabledCategoryIds:['travel','audio','desk'],defaultCategoryId:'desk',showHeading:false,showProductCounts:true})),
    quickViewPlanDecision('p-105')
  );
  const projection=integrationPlanToGenerationRequest(plan);
  const request={repositoryRoot:fixture,baseRef:'main',expectedBaseCommit:base,candidateBranch:'phase0-controlled-result',artifacts:selectedArtifacts,analyzerSchemaVersion:2 as const,sourceConfigurations:[
    ...projection.sourceConfigurations.map(configuration=>({
      ...configuration,
      sliceId:configuration.declaration==='categorySidebarConfiguration'?selectedArtifacts[0].analysisId:selectedArtifacts[1].analysisId
    }))
  ]};
  const first=await generator.generate(request);
  expect(first.status,first.message).toBe('succeeded');
  expect(first.plan.status).toBe('ready');
  expect(first.plan.unresolved).toEqual([]);
  expect(first.verification.length).toBeGreaterThan(0);
  expect(first.verification.every(item=>item.status==='passed')).toBe(true);
  expect(first.plan.operations.some(item=>item.target.symbol==='CatalogueWorkspace'&&item.kind==='replace-declaration')).toBe(false);
  expect(first.plan.operations.some(item=>item.target.symbol==='ProductGrid'&&item.kind==='replace-declaration')).toBe(false);
  expect(first.plan.operations).toContainEqual(expect.objectContaining({kind:'replace-jsx-region',target:expect.objectContaining({symbol:'CatalogueWorkspace'}),jsxProjection:expect.objectContaining({mode:'insert-child',renderedBoundary:expect.objectContaining({symbol:'CategorySidebar'})})}));
  expect(first.plan.operations).toContainEqual(expect.objectContaining({kind:'replace-jsx-region',target:expect.objectContaining({symbol:'ProductGrid'}),jsxProjection:expect.objectContaining({mode:'insert-child',renderedBoundary:expect.objectContaining({symbol:'ProductQuickViewShelf'})})}));
  expect(first.plan.operations.some(item=>item.target.path==='src/features/catalogue/CategorySidebar.tsx')).toBe(true);
  expect(first.plan.operations.some(item=>item.target.path==='src/features/catalogue/ProductQuickViewShelf.tsx')).toBe(true);
  expect(first.plan.operations.some(item=>item.target.path==='src/test/quick-view.test.tsx')).toBe(true);
  expect(first.plan.operations.some(item=>item.target.path==='src/features/catalogue/CatalogueHeader.tsx')).toBe(false);
  expect(first.plan.operations.some(item=>item.target.path==='src/utils/inventorySummary.ts')).toBe(false);
  expect(await repository.readFile('phase0-controlled-result','src/features/catalogue/CatalogueHeader.tsx')).not.toMatch(/PromotionalBanner|inventorySummary/);
  const second=await generator.generate(request);
  expect(second.status,second.message).toBe('succeeded');expect(second.plan).toEqual(first.plan);
  expect(second.repository).toMatchObject({candidateCommit:first.repository?.candidateCommit,candidateTree:first.repository?.candidateTree,idempotent:true});
  expect(await repository.resolveRef('phase0-controlled-result')).toBe(first.repository?.candidateCommit);
  expect(await Promise.all(sourceRefs.map(ref=>repository.resolveRef(ref)))).toEqual(sourceBefore);
  expect((await repository.git(['worktree','list','--porcelain']))).not.toContain('ui-merge-studio-candidate-');
},240_000);

test('replays the exact serialized local canonical plan to the same Git tree', async () => {
  const selectedArtifacts = await artifacts();
  const sessions = new Map<string, PreviewSession>(selectedArtifacts.map((artifact, index) => {
    const selection = artifact.slice.selection;
    return [selection.previewId, { previewId: selection.previewId, branch: selection.branch, generation: selection.generation, sessionId: selection.sessionId, protocolVersion: 2, branchCommit: artifact.slice.repository.branchCommit, url: `http://127.0.0.1:${5200 + index}/catalogue`, origin: `http://127.0.0.1:${5200 + index}`, port: 5200 + index, worktreePath: `C:/temp/replay-${index}`, status: 'running', failure: null } as PreviewSession];
  }));
  const authority = new LocalPlanAuthority(fixture, localRepositoryId(fixture), 'main', 'phase0-canonical-replay', id => sessions.get(id) ?? null, () => [...sessions.values()]);
  const evidence = await Promise.all(selectedArtifacts.map(artifact => authority.register(sessions.get(artifact.slice.selection.previewId)!, artifact, '/catalogue')));
  const canonicalPlan = { version: 2 as const, foundation: evidence[0].foundation, selections: evidence.map(item => item.selection) };
  const serialized = serializeIntegrationPlan(canonicalPlan, localIntegrationPlanAdapter);
  const replayed = parseIntegrationPlan(serialized, localIntegrationPlanAdapter);
  const planIdentity = localIntegrationPlanIdentity(replayed);
  const firstProjection = await authority.project({ plan: replayed, planIdentity });
  const secondProjection = await authority.project({ plan: JSON.parse(serialized), planIdentity });
  expect(secondProjection.request).toEqual(firstProjection.request);

  const generator = new CandidateGenerator(fixture, {
    artifactRoot: resolve(fixture, '..', '..', '..'),
    verificationCommands: [{ name: 'canonical-plan-contract', executable: process.execPath, args: ['-e', 'process.exit(0)'] }]
  });
  const first = await generator.generate(firstProjection.request);
  const second = await generator.generate(secondProjection.request);
  expect(first.status,first.message).toBe('succeeded');
  expect(second.status,second.message).toBe('succeeded');expect(second.plan).toEqual(first.plan);
  expect(second.repository).toMatchObject({candidateCommit:first.repository?.candidateCommit,candidateTree:first.repository?.candidateTree,idempotent:true});
  expect(first.plan.operations.some(item=>item.kind==='replace-declaration'&&(item.target.symbol==='CatalogueWorkspace'||item.target.symbol==='ProductGrid'))).toBe(false);
  expect(first.integrationPlan?.identity).toBe(planIdentity);
  expect(second.integrationPlan?.identity).toBe(planIdentity);
  expect(await repository.resolveRef('phase0-canonical-replay')).toBe(first.repository?.candidateCommit);
  expect(await repository.git(['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
}, 120_000);

test('supports the controlled direct-child integrations from Main, Version A, and Version B foundations', async () => {
  const sourceRefs = ['main', 'branch-a', 'branch-b', 'branch-incompatible'];
  const sourceBefore = await Promise.all(sourceRefs.map(ref => repository.resolveRef(ref)));
  const proofs = [
    await foundationRequest({ foundation: 'main', candidateBranch: 'phase5-main-result', sidebar: true, quickViews: ['p-105'] }),
    await foundationRequest({ foundation: 'branch-a', candidateBranch: 'phase5-version-a-result', quickViews: ['p-105', 'p-103'] }),
    await foundationRequest({ foundation: 'branch-b', candidateBranch: 'phase5-version-b-result', sidebar: true })
  ];
  try {
    for (const proof of proofs) {
      let verifiedWorkspaceInvoked=false;const generator = new CandidateGenerator(fixture, {artifactRoot: resolve(fixture, '..', '..', '..'),onVerifiedWorkspace:()=>{verifiedWorkspaceInvoked=true;}});
      const first = await generator.generate(proof.request);
      expect(first.status,first.message).toBe('succeeded');
      expect(first.plan.repository).toMatchObject({
        foundationRef: proof.projection.foundation.branchRef,
        foundationCommit: proof.projection.foundation.commitSha,
        commonBaseCommit: proof.projection.foundation.commonAncestorCommit
      });
      expect(first.plan.unresolved).toEqual([]);
      expect(first.plan.operations.some(item=>item.kind==='replace-declaration'&&(item.target.symbol==='CatalogueWorkspace'||item.target.symbol==='ProductGrid'))).toBe(false);
      expect(first.plan.operations.filter(item=>item.kind==='replace-jsx-region').every(item=>item.jsxProjection?.mode==='insert-child')).toBe(true);
      expect(verifiedWorkspaceInvoked).toBe(true);

      const second = await generator.generate(proof.request);
      expect(second.status,second.message).toBe('succeeded');expect(second.plan).toEqual(first.plan);
      expect(second.repository).toMatchObject({candidateCommit:first.repository?.candidateCommit,candidateTree:first.repository?.candidateTree,idempotent:true});
      expect(await repository.resolveRef(proof.request.candidateBranch)).toBe(first.repository?.candidateCommit);
    }
  } finally {
    for (const branch of phase5CandidateBranches) {
      if (await repository.resolveRef(branch).catch(() => null)) await repository.git(['branch', '-D', branch]);
    }
  }
  expect(await Promise.all(sourceRefs.map(ref => repository.resolveRef(ref)))).toEqual(sourceBefore);
  expect((await repository.git(['worktree', 'list', '--porcelain']))).not.toContain('ui-merge-studio-candidate-');
}, 720_000);

test('refuses the incompatible Product-ID foundation before candidate presentation', async () => {
  const commits = await fixtureCommits();
  const selectedArtifacts = await artifacts();
  const quickViewArtifact = selectedArtifacts[1];
  const branch = 'phase5-incompatible-result';
  const generator = new CandidateGenerator(fixture, { artifactRoot: resolve(fixture, '..', '..', '..') });
  const request = {
    repositoryRoot: fixture,
    repositoryId: catalogueRepositoryId,
    baseRef: 'branch-incompatible',
    expectedBaseCommit: commits['branch-incompatible'],
    commonBaseRef: 'main',
    expectedCommonBaseCommit: commits.main,
    candidateBranch: branch,
    artifacts: [quickViewArtifact],
    analyzerSchemaVersion: 2 as const,
    sourceConfigurations: [{
      sliceId: quickViewArtifact.analysisId,
      path: 'src/config/quickViewTargets.ts',
      declaration: 'quickViewTargetIds',
      value: ['p-105']
    }]
  };
  const preflight = await generator.preflight(request);
  expect(preflight.plan.status).toBe('refused');
  expect(preflight.plan.unresolved.map(item => item.reason).join(' ')).toMatch(/shared contract.*Product/i);
  const report = await generator.generate(request);
  expect(report.status).toBe('refused');
  expect(await repository.resolveRef(branch).catch(() => null)).toBeNull();
  expect((await repository.git(['worktree', 'list', '--porcelain']))).not.toContain('ui-merge-studio-candidate-');
}, 120_000);
