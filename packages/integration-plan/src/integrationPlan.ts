export const integrationPlanVersion = 2 as const;

export type IntegrationCapabilityKind =
  | 'whole-feature'
  | 'feature-instance'
  | 'all-instances'
  | 'configurable-subset';

export interface IntegrationSelection {
  capabilityId: string;
  capabilityKind: IntegrationCapabilityKind;
  sourceBranch: string;
  sourceCommitSha: string;
  route: string;
  pageId: string;
  parentCapabilityId?: string;
  targetIds?: string[];
  configuration?: unknown;
}

export interface IntegrationFoundation {
  repositoryId: string;
  branchRef: string;
  commitSha: string;
  commonAncestorCommit: string;
  role: 'base';
}

export interface IntegrationPlanV2 {
  version: typeof integrationPlanVersion;
  foundation: IntegrationFoundation;
  selections: IntegrationSelection[];
}

/** Phase 4 compatibility alias. Serialized plans are versioned and remain V2. */
export type IntegrationPlanV1 = IntegrationPlanV2;

export interface IntegrationPlanAdapter<TSelection extends IntegrationSelection = IntegrationSelection> {
  id: string;
  defaultFoundation: IntegrationFoundation;
  normalizeFoundation(foundation: IntegrationFoundation): IntegrationFoundation;
  normalizeSelection(selection: IntegrationSelection): TSelection;
  selectionIdentity(selection: TSelection): string;
  selectionOrder(selection: TSelection): string;
}

export class IntegrationPlanRefusal extends Error {
  constructor(
    public readonly productMessage: string,
    public readonly technicalDetail: string
  ) {
    super(`${productMessage} ${technicalDetail}`);
    this.name = 'IntegrationPlanRefusal';
  }
}

export function refuseIntegrationPlan(productMessage: string, technicalDetail: string): never {
  throw new IntegrationPlanRefusal(productMessage, technicalDetail);
}

export function createEmptyIntegrationPlan(foundation: IntegrationFoundation): IntegrationPlanV2 {
  return {
    version: integrationPlanVersion,
    foundation,
    selections: []
  };
}

export function canonicalizeIntegrationPlan<TSelection extends IntegrationSelection>(
  value: IntegrationPlanV2,
  adapter: IntegrationPlanAdapter<TSelection>
): IntegrationPlanV1 & { selections: TSelection[] } {
  if (value?.version !== integrationPlanVersion) {
    refuseIntegrationPlan(
      'This integration plan uses a version that is not supported.',
      `Expected plan version ${integrationPlanVersion}; received ${(value as { version?: unknown })?.version ?? '(missing)'}.`
    );
  }
  const foundation = adapter.normalizeFoundation(value.foundation);
  if (!Array.isArray(value.selections)) {
    refuseIntegrationPlan('This integration plan is incomplete.', 'Selections must be an array.');
  }
  const normalized = value.selections.map(selection => adapter.normalizeSelection(selection));
  const byIdentity = new Map<string, TSelection>();
  for (const selection of normalized) {
    const identity = adapter.selectionIdentity(selection);
    const existing = byIdentity.get(identity);
    if (existing && stableSerialize(existing) !== stableSerialize(selection)) {
      refuseIntegrationPlan(
        'This integration plan contains conflicting decisions for the same feature.',
        `Capability identity ${identity} has incompatible values.`
      );
    }
    byIdentity.set(identity, selection);
  }
  return {
    version: integrationPlanVersion,
    foundation,
    selections: [...byIdentity.values()].sort((left, right) => (
      adapter.selectionOrder(left).localeCompare(adapter.selectionOrder(right))
    ))
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, stableValue(item)]));
}

export function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function integrationPlanIdentity<TSelection extends IntegrationSelection>(
  plan: IntegrationPlanV2,
  adapter: IntegrationPlanAdapter<TSelection>
) {
  const canonical = canonicalizeIntegrationPlan(plan, adapter);
  return `plan-v${canonical.version}-${fnv1a(stableSerialize(canonical))}`;
}

export function serializeIntegrationPlan<TSelection extends IntegrationSelection>(
  plan: IntegrationPlanV2,
  adapter: IntegrationPlanAdapter<TSelection>
) {
  return stableSerialize(canonicalizeIntegrationPlan(plan, adapter));
}

export function parseIntegrationPlan<TSelection extends IntegrationSelection>(
  serialized: string,
  adapter: IntegrationPlanAdapter<TSelection>
) {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    refuseIntegrationPlan('This integration plan cannot be opened.', 'The serialized plan is not valid JSON.');
  }
  return canonicalizeIntegrationPlan(value as IntegrationPlanV2, adapter);
}
