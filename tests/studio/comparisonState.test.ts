import { describe, expect, test } from 'vitest';
import { bridgeVersion, type PreviewCapabilities, type PreviewMessage } from '../../packages/shared/src/bridge';
import { compareCapabilities, comparisonReducer, initialComparisonState, planContextSynchronization } from '../../apps/studio/src/comparisonState';
import type { FeatureSliceArtifact } from '../../packages/source-analysis/src/types';

const query: PreviewCapabilities = { routeSync: { version: 1, contract: 'catalogue-query-v1' }, fixtureContext: { version: 1, contract: 'product-catalogue-v1', entityType: 'product' }, sourceSelection: { version: 1 } };
const incompatible: PreviewCapabilities = { routeSync: null, fixtureContext: null, sourceSelection: { version: 1 } };
const session = (previewId: 'left' | 'right', branch: string, generation = 1) => ({ previewId, branch, generation, sessionId: `${previewId}-${generation}`, protocolVersion: bridgeVersion, branchCommit: `${branch}-commit`, url: `http://${previewId}/catalogue`, origin: `http://${previewId}`, port: previewId === 'left' ? 5001 : 5002, worktreePath: `/tmp/${previewId}`, status: 'running' as const, failure: null });
const ready = (previewId: 'left' | 'right', branch: string, capabilities = query): PreviewMessage => ({ version: bridgeVersion, preview: session(previewId, branch), type: 'preview-ready', payload: { capabilities, context: { route: '/catalogue', entity: null } } });
const analysis = (previewId: 'left' | 'right', status: 'resolved' | 'partial' | 'refused' = 'resolved') => ({ analysisId: previewId.repeat(16).slice(0,16), relativePath: '.ums/analysis/id/feature-slice.json', slice: { status } } as FeatureSliceArtifact);

describe('central comparison state', () => {
  test('compares explicit capability contracts', () => { expect(compareCapabilities(query, query).compatible).toBe(true); expect(compareCapabilities(query, incompatible)).toMatchObject({ compatible: false }); });
  test('isolates two selections and invalidates only the restarted preview', () => {
    let state = comparisonReducer(initialComparisonState, { type: 'repository-loaded', branches: ['branch-a', 'branch-b'], clean: true });
    for (const [id, branch] of [['left','branch-a'],['right','branch-b']] as const) { state = comparisonReducer(state, { type: 'preview-started', previewId: id, session: session(id, branch) }); state = comparisonReducer(state, { type: 'preview-message', previewId: id, message: ready(id, branch) }); state = comparisonReducer(state, { type: 'preview-message', previewId: id, message: { version: bridgeVersion, preview: session(id, branch), type: 'boundary-selected', payload: { selectionReceipt: `rendered-${id === 'left' ? 'a'.repeat(32) : 'b'.repeat(32)}`, ancestorSelectionReceipts: [] } } }); }
    expect(state.previews.left.selected?.selectionReceipt).toBe(`rendered-${'a'.repeat(32)}`); expect(state.previews.right.selected?.selectionReceipt).toBe(`rendered-${'b'.repeat(32)}`);
    state = comparisonReducer(state, { type: 'preview-starting', previewId: 'left' });
    expect(state.previews.left.selected).toBeNull(); expect(state.previews.left.invalidation).toContain('restarted'); expect(state.previews.right.selected).not.toBeNull();
  });
  test('updates the canonical context and prevents reflected operations from propagating', () => {
    let state = comparisonReducer(initialComparisonState, { type: 'repository-loaded', branches: ['a','b'], clean: true });
    for (const id of ['left','right'] as const) { state = comparisonReducer(state, { type: 'preview-started', previewId: id, session: session(id, id) }); state = comparisonReducer(state, { type: 'preview-message', previewId: id, message: ready(id, id) }); }
    const context = { route: '/catalogue', entity: { type: 'product', id: 'p-102' } };
    state = comparisonReducer(state, { type: 'canonical-context', context });
    expect(state.canonicalContext).toEqual(context);
    expect(planContextSynchronization(state, 'left', context, null, 'op-new').target).toBe('right');
    expect(planContextSynchronization(state, 'right', context, 'op-new', 'op-reflected').target).toBeNull();
  });
  test('keeps a healthy preview ready when its peer fails', () => { let state = comparisonReducer(initialComparisonState, { type: 'preview-started', previewId: 'left', session: session('left','main') }); state = comparisonReducer(state, { type: 'preview-message', previewId: 'left', message: ready('left','main') }); state = comparisonReducer(state, { type: 'preview-failed', previewId: 'right', error: 'Vite exited' }); expect(state.previews.left.status).toBe('ready'); expect(state.previews.right.errors.runtime).toBe('Vite exited'); });
  test('keeps analysis per preview and marks only a restarted result stale', () => {
    let state = comparisonReducer(initialComparisonState, { type: 'analysis-finished', previewId: 'left', artifact: analysis('left') });
    state = comparisonReducer(state, { type: 'analysis-finished', previewId: 'right', artifact: analysis('right', 'partial') });
    expect(state.previews.left.analysis.status).toBe('resolved'); expect(state.previews.right.analysis.status).toBe('partial');
    state = comparisonReducer(state, { type: 'preview-starting', previewId: 'left' });
    expect(state.previews.left.analysis.status).toBe('stale'); expect(state.previews.left.analysis.error).toContain('preview restarted');
    expect(state.previews.right.analysis.status).toBe('partial'); expect(state.previews.right.analysis.artifact?.analysisId).toBe('rightrightrightr');
    state = comparisonReducer(state, { type: 'analysis-failed', previewId: 'right', error: 'commit mismatch' });
    expect(state.previews.right.analysis).toMatchObject({ status: 'refused', artifact: null, error: 'commit mismatch' });
  });
});
