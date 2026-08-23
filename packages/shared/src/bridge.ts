import type { RenderedBoundaryReference, RenderedBoundarySelection, SelectionRefusal } from './sourceIdentity';

export const bridgeVersion = 2 as const;

export interface PreviewIdentity {
  previewId: string;
  sessionId: string;
  generation: number;
  branch: string;
}

export interface SyncContract { version: number; contract: string }
export interface PreviewCapabilities {
  routeSync: SyncContract | null;
  fixtureContext: (SyncContract & { entityType: string }) | null;
  sourceSelection: { version: number };
}
export interface FixtureEntity { type: string; id: string }
export interface ComparisonContext { route: string; entity: FixtureEntity | null }
export interface ViewportContext { preset: 'desktop' | 'tablet' | 'mobile'; width: number; height: number }

export type PreviewMessageType =
  | 'preview-ready' | 'preview-state' | 'navigation-changed' | 'viewport-changed'
  | 'selection-mode-enabled' | 'selection-mode-disabled' | 'boundary-hovered'
  | 'boundary-selected' | 'selection-cleared' | 'selection-error' | 'sync-refused'
  | 'runtime-error';
export type StudioCommandType =
  | 'enable-selection' | 'disable-selection' | 'select-ancestor' | 'clear-selection'
  | 'sync-context' | 'sync-viewport';

export interface PreviewMessage { version: 2; preview: PreviewIdentity; type: PreviewMessageType; payload?: unknown }
export interface StudioCommand { version: 2; preview: PreviewIdentity; type: StudioCommandType; payload?: unknown }
export interface PreviewRegistration { origin: string; identity: PreviewIdentity }
export interface BridgeValidation<T> { value: T | null; error: string | null }

const previewTypes = new Set<PreviewMessageType>(['preview-ready','preview-state','navigation-changed','viewport-changed','selection-mode-enabled','selection-mode-disabled','boundary-hovered','boundary-selected','selection-cleared','selection-error','sync-refused','runtime-error']);
const commandTypes = new Set<StudioCommandType>(['enable-selection','disable-selection','select-ancestor','clear-selection','sync-context','sync-viewport']);
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object'; }
function isPositiveInteger(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value > 0; }
export function isPreviewIdentity(value: unknown): value is PreviewIdentity { return isRecord(value) && typeof value.previewId === 'string' && typeof value.sessionId === 'string' && isPositiveInteger(value.generation) && typeof value.branch === 'string'; }
export function samePreviewIdentity(left: PreviewIdentity, right: PreviewIdentity) { return left.previewId === right.previewId && left.sessionId === right.sessionId && left.generation === right.generation && left.branch === right.branch; }
function isSyncContract(value: unknown): value is SyncContract { return isRecord(value) && isPositiveInteger(value.version) && typeof value.contract === 'string'; }
export function isPreviewCapabilities(value: unknown): value is PreviewCapabilities { return isRecord(value) && (value.routeSync === null || isSyncContract(value.routeSync)) && (value.fixtureContext === null || (isRecord(value.fixtureContext) && isSyncContract(value.fixtureContext) && typeof value.fixtureContext.entityType === 'string')) && isRecord(value.sourceSelection) && isPositiveInteger(value.sourceSelection.version); }
export function isComparisonContext(value: unknown): value is ComparisonContext { return isRecord(value) && typeof value.route === 'string' && (value.entity === null || (isRecord(value.entity) && typeof value.entity.type === 'string' && typeof value.entity.id === 'string')); }
function isViewport(value: unknown): value is ViewportContext { return isRecord(value) && (value.preset === 'desktop' || value.preset === 'tablet' || value.preset === 'mobile') && isPositiveInteger(value.width) && isPositiveInteger(value.height); }
function isSelectionReceipt(value: unknown): value is string { return typeof value === 'string' && /^rendered-[A-Za-z0-9_-]{32}$/.test(value); }
function isRenderedBoundary(value: unknown): value is RenderedBoundaryReference { return isRecord(value) && isSelectionReceipt(value.selectionReceipt) && Object.keys(value).length === 1; }
function isSelection(value: unknown): value is RenderedBoundarySelection { return isRecord(value) && Object.keys(value).length === 2 && isSelectionReceipt(value.selectionReceipt) && Array.isArray(value.ancestorSelectionReceipts) && value.ancestorSelectionReceipts.every(isSelectionReceipt); }
function isRefusal(value: unknown): value is SelectionRefusal { return isRecord(value) && value.confidence === 'refused' && typeof value.reason === 'string' && typeof value.evidence === 'string' && typeof value.supportedAncestorAvailable === 'boolean'; }
function hasOperationContext(value: unknown) { return isRecord(value) && (value.operationId === null || typeof value.operationId === 'string') && isComparisonContext(value.context); }
function validPreviewPayload(type: PreviewMessageType, payload: unknown, preview: PreviewIdentity) {
  if (type === 'preview-ready') return isRecord(payload) && isPreviewCapabilities(payload.capabilities) && isComparisonContext(payload.context);
  if (type === 'preview-state' || type === 'navigation-changed') return hasOperationContext(payload);
  if (type === 'viewport-changed') return isRecord(payload) && typeof payload.operationId === 'string' && isViewport(payload.viewport);
  if (type === 'boundary-hovered') return payload === null || isRenderedBoundary(payload);
  if (type === 'boundary-selected') return isSelection(payload);
  if (type === 'selection-cleared') return isRecord(payload) && typeof payload.reason === 'string';
  if (type === 'selection-error') return isRefusal(payload);
  if (type === 'sync-refused') return isRecord(payload) && (payload.dimension === 'route' || payload.dimension === 'fixture-context' || payload.dimension === 'viewport') && typeof payload.reason === 'string';
  if (type === 'runtime-error') return isRecord(payload) && typeof payload.message === 'string';
  return payload === undefined;
}
function validCommandPayload(type: StudioCommandType, payload: unknown) {
  if (type === 'select-ancestor') return isRecord(payload) && Number.isInteger(payload.index) && (payload.index as number) >= 0;
  if (type === 'sync-context') return isRecord(payload) && typeof payload.operationId === 'string' && typeof payload.sourcePreviewId === 'string' && isComparisonContext(payload.context);
  if (type === 'sync-viewport') return isRecord(payload) && typeof payload.operationId === 'string' && isViewport(payload.viewport);
  return payload === undefined;
}

