import {
  cataloguePlanIdentity,
  canonicalizeCatalogueIntegrationPlan,
  clearIntegrationSelections,
  emptyCatalogueIntegrationPlan,
  hasIncompatibleProductId,
  historicalCandidateKeyForPlan,
  incompatibleProductIdDecision,
  quickViewPlanDecision,
  quickViewPlanSelections,
  removePlanSelection,
  replacePlanSelection,
  sidebarPlanDecision,
  sidebarPlanSelection,
  type CatalogueIntegrationPlan
} from './catalogueIntegrationPlan';
import {
  catalogueCapabilityFromRuntime,
  catalogueScopesForCapability
} from './catalogueSelectionCapabilities';
import type { CatalogueProductId } from './catalogueProducts';
import type { CategorySidebarConfigurationSelection } from './categorySidebarConfiguration';
import type { IntegrationFoundation } from '../../../packages/integration-plan/src/integrationPlan';
import { changeCatalogueFoundation } from './catalogueIntegrationPlan';

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

export type ShowcaseSelectionState = CatalogueIntegrationPlan;

export type ShowcaseSelectionAction =
  | { type: 'toggle-scope'; scope: ShowcaseScope }
  | { type: 'remove-scope'; scope: ShowcaseScope }
  | { type: 'configure-category-sidebar'; configuration: CategorySidebarConfigurationSelection }
  | { type: 'clear' }
  | { type: 'change-foundation'; foundation: IntegrationFoundation }
  | { type: 'toggle-incompatible' };

export const emptyShowcaseSelection = emptyCatalogueIntegrationPlan;

export function scopeKey(scope: ShowcaseScope) {
  return scope.kind === 'feature' ? scope.featureId : `${scope.featureId}:${scope.instanceId}`;
}

export function scopeIdentityKey(scope: ShowcaseScope) {
  return `${scope.pageId}:${scope.route}:${scope.branch}:${scope.capabilityId}`;
}

export function selectionScopes(state: ShowcaseSelectionState): ShowcaseScope[] {
  const canonical = canonicalizeCatalogueIntegrationPlan(state);
  const scopes: ShowcaseScope[] = [];
  const sidebar = sidebarPlanSelection(canonical);
  if (sidebar) scopes.push({
    kind: 'feature',
    featureId: 'category-sidebar',
    branch: 'branch-a',
    capabilityId: 'category-sidebar',
    route: sidebar.route,
    pageId: sidebar.pageId,
    configuration: {
      capabilityId: 'category-sidebar:options',
      sourceBranch: 'branch-a',
      route: sidebar.route,
      pageId: sidebar.pageId,
      identity: sidebar.configuration.identity,
      configuration: {
        enabledCategoryIds: [...sidebar.configuration.enabledCategoryIds],
        defaultCategoryId: sidebar.configuration.defaultCategoryId,
        showHeading: sidebar.configuration.showHeading,
        showProductCounts: sidebar.configuration.showProductCounts
      }
    }
  });
  for (const selection of quickViewPlanSelections(canonical)) scopes.push({
    kind: 'feature-instance',
    featureId: 'product-quick-view',
    branch: 'branch-b',
    instanceId: selection.targetIds[0],
    capabilityId: selection.capabilityId,
    route: selection.route,
    pageId: selection.pageId
  });
  return scopes;
}

export function categorySidebarDecision(state: ShowcaseSelectionState) {
  return selectionScopes(state).find((scope): scope is Extract<ShowcaseScope, { featureId: 'category-sidebar' }> => (
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
  if (action.type === 'change-foundation') return changeCatalogueFoundation(state, action.foundation).plan;
  if (action.type === 'clear') return clearIntegrationSelections(state);
  if (action.type === 'toggle-incompatible') {
    return hasIncompatibleProductId(state)
      ? removePlanSelection(state, 'experimental-product-id')
      : replacePlanSelection(state, incompatibleProductIdDecision());
  }
  if (action.type === 'configure-category-sidebar') {
    return replacePlanSelection(state, sidebarPlanDecision(action.configuration.configuration));
  }
  if (action.type === 'remove-scope') return removePlanSelection(state, action.scope.capabilityId);
  if (state.selections.some(selection => selection.capabilityId === action.scope.capabilityId)) return state;
  return replacePlanSelection(
    state,
    action.scope.featureId === 'category-sidebar'
      ? sidebarPlanDecision()
      : quickViewPlanDecision(action.scope.instanceId)
  );
}

export function candidateSelection(state: ShowcaseSelectionState) {
  return {
    sidebar: Boolean(sidebarPlanSelection(state)),
    quickViewProductIds: quickViewPlanSelections(state).map(selection => selection.targetIds[0])
  };
}

/** Historical parity/evidence key only. Runtime preview rendering must not consume it. */
export function candidateKey(state: ShowcaseSelectionState) {
  return historicalCandidateKeyForPlan(state);
}

export function hasQuickViewSelection(state: ShowcaseSelectionState) {
  return quickViewPlanSelections(state).length > 0;
}

export function selectionPlanIdentity(state: ShowcaseSelectionState) {
  return cataloguePlanIdentity(state);
}

export { hasIncompatibleProductId };
