import { isSourceIdentity, type BoundarySelection, type SelectionRefusal, type SourceIdentity } from './sourceIdentity';

export const bridgeVersion = 1 as const;
export type PreviewMessageType = 'preview-ready' | 'selection-mode-enabled' | 'selection-mode-disabled' | 'boundary-hovered' | 'boundary-selected' | 'selection-error' | 'runtime-error';
export interface PreviewMessage { version: 1; type: PreviewMessageType; payload?: unknown }
export interface StudioCommand { version: 1; type: 'enable-selection' | 'disable-selection' | 'select-ancestor' | 'clear-selection'; payload?: unknown }

const previewTypes = new Set<PreviewMessageType>(['preview-ready','selection-mode-enabled','selection-mode-disabled','boundary-hovered','boundary-selected','selection-error','runtime-error']);
const commandTypes = new Set<StudioCommand['type']>(['enable-selection','disable-selection','select-ancestor','clear-selection']);
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object'; }
function isSelection(value: unknown): value is BoundarySelection { return isRecord(value) && isSourceIdentity(value.identity) && Array.isArray(value.ancestors) && value.ancestors.every(isSourceIdentity); }
function isRefusal(value: unknown): value is SelectionRefusal { return isRecord(value) && value.confidence === 'refused' && typeof value.reason === 'string' && typeof value.evidence === 'string' && typeof value.supportedAncestorAvailable === 'boolean'; }

export function parsePreviewMessage(value: unknown): PreviewMessage | null {
  if (!isRecord(value) || value.version !== bridgeVersion || typeof value.type !== 'string' || !previewTypes.has(value.type as PreviewMessageType)) return null;
  const type = value.type as PreviewMessageType;
  if ((type === 'boundary-hovered' && value.payload !== null && !isSourceIdentity(value.payload)) || (type === 'boundary-selected' && !isSelection(value.payload)) || (type === 'selection-error' && !isRefusal(value.payload)) || (type === 'runtime-error' && (!isRecord(value.payload) || typeof value.payload.message !== 'string'))) return null;
  return { version: 1, type, payload: value.payload };
}

export function parseStudioCommand(value: unknown): StudioCommand | null {
  if (!isRecord(value) || value.version !== bridgeVersion || typeof value.type !== 'string' || !commandTypes.has(value.type as StudioCommand['type'])) return null;
  if (value.type === 'select-ancestor' && (!isRecord(value.payload) || typeof value.payload.index !== 'number')) return null;
  return { version: 1, type: value.type as StudioCommand['type'], payload: value.payload };
}

export function acceptsPreviewEvent(event: Pick<MessageEvent, 'origin' | 'data'>, expectedOrigin: string) { return event.origin === expectedOrigin ? parsePreviewMessage(event.data) : null; }
