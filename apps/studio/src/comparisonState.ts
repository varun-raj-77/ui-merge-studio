import type { PreviewSession } from '../../../packages/preview-runtime/src/previewController';
import type { ComparisonContext, PreviewCapabilities, PreviewMessage, ViewportContext } from '../../../packages/shared/src/bridge';
import type { BoundarySelection, SelectionRefusal, SourceIdentity } from '../../../packages/shared/src/sourceIdentity';
import type { FeatureSliceArtifact } from '../../../packages/source-analysis/src/types';

export type PreviewSlotId = 'left' | 'right';
export type StudioPreviewStatus = 'stopped' | 'starting' | 'restarting' | 'loading' | 'ready' | 'failed';
export interface PreviewErrors { runtime: string | null; bridge: string | null; synchronization: string | null; selection: SelectionRefusal | null }
export interface PreviewSlot {
  id: PreviewSlotId;
  branch: string;
  status: StudioPreviewStatus;
  session: PreviewSession | null;
  capabilities: PreviewCapabilities | null;
  context: ComparisonContext | null;
  selected: BoundarySelection | null;
  hovered: SourceIdentity | null;
  selecting: boolean;
  analysis: { status: 'idle' | 'loading' | 'resolved' | 'partial' | 'refused' | 'stale'; artifact: FeatureSliceArtifact | null; error: string | null };
  invalidation: string | null;
  errors: PreviewErrors;
}
export interface ComparisonState {
  branches: string[];
  repositoryClean: boolean;
  repositoryStatus: string;
  previews: Record<PreviewSlotId, PreviewSlot>;
  canonicalContext: ComparisonContext | null;
  viewport: ViewportContext;
  synchronizationStatus: string;
}

const emptyErrors = (): PreviewErrors => ({ runtime: null, bridge: null, synchronization: null, selection: null });
const slot = (id: PreviewSlotId): PreviewSlot => ({ id, branch: '', status: 'stopped', session: null, capabilities: null, context: null, selected: null, hovered: null, selecting: false, analysis: { status: 'idle', artifact: null, error: null }, invalidation: null, errors: emptyErrors() });
export const viewportPresets: Record<ViewportContext['preset'], ViewportContext> = {
  desktop: { preset: 'desktop', width: 1200, height: 760 },
  tablet: { preset: 'tablet', width: 768, height: 760 },
  mobile: { preset: 'mobile', width: 390, height: 720 }
};
export const initialComparisonState: ComparisonState = { branches: [], repositoryClean: false, repositoryStatus: 'Inspecting fixture…', previews: { left: slot('left'), right: slot('right') }, canonicalContext: null, viewport: viewportPresets.desktop, synchronizationStatus: 'Start both previews to negotiate synchronization.' };

export interface CapabilityResult { compatible: boolean; reason: string }
export function compareCapabilities(left: PreviewCapabilities | null, right: PreviewCapabilities | null): CapabilityResult {
  if (!left || !right) return { compatible: false, reason: 'Waiting for both previews to report capabilities.' };
  if (!left.routeSync || !right.routeSync) return { compatible: false, reason: 'Route synchronization unavailable because a preview did not declare a supported route contract.' };
  if (left.routeSync.version !== right.routeSync.version || left.routeSync.contract !== right.routeSync.contract) return { compatible: false, reason: `Route synchronization unavailable: contracts differ (${left.routeSync.contract} vs ${right.routeSync.contract}).` };
  if (!left.fixtureContext || !right.fixtureContext) return { compatible: false, reason: 'Selected-ticket synchronization unavailable because a preview did not declare a fixture-context contract.' };
  if (left.fixtureContext.version !== right.fixtureContext.version || left.fixtureContext.contract !== right.fixtureContext.contract || left.fixtureContext.entityType !== right.fixtureContext.entityType) return { compatible: false, reason: `Selected-ticket synchronization unavailable: contracts differ (${left.fixtureContext.contract} vs ${right.fixtureContext.contract}).` };
  return { compatible: true, reason: `Route and selected ticket synchronized through ${left.routeSync.contract}.` };
}

