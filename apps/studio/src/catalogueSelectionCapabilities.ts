import { catalogueProducts, type CatalogueProductId } from './catalogueProducts';
import {
  createUnsupportedCapability,
  selectionCapabilityById,
  type SelectionCapability
} from './selectionCapability';
import type { ShowcaseScope } from './showcaseSelection';

export type CatalogueSourceBranch = 'branch-a' | 'branch-b';

export const catalogueRoute = '/catalogue';
export const cataloguePageId = 'product-catalogue';
export const quickViewAllCapabilityId = 'product-quick-view:all';
export const categorySubsetCapabilityId = 'category-sidebar:options';

const productIds = catalogueProducts.map(product => product.id);

export const catalogueSelectionCapabilities = [
  {
    id: 'category-sidebar',
    label: 'Category sidebar',
    kind: 'whole-feature',
    sourceBranch: 'branch-a',
    route: catalogueRoute,
    pageId: cataloguePageId,
    supported: true,
    sourceEvidenceId: 'category-sidebar'
  },
  {
    id: categorySubsetCapabilityId,
    label: 'Customize categories',
    kind: 'configurable-subset',
    sourceBranch: 'branch-a',
    route: catalogueRoute,
    pageId: cataloguePageId,
    parentCapabilityId: 'category-sidebar',
    targetIds: ['all', 'audio', 'desk', 'travel'],
    supported: true,
    sourceEvidenceId: 'category-sidebar'
  },
  {
    id: quickViewAllCapabilityId,
    label: 'Add Quick View to all products',
    kind: 'all-instances',
    sourceBranch: 'branch-b',
    route: catalogueRoute,
    pageId: cataloguePageId,
    targetIds: [...productIds],
    supported: true,
    sourceEvidenceId: 'quick-view'
  },
  ...catalogueProducts.map(product => ({
    id: `product-quick-view:${product.id}`,
    label: `Quick View · ${product.name}`,
    kind: 'feature-instance' as const,
    sourceBranch: 'branch-b' as const,
    route: catalogueRoute,
    pageId: cataloguePageId,
    parentCapabilityId: quickViewAllCapabilityId,
    targetIds: [product.id],
    supported: true,
    sourceEvidenceId: 'quick-view'
  }))
] satisfies SelectionCapability<CatalogueSourceBranch>[];

export function catalogueCapabilityFromRuntime(
  id: string,
  sourceBranch: CatalogueSourceBranch,
  visibleLabel = id
): SelectionCapability<CatalogueSourceBranch> {
  const capability = selectionCapabilityById(
    catalogueSelectionCapabilities,
    id,
    sourceBranch
  );
  if (capability) return capability;
  const otherBranch = catalogueSelectionCapabilities.find(item => item.id === id);
  return createUnsupportedCapability(
    id,
    visibleLabel,
    sourceBranch,
    catalogueRoute,
    cataloguePageId,
    otherBranch
      ? `${visibleLabel} belongs to the other source branch and cannot be selected here.`
      : `${visibleLabel} has no independently verified source boundary.`
  );
}

export function catalogueCapabilityForScope(scope: ShowcaseScope) {
  return catalogueCapabilityFromRuntime(
    scope.capabilityId,
    scope.branch
  );
}

export function catalogueScopesForCapability(
  capability: SelectionCapability<CatalogueSourceBranch>
): ShowcaseScope[] {
  if (!capability.supported) return [];
  if (capability.id === 'category-sidebar') {
    return [{
      kind: 'feature',
      featureId: 'category-sidebar',
      branch: 'branch-a',
      capabilityId: capability.id,
      route: capability.route,
      pageId: capability.pageId
    }];
  }
  if (capability.kind === 'all-instances') {
    return productIds.map(instanceId => ({
      kind: 'feature-instance',
      featureId: 'product-quick-view',
      branch: 'branch-b',
      instanceId,
      capabilityId: `product-quick-view:${instanceId}`,
      route: capability.route,
      pageId: capability.pageId
    }));
  }
  const match = /^product-quick-view:(.+)$/.exec(capability.id);
  if (!match || !productIds.includes(match[1] as CatalogueProductId)) return [];
  return [{
    kind: 'feature-instance',
    featureId: 'product-quick-view',
    branch: 'branch-b',
    instanceId: match[1] as CatalogueProductId,
    capabilityId: capability.id,
    route: capability.route,
    pageId: capability.pageId
  }];
}
