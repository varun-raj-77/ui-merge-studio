import { canonicalSelectionKey } from '../../../packages/showcase-evidence/src/schema';
import type { CatalogueProductId } from './catalogueProducts';

export type ShowcaseScope =
  | { kind: 'feature'; featureId: 'category-sidebar'; branch: 'branch-a' }
  | { kind: 'feature-instance'; featureId: 'product-quick-view'; branch: 'branch-b'; instanceId: CatalogueProductId };

export interface ShowcaseSelectionState {
  scopes: ShowcaseScope[];
  incompatibleProductId: boolean;
}

export type ShowcaseSelectionAction =
  | { type: 'toggle-scope'; scope: ShowcaseScope }
  | { type: 'remove-scope'; scope: ShowcaseScope }
  | { type: 'clear' }
  | { type: 'toggle-incompatible' };

export const emptyShowcaseSelection: ShowcaseSelectionState = { scopes: [], incompatibleProductId: false };

export function scopeKey(scope: ShowcaseScope) {
  return scope.kind === 'feature' ? scope.featureId : `${scope.featureId}:${scope.instanceId}`;
}

export function scopeFromRuntime(value: string, productIds: readonly string[]): ShowcaseScope | null {
  if (value === 'category-sidebar') return { kind: 'feature', featureId: 'category-sidebar', branch: 'branch-a' };
  const match = /^product-quick-view:(.+)$/.exec(value);
  if (!match || !productIds.includes(match[1])) return null;
  return { kind: 'feature-instance', featureId: 'product-quick-view', branch: 'branch-b', instanceId: match[1] as CatalogueProductId };
}

export function showcaseSelectionReducer(state: ShowcaseSelectionState, action: ShowcaseSelectionAction): ShowcaseSelectionState {
  if (action.type === 'clear') return emptyShowcaseSelection;
  if (action.type === 'toggle-incompatible') return { ...state, incompatibleProductId: !state.incompatibleProductId };
  const key = scopeKey(action.scope);
  const contains = state.scopes.some(scope => scopeKey(scope) === key);
  if (action.type === 'remove-scope' || contains) return { ...state, scopes: state.scopes.filter(scope => scopeKey(scope) !== key) };
  return { ...state, scopes: [...state.scopes, action.scope].sort((left, right) => scopeKey(left).localeCompare(scopeKey(right))) };
}

export function candidateSelection(state: ShowcaseSelectionState) {
  return {
    sidebar: state.scopes.some(scope => scope.featureId === 'category-sidebar'),
    quickViewProductIds: state.scopes
      .filter((scope): scope is Extract<ShowcaseScope, { kind: 'feature-instance' }> => scope.kind === 'feature-instance')
      .map(scope => scope.instanceId)
      .sort()
  };
}

export function candidateKey(state: ShowcaseSelectionState) {
  return canonicalSelectionKey(candidateSelection(state));
}

export function hasQuickViewSelection(state: ShowcaseSelectionState) {
  return state.scopes.some(scope => scope.featureId === 'product-quick-view');
}
