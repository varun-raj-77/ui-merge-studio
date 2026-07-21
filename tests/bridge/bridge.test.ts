import { describe, expect, test } from 'vitest';
import { acceptsPreviewEvent, parsePreviewMessage, parseStudioCommand } from '../../packages/shared/src/bridge';
const identity = { boundaryId: 'abc', instanceId: 'abc-1', repositoryRelativePath: 'src/View.tsx', line: 4, column: 2, componentName: 'View', exportName: 'View', branch: 'main', confidence: 'exact' as const };
describe('versioned preview bridge', () => {
  test('accepts a valid origin and selection payload', () => { const message = { version: 1, type: 'boundary-selected', payload: { identity, ancestors: [] } }; expect(acceptsPreviewEvent({ origin: 'http://preview', data: message }, 'http://preview')?.type).toBe('boundary-selected'); });
  test('rejects an invalid origin', () => { expect(acceptsPreviewEvent({ origin: 'http://hostile', data: { version: 1, type: 'preview-ready' } }, 'http://preview')).toBeNull(); });
  test('rejects malformed, unknown, and stale payloads', () => { expect(parsePreviewMessage({ version: 1, type: 'boundary-selected', payload: {} })).toBeNull(); expect(parsePreviewMessage({ version: 1, type: 'everything' })).toBeNull(); expect(parsePreviewMessage({ version: 2, type: 'preview-ready' })).toBeNull(); });
  test('validates commands and ancestor indexes', () => { expect(parseStudioCommand({ version: 1, type: 'enable-selection' })?.type).toBe('enable-selection'); expect(parseStudioCommand({ version: 1, type: 'select-ancestor', payload: { index: 1 } })).not.toBeNull(); expect(parseStudioCommand({ version: 1, type: 'select-ancestor', payload: { index: 'one' } })).toBeNull(); });
});