export function parsePreviewMessage(value: unknown, expected?: PreviewIdentity): PreviewMessage | null {
  if (!isRecord(value) || value.version !== bridgeVersion || !isPreviewIdentity(value.preview) || typeof value.type !== 'string' || !previewTypes.has(value.type as PreviewMessageType)) return null;
  if (expected && !samePreviewIdentity(value.preview, expected)) return null;
  const type = value.type as PreviewMessageType;
  return validPreviewPayload(type, value.payload, value.preview) ? { version: 2, preview: value.preview, type, payload: value.payload } : null;
}
export function parseStudioCommand(value: unknown, expected?: PreviewIdentity): StudioCommand | null {
  if (!isRecord(value) || value.version !== bridgeVersion || !isPreviewIdentity(value.preview) || typeof value.type !== 'string' || !commandTypes.has(value.type as StudioCommandType)) return null;
  if (expected && !samePreviewIdentity(value.preview, expected)) return null;
  const type = value.type as StudioCommandType;
  return validCommandPayload(type, value.payload) ? { version: 2, preview: value.preview, type, payload: value.payload } : null;
}
export function validatePreviewEvent(event: Pick<MessageEvent, 'origin' | 'data'>, registration: PreviewRegistration): BridgeValidation<PreviewMessage> {
  if (event.origin !== registration.origin) return { value: null, error: `Origin mismatch: expected ${registration.origin}.` };
  if (!isRecord(event.data) || event.data.version !== bridgeVersion) return { value: null, error: 'Malformed message or unsupported bridge protocol version.' };
  if (!isPreviewIdentity(event.data.preview)) return { value: null, error: 'Missing or malformed preview identity.' };
  if (!samePreviewIdentity(event.data.preview, registration.identity)) return { value: null, error: 'Stale or mismatched preview session identity.' };
  const message = parsePreviewMessage(event.data, registration.identity);
  return message ? { value: message, error: null } : { value: null, error: 'Bridge payload schema validation failed.' };
}
export function acceptsPreviewEvent(event: Pick<MessageEvent, 'origin' | 'data'>, registration: PreviewRegistration) { return validatePreviewEvent(event, registration).value; }
export function createStudioCommand(preview: PreviewIdentity, type: StudioCommandType, payload?: unknown): StudioCommand { const command = { version: bridgeVersion, preview, type, payload }; const parsed = parseStudioCommand(command, preview); if (!parsed) throw new Error(`Invalid ${type} command payload.`); return parsed; }
