import {
  canonicalizeIntegrationPlan,
  integrationPlanIdentity,
  refuseIntegrationPlan,
  type IntegrationFoundation,
  type IntegrationPlanAdapter,
  type IntegrationPlanV2,
  type IntegrationSelection
} from './integrationPlan';

export type LocalIntegrationSelection = IntegrationSelection;

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    refuseIntegrationPlan('This integration plan is incomplete.', `${label} must be a non-empty string.`);
  }
  return value;
}

function commit(value: unknown, label: string) {
  const normalized = requiredString(value, label);
  if (!/^[a-f0-9]{40}$/.test(normalized)) {
    refuseIntegrationPlan('This integration plan contains an invalid Git identity.', `${label} must be a full commit SHA.`);
  }
  return normalized;
}

function capabilityKind(value: unknown): IntegrationSelection['capabilityKind'] {
  if (value !== 'whole-feature' && value !== 'feature-instance' && value !== 'all-instances' && value !== 'configurable-subset') {
    refuseIntegrationPlan('This integration plan contains an unsupported selection.', `Unknown capability kind ${String(value)}.`);
  }
  return value;
}

function normalizeFoundation(foundation: IntegrationFoundation): IntegrationFoundation {
  if (!foundation || typeof foundation !== 'object') {
    refuseIntegrationPlan('This integration plan has no usable foundation.', 'Foundation metadata is required.');
  }
  if (foundation.role !== 'base') {
    refuseIntegrationPlan('This integration plan has no usable foundation.', 'The foundation role must be base.');
  }
  return {
    repositoryId: requiredString(foundation.repositoryId, 'Foundation repository ID'),
    branchRef: requiredString(foundation.branchRef, 'Foundation branch ref'),
    commitSha: commit(foundation.commitSha, 'Foundation commit'),
    commonAncestorCommit: commit(foundation.commonAncestorCommit, 'Common ancestor commit'),
    role: 'base'
  };
}

function normalizeSelection(selection: IntegrationSelection): LocalIntegrationSelection {
  if (!selection || typeof selection !== 'object') {
    refuseIntegrationPlan('This integration plan contains an unsupported selection.', 'Selection metadata is required.');
  }
  const targets = selection.targetIds;
  if (targets !== undefined && (!Array.isArray(targets) || targets.some(target => typeof target !== 'string' || target === ''))) {
    refuseIntegrationPlan('This integration plan contains an unsupported selection.', 'Selection targets must be non-empty strings.');
  }
  return {
    capabilityId: requiredString(selection.capabilityId, 'Capability ID'),
    capabilityKind: capabilityKind(selection.capabilityKind),
    sourceBranch: requiredString(selection.sourceBranch, 'Source branch'),
    sourceCommitSha: commit(selection.sourceCommitSha, 'Source commit'),
    route: requiredString(selection.route, 'Selection route'),
    pageId: requiredString(selection.pageId, 'Selection page ID'),
    ...(selection.parentCapabilityId === undefined
      ? {}
      : { parentCapabilityId: requiredString(selection.parentCapabilityId, 'Parent capability ID') }),
    ...(targets === undefined ? {} : { targetIds: [...new Set(targets)].sort() }),
    ...(selection.configuration === undefined ? {} : { configuration: selection.configuration })
  };
}

export const localIntegrationPlanAdapter: IntegrationPlanAdapter<LocalIntegrationSelection> = {
  id: 'local-session-analysis-v1',
  defaultFoundation: {
    repositoryId: 'unresolved-local-repository',
    branchRef: 'main',
    commitSha: '0'.repeat(40),
    commonAncestorCommit: '0'.repeat(40),
    role: 'base'
  },
  normalizeFoundation,
  normalizeSelection,
  selectionIdentity: selection => selection.capabilityId,
  selectionOrder: selection => `${selection.sourceBranch}:${selection.capabilityId}`
};

export function canonicalizeLocalIntegrationPlan(plan: IntegrationPlanV2) {
  return canonicalizeIntegrationPlan(plan, localIntegrationPlanAdapter);
}

export function localIntegrationPlanIdentity(plan: IntegrationPlanV2) {
  return integrationPlanIdentity(plan, localIntegrationPlanAdapter);
}
