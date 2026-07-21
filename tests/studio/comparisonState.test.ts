import { describe, expect, test } from 'vitest';
import { bridgeVersion, type PreviewCapabilities, type PreviewMessage } from '../../packages/shared/src/bridge';
import { compareCapabilities, comparisonReducer, initialComparisonState, planContextSynchronization } from '../../apps/studio/src/comparisonState';

const query: PreviewCapabilities = { routeSync: { version: 1, contract: 'ticket-query-v1' }, fixtureContext: { version: 1, contract: 'support-ticket-ticket-query-v1', entityType: 'ticket' }, sourceSelection: { version: 1 } };
const path: PreviewCapabilities = { routeSync: { version: 1, contract: 'ticket-path-v1' }, fixtureContext: { version: 1, contract: 'support-ticket-ticket-path-v1', entityType: 'ticket' }, sourceSelection: { version: 1 } };
const session = (previewId: 'left' | 'right', branch: string, generation = 1) => ({ previewId, branch, generation, sessionId: `${previewId}-${generation}`, protocolVersion: bridgeVersion, url: `http://${previewId}/tickets`, origin: `http://${previewId}`, port: previewId === 'left' ? 5001 : 5002, worktreePath: `/tmp/${previewId}`, status: 'running' as const, failure: null });
const ready = (previewId: 'left' | 'right', branch: string, capabilities = query): PreviewMessage => ({ version: bridgeVersion, preview: session(previewId, branch), type: 'preview-ready', payload: { capabilities, context: { route: '/tickets', entity: null } } });

describe('central comparison state', () => {
  test('compares explicit capability contracts', () => { expect(compareCapabilities(query, query).compatible).toBe(true); expect(compareCapabilities(query, path)).toMatchObject({ compatible: false }); });
  test('isolates two selections and invalidates only the restarted preview', () => {
    let state = comparisonReducer(initialComparisonState, { type: 'repository-loaded', branches: ['branch-sidebar', 'branch-inspector'], clean: true });
    for (const [id, branch] of [['left','branch-sidebar'],['right','branch-inspector']] as const) { state = comparisonReducer(state, { type: 'preview-started', previewId: id, session: session(id, branch) }); state = comparisonReducer(state, { type: 'preview-message', previewId: id, message: ready(id, branch) }); const identity = { boundaryId: `${id}-definition`, instanceId: `${id}-instance`, repositoryRelativePath: `src/${id}.tsx`, line: 2, column: 1, componentName: id, exportName: id, branch, previewId: id, sessionId: `${id}-1`, generation: 1, confidence: 'exact' as const }; state = comparisonReducer(state, { type: 'preview-message', previewId: id, message: { version: bridgeVersion, preview: session(id, branch), type: 'boundary-selected', payload: { identity, ancestors: [] } } }); }
    expect(state.previews.left.selected?.identity.previewId).toBe('left'); expect(state.previews.right.selected?.identity.previewId).toBe('right');
    state = comparisonReducer(state, { type: 'preview-starting', previewId: 'left' });
    expect(state.previews.left.selected).toBeNull(); expect(state.previews.left.invalidation).toContain('restarted'); expect(state.previews.right.selected).not.toBeNull();
  });
  test('updates the canonical context and prevents reflected operations from propagating', () => {
    let state = comparisonReducer(initialComparisonState, { type: 'repository-loaded', branches: ['a','b'], clean: true });
    for (const id of ['left','right'] as const) { state = comparisonReducer(state, { type: 'preview-started', previewId: id, session: session(id, id) }); state = comparisonReducer(state, { type: 'preview-message', previewId: id, message: ready(id, id) }); }
    const context = { route: '/tickets', entity: { type: 'ticket', id: 'TCK-102' } };
    state = comparisonReducer(state, { type: 'canonical-context', context });
    expect(state.canonicalContext).toEqual(context);
    expect(planContextSynchronization(state, 'left', context, null, 'op-new').target).toBe('right');
    expect(planContextSynchronization(state, 'right', context, 'op-new', 'op-reflected').target).toBeNull();
  });
  test('keeps a healthy preview ready when its peer fails', () => { let state = comparisonReducer(initialComparisonState, { type: 'preview-started', previewId: 'left', session: session('left','main') }); state = comparisonReducer(state, { type: 'preview-message', previewId: 'left', message: ready('left','main') }); state = comparisonReducer(state, { type: 'preview-failed', previewId: 'right', error: 'Vite exited' }); expect(state.previews.left.status).toBe('ready'); expect(state.previews.right.errors.runtime).toBe('Vite exited'); });
});