export function planContextSynchronization(state: ComparisonState, source: PreviewSlotId, context: ComparisonContext, incomingOperationId: string | null, operationId: string) {
  if (incomingOperationId) return { target: null, reason: 'Applied synchronization acknowledgements are not re-propagated.' } as const;
  const target: PreviewSlotId = source === 'left' ? 'right' : 'left';
  const compatibility = compareCapabilities(state.previews[source].capabilities, state.previews[target].capabilities);
  if (!compatibility.compatible || state.previews[target].status !== 'ready') return { target: null, reason: compatibility.reason } as const;
  return { target, operationId, context, reason: compatibility.reason } as const;
}

export type ComparisonAction =
  | { type: 'repository-loaded'; branches: string[]; clean: boolean }
  | { type: 'repository-failed'; error: string }
  | { type: 'set-branch'; previewId: PreviewSlotId; branch: string }
  | { type: 'preview-starting'; previewId: PreviewSlotId }
  | { type: 'preview-started'; previewId: PreviewSlotId; session: PreviewSession }
  | { type: 'preview-failed'; previewId: PreviewSlotId; error: string }
  | { type: 'preview-message'; previewId: PreviewSlotId; message: PreviewMessage }
  | { type: 'bridge-error'; previewId: PreviewSlotId; error: string }
  | { type: 'sync-status'; status: string; error?: string | null }
  | { type: 'canonical-context'; context: ComparisonContext }
  | { type: 'set-viewport'; viewport: ViewportContext }
  | { type: 'reset-previews' }
  | { type: 'clear-selection'; previewId: PreviewSlotId }
  | { type: 'analysis-started'; previewId: PreviewSlotId }
  | { type: 'analysis-finished'; previewId: PreviewSlotId; artifact: FeatureSliceArtifact }
  | { type: 'analysis-guidance-refused'; previewId: PreviewSlotId; artifact: FeatureSliceArtifact; error: string }
  | { type: 'analysis-failed'; previewId: PreviewSlotId; error: string };

