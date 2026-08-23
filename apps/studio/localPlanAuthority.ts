import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { CandidateGenerationProfile, CandidateGenerationRequest } from '../../packages/candidate-generation/src/types';
import {
  canonicalizeLocalIntegrationPlan,
  localIntegrationPlanIdentity,
  type LocalIntegrationSelection
} from '../../packages/integration-plan/src/localPlan';
import {
  IntegrationPlanRefusal,
  refuseIntegrationPlan,
  stableSerialize,
  type IntegrationFoundation,
  type IntegrationPlanV2
} from '../../packages/integration-plan/src/integrationPlan';
import {
  resolveIntegrationRepository,
  validatePinnedIntegrationRepository
} from '../../packages/integration-plan/src/gitFoundation';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { staticBoundaryId, type InstrumentedBoundaryMapping } from '../../packages/source-instrumentation/src/instrumentReactSource';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { featureSliceVersion, type FeatureSliceArtifact } from '../../packages/source-analysis/src/types';
import { samePreviewIdentity, type PreviewIdentity } from '../../packages/shared/src/bridge';
import { isSourceIdentity, type SourceIdentity } from '../../packages/shared/src/sourceIdentity';

export interface CanonicalPlanRequest {
  plan: IntegrationPlanV2;
  planIdentity: string;
}

export interface LocalAnalysisPlanEvidence {
  artifact: FeatureSliceArtifact;
  selection: LocalIntegrationSelection;
  foundation: IntegrationFoundation;
}

interface AnalyzedSelectionRecord {
  artifact: FeatureSliceArtifact;
  selection: LocalIntegrationSelection;
  preview: PreviewSession;
}

interface InstrumentedBoundaryRecord {
  preview: PreviewIdentity & { branchCommit: string };
  mapping: InstrumentedBoundaryMapping;
}

function isCanonicalPlanRequest(value: unknown): value is CanonicalPlanRequest {
  return Boolean(value) && typeof value === 'object'
    && Boolean((value as { plan?: unknown }).plan)
    && typeof (value as { planIdentity?: unknown }).planIdentity === 'string';
}

export function localRepositoryId(repositoryPath: string) {
  return `local-git-${createHash('sha256').update(resolve(repositoryPath)).digest('hex').slice(0, 16)}`;
}

export class LocalPlanAuthority {
  private readonly repository: GitSourceRepository;
  private readonly records = new Map<string, AnalyzedSelectionRecord>();
  private readonly instrumentedBoundaries = new Map<string, InstrumentedBoundaryRecord>();

  constructor(
    readonly repositoryRoot: string,
    readonly repositoryId: string,
    readonly foundationRef: string,
    readonly candidateBranch: string,
    private readonly session: (previewId: string) => PreviewSession | null,
    private readonly sessions: () => PreviewSession[],
    private readonly generationProfile: CandidateGenerationProfile = 'phase0'
  ) {
    this.repositoryRoot = resolve(repositoryRoot);
    this.repository = new GitSourceRepository(this.repositoryRoot);
  }

  async foundation(sourceRefs: readonly string[] = []) {
    return (await resolveIntegrationRepository(
      this.repository,
      this.repositoryId,
      this.foundationRef,
      sourceRefs
    )).foundation;
  }

  registerInstrumentedBoundaries(preview: PreviewIdentity & { branchCommit: string }, boundaries: readonly InstrumentedBoundaryMapping[]) {
    if (!boundaries.length) return;
    for (const [receipt, record] of this.instrumentedBoundaries) {
      if (record.preview.previewId === preview.previewId && !samePreviewIdentity(record.preview, preview)) this.instrumentedBoundaries.delete(receipt);
    }
    for (const mapping of boundaries) {
      const { source, selectionReceipt } = mapping;
      if (!/^rendered-[A-Za-z0-9_-]{32}$/.test(selectionReceipt)
        || !source || typeof source !== 'object'
        || source.branch !== preview.branch
        || source.boundaryId !== staticBoundaryId(source.repositoryRelativePath, source.line, source.column, source.componentName)
        || !isSourceIdentity({
          ...source,
          instanceId: `${source.boundaryId}-instrumented`,
          previewId: preview.previewId,
          sessionId: preview.sessionId,
          generation: preview.generation
        })) {
        refuseIntegrationPlan(
          'The preview supplied invalid instrumentation evidence.',
          'Trusted boundary registration did not match the active source instrumentation schema.'
        );
      }
      const existing = this.instrumentedBoundaries.get(selectionReceipt);
      if (existing && (stableSerialize(existing.mapping.source) !== stableSerialize(source) || !samePreviewIdentity(existing.preview, preview))) {
        refuseIntegrationPlan(
          'The preview supplied conflicting instrumentation evidence.',
          `Rendered selection receipt ${selectionReceipt} was already bound to another source boundary.`
        );
      }
      this.instrumentedBoundaries.set(selectionReceipt, { preview, mapping: { selectionReceipt, source } });
    }
  }

  resolveRenderedSelection(preview: PreviewSession, selectionReceipt: string): SourceIdentity {
    const record = this.instrumentedBoundaries.get(selectionReceipt);
    if (!record || !samePreviewIdentity(record.preview, preview) || record.preview.branchCommit !== preview.branchCommit) {
      refuseIntegrationPlan(
        'The rendered selection is unknown or stale. Select it again in the active preview.',
        `No current server-owned instrumentation mapping exists for ${selectionReceipt}.`
      );
    }
    const selection: SourceIdentity = {
      ...record.mapping.source,
      instanceId: `${record.mapping.source.boundaryId}-${preview.sessionId.slice(0, 8)}-rendered`,
      previewId: preview.previewId,
      sessionId: preview.sessionId,
      generation: preview.generation
    };
    if (!isSourceIdentity(selection)) {
      refuseIntegrationPlan(
        'The rendered selection cannot be resolved safely.',
        `Instrumentation mapping ${selectionReceipt} did not produce a valid source identity.`
      );
    }
    return selection;
  }

