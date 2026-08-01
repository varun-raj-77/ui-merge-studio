import { canonicalSelectionKey } from '../../../packages/showcase-evidence/src/schema';
import {
  catalogueCapabilityFromRuntime,
  catalogueScopesForCapability
} from './catalogueSelectionCapabilities';
import type { CatalogueProductId } from './catalogueProducts';
import type { CategorySidebarConfigurationSelection } from './categorySidebarConfiguration';

interface ShowcaseScopeOwnership {
  capabilityId: string;
  route: string;
  pageId: string;
}

export type ShowcaseScope = ShowcaseScopeOwnership & (
  | {
    kind: 'feature';
    featureId: 'category-sidebar';
    branch: 'branch-a';
    configuration?: CategorySidebarConfigurationSelection | null;
  }
  | { kind: 'feature-instance'; featureId: 'product-quick-view'; branch: 'branch-b'; instanceId: CatalogueProductId }
);

export interface ShowcaseSelectionState {
  scopes: ShowcaseScope[];
  incompatibleProductId: boolean;
}

export type ShowcaseSelectionAction =
  | { type: 'toggle-scope'; scope: ShowcaseScope }
  | { type: 'remove-scope'; scope: ShowcaseScope }
  | { type: 'configure-category-sidebar'; configuration: CategorySidebarConfigurationSelection }
  | { type: 'clear' }
  | { type: 'toggle-incompatible' };

export const emptyShowcaseSelection: ShowcaseSelectionState = {
  scopes: [],
  incompatibleProductId: false
};

export function scopeKey(scope: ShowcaseScope) {
  return scope.kind === 'feature' ? scope.featureId : `${scope.featureId}:${scope.instanceId}`;
}

export function scopeIdentityKey(scope: ShowcaseScope) {
  return `${scope.pageId}:${scope.route}:${scope.branch}:${scope.capabilityId}`;
}

export function categorySidebarDecision(state: ShowcaseSelectionState) {
  return state.scopes.find((scope): scope is Extract<ShowcaseScope, { featureId: 'category-sidebar' }> => (
    scope.featureId === 'category-sidebar'
  )) ?? null;
}

export function scopeDecisionKey(scope: ShowcaseScope) {
  const configurationIdentity = scope.featureId === 'category-sidebar'
    ? scope.configuration?.identity ?? ''
    : '';
  return `${scopeIdentityKey(scope)}:${configurationIdentity}`;
}

export function scopeFromRuntime(value: string, productIds: readonly string[]): ShowcaseScope | null {
  const match = /^product-quick-view:(.+)$/.exec(value);
  if (match && !productIds.includes(match[1])) return null;
  const capability = catalogueCapabilityFromRuntime(
    value,
    value.startsWith('product-quick-view:') ? 'branch-b' : 'branch-a'
  );
  const scopes = catalogueScopesForCapability(capability);
  return scopes.length === 1 ? scopes[0] : null;
}

export function showcaseSelectionReducer(state: ShowcaseSelectionState, action: ShowcaseSelectionAction): ShowcaseSelectionState {
  if (action.type === 'clear') return emptyShowcaseSelection;
  if (action.type === 'toggle-incompatible') return { ...state, incompatibleProductId: !state.incompatibleProductId };
  if (action.type === 'configure-category-sidebar') {
    const sidebar = categorySidebarDecision(state);
    if (!sidebar) {
      const configuredSidebar: ShowcaseScope = {
        kind: 'feature',
        featureId: 'category-sidebar',
        branch: action.configuration.sourceBranch,
        capabilityId: 'category-sidebar',
        route: action.configuration.route,
        pageId: action.configuration.pageId,
        configuration: action.configuration
      };
      return {
        ...state,
        scopes: [...state.scopes, configuredSidebar].sort((left, right) => (
          scopeIdentityKey(left).localeCompare(scopeIdentityKey(right))
        ))
      };
    }
    return {
      ...state,
      scopes: state.scopes.map(scope => scope.featureId === 'category-sidebar'
        ? { ...scope, configuration: action.configuration }
        : scope)
    };
  }
  const key = scopeIdentityKey(action.scope);
  const contains = state.scopes.some(scope => scopeIdentityKey(scope) === key);
  if (action.type === 'remove-scope') return {
    ...state,
    scopes: state.scopes.filter(scope => scopeIdentityKey(scope) !== key)
  };
  if (contains) return state;
  return { ...state, scopes: [...state.scopes, action.scope].sort((left, right) => scopeIdentityKey(left).localeCompare(scopeIdentityKey(right))) };
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
