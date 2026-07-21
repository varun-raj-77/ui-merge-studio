export type MappingConfidence = 'exact' | 'partial' | 'refused';

export interface SourceIdentity {
  boundaryId: string;
  instanceId: string;
  repositoryRelativePath: string;
  line: number;
  column: number;
  componentName: string | null;
  exportName: string | null;
  branch: string;
  confidence: MappingConfidence;
}

export interface BoundarySelection {
  identity: SourceIdentity;
  ancestors: SourceIdentity[];
}

export interface SelectionRefusal {
  confidence: 'refused';
  reason: string;
  evidence: string;
  supportedAncestorAvailable: boolean;
}

export function isSourceIdentity(value: unknown): value is SourceIdentity {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.boundaryId === 'string' && typeof item.instanceId === 'string' &&
    typeof item.repositoryRelativePath === 'string' && !item.repositoryRelativePath.includes('..') &&
    typeof item.line === 'number' && item.line > 0 && typeof item.column === 'number' && item.column > 0 &&
    (typeof item.componentName === 'string' || item.componentName === null) &&
    (typeof item.exportName === 'string' || item.exportName === null) && typeof item.branch === 'string' &&
    (item.confidence === 'exact' || item.confidence === 'partial');
}
