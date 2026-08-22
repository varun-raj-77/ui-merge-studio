import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { LocalPlanAuthority, localRepositoryId } from '../../apps/studio/localPlanAuthority';
import { localIntegrationPlanIdentity } from '../../packages/integration-plan/src/localPlan';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { staticBoundaryId } from '../../packages/source-instrumentation/src/instrumentReactSource';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';

const fixture = resolve(import.meta.dirname, '../../fixtures/generated/product-catalogue');
const repository = new GitSourceRepository(fixture);

function preview(previewId: 'left' | 'right', branch: string, branchCommit: string): PreviewSession {
  return { previewId, branch, branchCommit, generation: 1, sessionId: `${previewId}-authority-session`, protocolVersion: 2, url: `http://127.0.0.1/${previewId}`, origin: 'http://127.0.0.1', port: previewId === 'left' ? 5101 : 5102, worktreePath: `C:/temp/${previewId}`, status: 'running', failure: null };
}

function source(session: PreviewSession, path: string, line: number, componentName: string): SourceIdentity {
  return { boundaryId: `${componentName}-boundary`, instanceId: `${componentName}-instance`, repositoryRelativePath: path, line, column: 8, componentName, exportName: componentName, branch: session.branch, previewId: session.previewId, sessionId: session.sessionId, generation: session.generation, confidence: 'exact' };
}

async function authorityFixture() {
  const commits = { a: await repository.resolveRef('branch-a'), b: await repository.resolveRef('branch-b') };
  const sessions = new Map<string, PreviewSession>([
    ['left', preview('left', 'branch-a', commits.a)],
    ['right', preview('right', 'branch-b', commits.b)]
  ]);
  const analyzer = new FeatureSliceAnalyzer(fixture);
  const left = sessions.get('left')!;
  const right = sessions.get('right')!;
  const artifacts = await Promise.all([
    analyzer.analyze({ baseRef: 'main', branchRef: left.branch, expectedBranchCommit: left.branchCommit, selection: source(left, 'src/features/catalogue/CategorySidebar.tsx', 10, 'CategorySidebar') }),
    analyzer.analyze({ baseRef: 'main', branchRef: right.branch, expectedBranchCommit: right.branchCommit, selection: source(right, 'src/features/catalogue/ProductQuickViewShelf.tsx', 9, 'ProductQuickViewShelf') })
  ]);
  const authority = new LocalPlanAuthority(fixture, localRepositoryId(fixture), 'main', 'trust-boundary-result', id => sessions.get(id) ?? null, () => [...sessions.values()]);
  const evidence = await Promise.all([authority.register(left, artifacts[0], '/catalogue'), authority.register(right, artifacts[1], '/catalogue')]);
  const plan = { version: 2 as const, foundation: evidence[0].foundation, selections: evidence.map(item => item.selection) };
  return { authority, artifacts, evidence, plan, sessions };
}

describe('local canonical-plan authority', () => {
  test('resolves an opaque current-session instrumentation receipt to server-owned source metadata', async () => {
    const { authority, sessions } = await authorityFixture();
    const left = sessions.get('left')!;
    const sourcePath = 'src/features/catalogue/CategorySidebar.tsx';
    const selectionReceipt = `rendered-${'a'.repeat(32)}`;
    authority.registerInstrumentedBoundaries(left, [{
      selectionReceipt,
      source: {
        boundaryId: staticBoundaryId(sourcePath, 10, 8, 'CategorySidebar'),
        repositoryRelativePath: sourcePath,
        line: 10,
        column: 8,
        componentName: 'CategorySidebar',
        exportName: 'CategorySidebar',
        branch: left.branch,
        confidence: 'exact'
      }
    }]);
    expect(authority.resolveRenderedSelection(left, selectionReceipt)).toMatchObject({
      repositoryRelativePath: sourcePath,
      componentName: 'CategorySidebar',
      branch: left.branch,
      previewId: left.previewId,
      sessionId: left.sessionId,
      generation: left.generation
    });
    await expect(Promise.resolve().then(() => authority.resolveRenderedSelection(left, `rendered-${'b'.repeat(32)}`)))
      .rejects.toThrow(/unknown or stale/i);
  });

  test('projects only current server-owned analyses from the canonical plan', async () => {
    const { authority, artifacts, evidence, plan, sessions } = await authorityFixture();
    const projected = await authority.project({ plan, planIdentity: localIntegrationPlanIdentity(plan) });
    expect(projected.request.artifacts).toEqual(artifacts);
    expect(projected.request.integrationPlan).toEqual({ version: 2, identity: projected.planIdentity });
    expect(projected.request.expectedBaseCommit).toBe(plan.foundation.commitSha);
    expect(projected.request).not.toHaveProperty('sourceConfigurations');
    const repeated = await authority.register(sessions.get('left')!, artifacts[0], '/catalogue');
    expect(repeated.selection).toEqual(evidence[0].selection);
    expect(repeated.selection.capabilityId).not.toBe(`analyzed-selection:${artifacts[0].analysisId}`);
  });

  test('refuses an unknown session selection before any branch or worktree mutation', async () => {
    const { authority, plan } = await authorityFixture();
    const before = {
      status: await repository.git(['status', '--porcelain']),
      branches: await repository.git(['for-each-ref', '--format=%(refname:short)', 'refs/heads/']),
      worktrees: await repository.git(['worktree', 'list', '--porcelain'])
    };
    const tampered = { ...plan, selections: plan.selections.map((selection, index) => index === 0 ? { ...selection, capabilityId: 'analyzed-selection:0000000000000000' } : selection) };
    await expect(authority.project({ plan: tampered, planIdentity: localIntegrationPlanIdentity(tampered) }))
      .rejects.toThrow(/unknown or stale/i);
    expect(await repository.resolveRef('trust-boundary-result').catch(() => null)).toBeNull();
    expect(await repository.git(['status', '--porcelain'])).toBe(before.status);
    expect(await repository.git(['for-each-ref', '--format=%(refname:short)', 'refs/heads/'])).toBe(before.branches);
    expect(await repository.git(['worktree', 'list', '--porcelain'])).toBe(before.worktrees);
  });
});
