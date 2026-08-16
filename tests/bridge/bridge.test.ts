import { describe, expect, test } from 'vitest';
import { acceptsPreviewEvent, bridgeVersion, createStudioCommand, parsePreviewMessage, parseStudioCommand, validatePreviewEvent, type PreviewIdentity } from '../../packages/shared/src/bridge';

const preview: PreviewIdentity = { previewId: 'left', sessionId: 'session-new', generation: 2, branch: 'main' };
const registration = { origin: 'http://preview', identity: preview };
const selectionReceipt = `rendered-${'a'.repeat(32)}`;

describe('versioned preview bridge', () => {
  test('accepts an opaque rendered-selection receipt from the registered origin and session', () => {
    const message = { version: bridgeVersion, preview, type: 'boundary-selected', payload: { selectionReceipt, ancestorSelectionReceipts: [] } };
    expect(acceptsPreviewEvent({ origin: 'http://preview', data: message }, registration)?.type).toBe('boundary-selected');
  });
  test('rejects invalid origins, preview IDs, session IDs, and stale generations', () => {
    const ready = (override: Partial<PreviewIdentity>) => ({ version: bridgeVersion, preview: { ...preview, ...override }, type: 'preview-ready', payload: { capabilities: { routeSync: null, fixtureContext: null, sourceSelection: { version: 1 } }, context: { route: '/catalogue', entity: null } } });
    expect(validatePreviewEvent({ origin: 'http://hostile', data: ready({}) }, registration).error).toContain('Origin mismatch');
    expect(validatePreviewEvent({ origin: 'http://preview', data: ready({ previewId: 'right' }) }, registration).error).toContain('mismatched');
    expect(validatePreviewEvent({ origin: 'http://preview', data: ready({ sessionId: 'session-old' }) }, registration).error).toContain('mismatched');
    expect(validatePreviewEvent({ origin: 'http://preview', data: ready({ generation: 1 }) }, registration).error).toContain('mismatched');
  });
  test('rejects malformed payloads and unknown or old protocols', () => {
    expect(parsePreviewMessage({ version: bridgeVersion, preview, type: 'boundary-selected', payload: {} })).toBeNull();
    expect(parsePreviewMessage({ version: bridgeVersion, preview, type: 'everything' })).toBeNull();
    expect(parsePreviewMessage({ version: 1, preview, type: 'preview-ready' })).toBeNull();
  });
  test('rejects browser-authored source identities even when their session fields look current', () => {
    const identity = { boundaryId: 'abc', instanceId: 'abc-1', repositoryRelativePath: 'src/View.tsx', line: 4, column: 2, componentName: 'View', exportName: 'View', branch: 'main', previewId: 'left', sessionId: 'session-new', generation: 2, confidence: 'exact' as const };
    expect(parsePreviewMessage({ version: bridgeVersion, preview, type: 'boundary-selected', payload: { identity, ancestors: [] } })).toBeNull();
  });
  test('validates identity-bound commands, synchronization payloads, and ancestor indexes', () => {
    expect(createStudioCommand(preview, 'enable-selection').type).toBe('enable-selection');
    expect(parseStudioCommand({ version: bridgeVersion, preview, type: 'select-ancestor', payload: { index: 1 } }, preview)).not.toBeNull();
    expect(parseStudioCommand({ version: bridgeVersion, preview, type: 'select-ancestor', payload: { index: 'one' } }, preview)).toBeNull();
    expect(parseStudioCommand({ version: bridgeVersion, preview, type: 'sync-context', payload: { operationId: 'op-1', sourcePreviewId: 'right', context: { route: '/catalogue', entity: { type: 'product', id: 'p-102' } } } }, preview)).not.toBeNull();
  });
});
