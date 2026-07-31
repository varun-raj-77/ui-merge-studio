export type SelectionCapabilityKind =
  | 'whole-feature'
  | 'feature-instance'
  | 'all-instances'
  | 'configurable-subset'
  | 'unsupported';

export interface SelectionCapability<
  SourceBranch extends string = string,
  TargetId extends string = string
> {
  id: string;
  label: string;
  kind: SelectionCapabilityKind;
  sourceBranch: SourceBranch;
  route: string;
  pageId: string;
  parentCapabilityId?: string;
  targetIds?: TargetId[];
  supported: boolean;
  unsupportedReason?: string;
  sourceEvidenceId?: string;
}

export interface SelectionCapabilityRouteGroup {
  route: string;
  pageId: string;
  capabilities: SelectionCapability[];
}

export type SelectionCapabilityCompatibility =
  | { compatible: true; groups: SelectionCapabilityRouteGroup[] }
  | { compatible: false; reason: string };

export function createUnsupportedCapability<SourceBranch extends string>(
  id: string,
  label: string,
  sourceBranch: SourceBranch,
  route: string,
  pageId: string,
  unsupportedReason: string
): SelectionCapability<SourceBranch> {
  return {
    id,
    label,
    kind: 'unsupported',
    sourceBranch,
    route,
    pageId,
    supported: false,
    unsupportedReason
  };
}

export function selectionCapabilityCompatibility(
  capabilities: readonly SelectionCapability[]
): SelectionCapabilityCompatibility {
  const unsupported = capabilities.find(capability => !capability.supported);
  if (unsupported) {
    return {
      compatible: false,
      reason: unsupported.unsupportedReason
        ?? `${unsupported.label} cannot be selected independently.`
    };
  }

  return { compatible: true, groups: groupSelectionCapabilitiesByRoute(capabilities) };
}

export function groupSelectionCapabilitiesByRoute(
  capabilities: readonly SelectionCapability[]
): SelectionCapabilityRouteGroup[] {
  const groups = new Map<string, SelectionCapabilityRouteGroup>();
  for (const capability of capabilities) {
    const key = `${capability.pageId}\u0000${capability.route}`;
    const group = groups.get(key);
    if (group) group.capabilities.push(capability);
    else groups.set(key, {
      route: capability.route,
      pageId: capability.pageId,
      capabilities: [capability]
    });
  }
  return [...groups.values()].sort((left, right) => (
    left.route.localeCompare(right.route) || left.pageId.localeCompare(right.pageId)
  ));
}

export function selectionCapabilityById<
  SourceBranch extends string,
  TargetId extends string
>(
  capabilities: readonly SelectionCapability<SourceBranch, TargetId>[],
  id: string,
  sourceBranch: SourceBranch
) {
  return capabilities.find(capability => (
    capability.id === id && capability.sourceBranch === sourceBranch
  )) ?? null;
}
