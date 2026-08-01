import { describe, expect, it } from 'vitest';
import {
  candidateKey,
  candidateSelection,
  emptyShowcaseSelection,
  scopeFromRuntime,
  showcaseSelectionReducer,
  type ShowcaseScope
} from '../../apps/studio/src/showcaseSelection';

const catalogueOwnership = { route: '/catalogue', pageId: 'product-catalogue' } as const;
const sidebar: ShowcaseScope = { kind: 'feature', featureId: 'category-sidebar', branch: 'branch-a', capabilityId: 'category-sidebar', ...catalogueOwnership };
const p102: ShowcaseScope = { kind: 'feature-instance', featureId: 'product-quick-view', branch: 'branch-b', instanceId: 'p-102', capabilityId: 'product-quick-view:p-102', ...catalogueOwnership };
const p104: ShowcaseScope = { kind: 'feature-instance', featureId: 'product-quick-view', branch: 'branch-b', instanceId: 'p-104', capabilityId: 'product-quick-view:p-104', ...catalogueOwnership };

function select(scopes: ShowcaseScope[]) {
  return scopes.reduce((state, scope) => showcaseSelectionReducer(state, { type: 'toggle-scope', scope }), emptyShowcaseSelection);
}

describe('Showcase selection semantics', () => {
  it('separates feature-level and instance-scoped selections', () => {
    const state = select([sidebar, p104]);
    expect(candidateSelection(state)).toEqual({ sidebar: true, quickViewProductIds: ['p-104'] });
  });

  it('canonicalizes order and idempotent additions deterministically', () => {
    expect(candidateKey(select([p104, sidebar, p102]))).toBe(candidateKey(select([p102, p104, sidebar])));
    const selected = select([p102]);
    expect(showcaseSelectionReducer(selected, { type: 'toggle-scope', scope: p102 })).toBe(selected);
    const removed = showcaseSelectionReducer(selected, { type: 'remove-scope', scope: p102 });
    expect(candidateSelection(removed)).toEqual({ sidebar: false, quickViewProductIds: [] });
  });

  it('accepts only runtime scopes supported by the generated product matrix', () => {
    const ids = ['p-101', 'p-102'];
    expect(scopeFromRuntime('category-sidebar', ids)).toEqual(sidebar);
    expect(scopeFromRuntime('product-quick-view:p-102', ids)).toEqual(p102);
    expect(scopeFromRuntime('product-quick-view:p-999', ids)).toBeNull();
    expect(scopeFromRuntime('heading:catalogue', ids)).toBeNull();
  });

  it('clear all returns to baseline including the experimental source', () => {
    const unsafe = showcaseSelectionReducer(select([sidebar, p104]), { type: 'toggle-incompatible' });
    expect(showcaseSelectionReducer(unsafe, { type: 'clear' })).toEqual(emptyShowcaseSelection);
  });
});