function updateSlot(state: ComparisonState, id: PreviewSlotId, update: (current: PreviewSlot) => PreviewSlot): ComparisonState { return { ...state, previews: { ...state.previews, [id]: update(state.previews[id]) } }; }
export function comparisonReducer(state: ComparisonState, action: ComparisonAction): ComparisonState {
  if (action.type === 'repository-loaded') {
    const preferredLeft = action.branches[0] ?? '';
    const preferredRight = action.branches.find(item => item !== preferredLeft) ?? preferredLeft;
    return { ...state, branches: action.branches, repositoryClean: action.clean, repositoryStatus: action.clean ? 'Ready' : 'Fixture is dirty', previews: { left: { ...state.previews.left, branch: preferredLeft }, right: { ...state.previews.right, branch: preferredRight } } };
  }
  if (action.type === 'repository-failed') return { ...state, repositoryStatus: action.error };
  if (action.type === 'set-branch') return updateSlot(state, action.previewId, current => ({ ...current, branch: action.branch }));
  if (action.type === 'preview-starting') return updateSlot(state, action.previewId, current => {
    const restarted = Boolean(current.session);
    return { ...current, status: restarted ? 'restarting' : 'starting', session: null, capabilities: null, context: null, selected: null, hovered: null, selecting: false, analysis: current.analysis.artifact ? { ...current.analysis, status: 'stale', error: 'Analysis is stale because the preview restarted.' } : current.analysis, invalidation: current.selected ? `Selection cleared: The ${current.branch} preview restarted, so the previous runtime selection is no longer valid.` : current.invalidation, errors: emptyErrors() };
  });
  if (action.type === 'preview-started') return updateSlot(state, action.previewId, current => ({ ...current, branch: action.session.branch, status: 'loading', session: action.session, errors: emptyErrors() }));
  if (action.type === 'preview-failed') return updateSlot(state, action.previewId, current => ({ ...current, status: 'failed', session: null, errors: { ...current.errors, runtime: action.error } }));
  if (action.type === 'bridge-error') return updateSlot(state, action.previewId, current => ({ ...current, errors: { ...current.errors, bridge: action.error } }));
  if (action.type === 'sync-status') {
    const previews = action.error === undefined ? state.previews : {
      left: { ...state.previews.left, errors: { ...state.previews.left.errors, synchronization: action.error ?? null } },
      right: { ...state.previews.right, errors: { ...state.previews.right.errors, synchronization: action.error ?? null } }
    };
    return { ...state, synchronizationStatus: action.status, previews };
  }
  if (action.type === 'canonical-context') return { ...state, canonicalContext: action.context };
  if (action.type === 'set-viewport') return { ...state, viewport: action.viewport };
  if (action.type === 'reset-previews') return {
    ...state,
    previews: {
      left: { ...slot('left'), branch: state.branches[0] ?? '' },
      right: { ...slot('right'), branch: state.branches.find(item => item !== state.branches[0]) ?? state.branches[0] ?? '' }
    },
    canonicalContext: null,
    synchronizationStatus: 'Start both previews to negotiate synchronization.'
  };
  if (action.type === 'clear-selection') return updateSlot(state, action.previewId, current => ({ ...current, selected: null, hovered: null, analysis: current.analysis.artifact ? { ...current.analysis, status: 'stale', error: 'Analysis is stale because its selection was cleared.' } : current.analysis, errors: { ...current.errors, selection: null } }));
  if (action.type === 'analysis-started') return updateSlot(state, action.previewId, current => ({ ...current, analysis: { status: 'loading', artifact: null, error: null } }));
  if (action.type === 'analysis-finished') return updateSlot(state, action.previewId, current => ({ ...current, analysis: { status: action.artifact.slice.status, artifact: action.artifact, error: null } }));
  if (action.type === 'analysis-guidance-refused') return updateSlot(state, action.previewId, current => ({ ...current, analysis: { status: 'refused', artifact: action.artifact, error: action.error } }));
  if (action.type === 'analysis-failed') return updateSlot(state, action.previewId, current => ({ ...current, analysis: { status: 'refused', artifact: null, error: action.error } }));
  if (action.type === 'preview-message') return updateSlot(state, action.previewId, current => {
    const { message } = action;
    if (message.type === 'preview-ready') { const payload = message.payload as { capabilities: PreviewCapabilities; context: ComparisonContext }; return { ...current, status: 'ready', capabilities: payload.capabilities, context: payload.context }; }
    if (message.type === 'preview-state' || message.type === 'navigation-changed') return { ...current, context: (message.payload as { context: ComparisonContext }).context };
    if (message.type === 'selection-mode-enabled') return { ...current, selecting: true };
    if (message.type === 'selection-mode-disabled') return { ...current, selecting: false, hovered: null };
    if (message.type === 'boundary-hovered') return { ...current, hovered: (message.payload as SourceIdentity | null) ?? null };
    if (message.type === 'boundary-selected') return { ...current, selected: message.payload as BoundarySelection, analysis: { status: 'idle', artifact: null, error: null }, invalidation: null, errors: { ...current.errors, selection: null } };
    if (message.type === 'selection-cleared') return { ...current, selected: null, hovered: null, analysis: current.analysis.artifact ? { ...current.analysis, status: 'stale', error: 'Analysis is stale because its runtime selection is no longer active.' } : current.analysis, invalidation: (message.payload as { reason: string }).reason };
    if (message.type === 'selection-error') return { ...current, errors: { ...current.errors, selection: message.payload as SelectionRefusal } };
    if (message.type === 'sync-refused') { const reason = (message.payload as { reason: string }).reason; return { ...current, errors: { ...current.errors, synchronization: reason } }; }
    if (message.type === 'runtime-error') return { ...current, errors: { ...current.errors, runtime: (message.payload as { message: string }).message } };
    return current;
  });
  return state;
}