  async register(preview: PreviewSession, artifact: FeatureSliceArtifact, route: string): Promise<LocalAnalysisPlanEvidence> {
    if (!samePreviewIdentity(artifact.slice.selection, preview)
      || artifact.slice.repository.branchRef !== preview.branch
      || artifact.slice.repository.branchCommit !== preview.branchCommit) {
      refuseIntegrationPlan(
        'The analyzed selection no longer belongs to this preview.',
        'Server-owned slice evidence and the active preview session do not match.'
      );
    }
    const selectionHandle = createHash('sha256').update(stableSerialize({
      repositoryId: this.repositoryId,
      branch: artifact.slice.repository.branchRef,
      commit: artifact.slice.repository.branchCommit,
      boundaryId: artifact.slice.selection.boundaryId,
      route
    })).digest('hex').slice(0, 16);
    const selection: LocalIntegrationSelection = {
      capabilityId: `analyzed-selection:${selectionHandle}`,
      capabilityKind: 'whole-feature',
      sourceBranch: artifact.slice.repository.branchRef,
      sourceCommitSha: artifact.slice.repository.branchCommit,
      route,
      pageId: route,
      targetIds: [artifact.slice.selection.boundaryId]
    };
    this.records.set(selection.capabilityId, { artifact, selection, preview });
    const sourceRefs = this.sessions()
      .filter(current => current.status === 'running' && current.branch !== this.foundationRef && current.branch !== this.candidateBranch)
      .map(current => current.branch);
    return { artifact, selection, foundation: await this.foundation(sourceRefs) };
  }

  async project(value: unknown): Promise<{ request: CandidateGenerationRequest; plan: IntegrationPlanV2; planIdentity: string }> {
    if (!isCanonicalPlanRequest(value)) {
      refuseIntegrationPlan(
        'A canonical integration plan is required.',
        'The request must contain an Integration Plan V2 and its stable identity.'
      );
    }
    const plan = canonicalizeLocalIntegrationPlan(value.plan);
    const planIdentity = localIntegrationPlanIdentity(plan);
    if (value.planIdentity !== planIdentity) {
      refuseIntegrationPlan(
        'The integration plan identity does not match its decisions.',
        `Expected ${planIdentity}; received ${value.planIdentity}.`
      );
    }
    if (plan.foundation.repositoryId !== this.repositoryId || plan.foundation.branchRef !== this.foundationRef) {
      refuseIntegrationPlan(
        'This integration plan belongs to a different repository or foundation.',
        `Expected ${this.repositoryId} at ${this.foundationRef}.`
      );
    }
    if (plan.selections.length < 1 || plan.selections.length > 2) {
      refuseIntegrationPlan(
        'Choose one or two analyzed features before generating.',
        `Received ${plan.selections.length} selections.`
      );
    }

    const sourceCommits: Record<string, string> = {};
    const artifacts: FeatureSliceArtifact[] = [];
    const previewIds = new Set<string>();
    for (const selection of plan.selections) {
      const record = this.records.get(selection.capabilityId);
      if (!record) {
        refuseIntegrationPlan(
          'A selected feature is unknown or stale. Re-select it from the running preview.',
          `No current server-owned analysis exists for ${selection.capabilityId}.`
        );
      }
      if (stableSerialize(selection) !== stableSerialize(record.selection)) {
        refuseIntegrationPlan(
          'A selected feature was changed after analysis. Re-select it from the running preview.',
          `Plan metadata for ${selection.capabilityId} does not match server-owned analysis.`
        );
      }
      const current = this.session(record.preview.previewId);
      if (!current || current.status !== 'running' || !samePreviewIdentity(current, record.preview) || current.branchCommit !== record.preview.branchCommit) {
        refuseIntegrationPlan(
          'A selected feature belongs to a stale preview session. Re-select it from the current preview.',
          `Preview ${record.preview.previewId} no longer matches session ${record.preview.sessionId}.`
        );
      }
      if (previewIds.has(current.previewId)) {
        refuseIntegrationPlan(
          'The integration plan repeats a preview decision.',
          `Preview ${current.previewId} supplied more than one selection.`
        );
      }
      if (record.artifact.slice.repository.mergeBaseCommit !== plan.foundation.commonAncestorCommit) {
        refuseIntegrationPlan(
          'The selected versions do not share the plan’s pinned starting point.',
          `Selection ${selection.capabilityId} uses ${record.artifact.slice.repository.mergeBaseCommit}.`
        );
      }
      previewIds.add(current.previewId);
      sourceCommits[selection.sourceBranch] = selection.sourceCommitSha;
      artifacts.push(record.artifact);
    }
    await validatePinnedIntegrationRepository(this.repository, plan.foundation, sourceCommits);

    return {
      plan,
      planIdentity,
      request: {
        repositoryRoot: this.repositoryRoot,
        repositoryId: this.repositoryId,
        baseRef: plan.foundation.branchRef,
        expectedBaseCommit: plan.foundation.commitSha,
        commonBaseRef: this.foundationRef,
        expectedCommonBaseCommit: plan.foundation.commonAncestorCommit,
        candidateBranch: this.candidateBranch,
        artifacts,
        analyzerSchemaVersion: featureSliceVersion,
        generationProfile: this.generationProfile,
        integrationPlan: { version: plan.version, identity: planIdentity }
      }
    };
  }
}

export function localPlanErrorStatus(error: unknown) {
  return error instanceof IntegrationPlanRefusal ? 409 : 500;
}
