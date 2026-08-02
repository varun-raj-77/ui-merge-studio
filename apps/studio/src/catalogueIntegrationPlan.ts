import { canonicalSelectionKey } from '../../../packages/showcase-evidence/src/schema';
import type { CandidateSourceConfiguration } from '../../../packages/candidate-generation/src/types';
import {
  canonicalizeIntegrationPlan,
  createEmptyIntegrationPlan,
  integrationPlanIdentity,
  refuseIntegrationPlan,
  type IntegrationPlanAdapter,
  type IntegrationPlanV1,
  type IntegrationSelection
} from '../../../packages/integration-plan/src/integrationPlan';
import { catalogueProducts, type CatalogueProductId } from './catalogueProducts';
import {
  cataloguePageId,
  catalogueRoute,
  quickViewAllCapabilityId
} from './catalogueSelectionCapabilities';
import {
  categoryLabels,
  categoryProductCounts,
  categorySidebarRepositoryMetadata,
  categorySidebarSourceValue,
  completeCategorySidebarConfiguration,
  normalizeCategorySidebarConfiguration,
  type CategorySidebarConfiguration
} from './categorySidebarConfiguration';

export const catalogueIntegrationAdapterVersion = 1 as const;
export const productIdCapabilityId = 'experimental-product-id';

export interface CatalogueSidebarPlanSelection extends IntegrationSelection {
  capabilityId: 'category-sidebar';
  capabilityKind: 'whole-feature';
  sourceBranch: 'branch-a';
  route: typeof catalogueRoute;
  pageId: typeof cataloguePageId;
  configuration: CategorySidebarConfiguration & {
    schemaVersion: typeof catalogueIntegrationAdapterVersion;
    identity: string;
  };
}

export interface CatalogueQuickViewPlanSelection extends IntegrationSelection {
  capabilityId: `product-quick-view:${CatalogueProductId}`;
  capabilityKind: 'feature-instance';
  sourceBranch: 'branch-b';
  route: typeof catalogueRoute;
  pageId: typeof cataloguePageId;
  parentCapabilityId: typeof quickViewAllCapabilityId;
  targetIds: [CatalogueProductId];
}

export interface CatalogueIncompatiblePlanSelection extends IntegrationSelection {
  capabilityId: typeof productIdCapabilityId;
  capabilityKind: 'whole-feature';
  sourceBranch: 'branch-incompatible';
  route: typeof catalogueRoute;
  pageId: typeof cataloguePageId;
}

export type CataloguePlanSelection =
  | CatalogueSidebarPlanSelection
  | CatalogueQuickViewPlanSelection
  | CatalogueIncompatiblePlanSelection;

export type CatalogueIntegrationPlan = IntegrationPlanV1 & {
  selections: CataloguePlanSelection[];
};

const productOrder = new Map(catalogueProducts.map((product, index) => [product.id, index]));
function validateOwnership(selection: IntegrationSelection, expected: {
  branch: string;
  route?: string;
  pageId?: string;
}) {
  if (selection.sourceBranch !== expected.branch) {
    refuseIntegrationPlan(
      'This feature belongs to a different source version.',
      `${selection.capabilityId} must use ${expected.branch}; received ${selection.sourceBranch || '(missing)'}.`
    );
  }
  if (selection.route !== (expected.route ?? catalogueRoute)
    || selection.pageId !== (expected.pageId ?? cataloguePageId)) {
    refuseIntegrationPlan(
      'This feature cannot be moved to the requested page.',
      `${selection.capabilityId} must remain on ${cataloguePageId} ${catalogueRoute}.`
    );
  }
}

export const catalogueIntegrationPlanAdapter: IntegrationPlanAdapter<CataloguePlanSelection> = {
  id: 'product-catalogue-v1',
  foundationBranch: 'main',
  normalizeSelection(selection) {
    if (!selection || typeof selection !== 'object' || typeof selection.capabilityId !== 'string') {
      refuseIntegrationPlan('This integration decision is incomplete.', 'A capability ID is required.');
    }
    if (selection.capabilityId === 'category-sidebar') {
      validateOwnership(selection, { branch: 'branch-a' });
      if (selection.capabilityKind !== 'whole-feature') {
        refuseIntegrationPlan('The Category sidebar decision is malformed.', 'Expected whole-feature capability kind.');
      }
      const raw = selection.configuration == null
        ? completeCategorySidebarConfiguration
        : selection.configuration as Partial<CatalogueSidebarPlanSelection['configuration']>;
      if ('schemaVersion' in raw && raw.schemaVersion !== catalogueIntegrationAdapterVersion) {
        refuseIntegrationPlan(
          'This Category sidebar configuration uses an unsupported version.',
          `Expected adapter schema ${catalogueIntegrationAdapterVersion}; received ${raw.schemaVersion}.`
        );
      }
      const configuration = normalizeCategorySidebarConfiguration({
        enabledCategoryIds: raw.enabledCategoryIds as readonly string[],
        defaultCategoryId: raw.defaultCategoryId as string,
        showHeading: raw.showHeading,
        showProductCounts: raw.showProductCounts
      });
      const identity = `categories-${configuration.enabledCategoryIds.join('_')}--default-${configuration.defaultCategoryId}--heading-${configuration.showHeading ? 'shown' : 'hidden'}--counts-${configuration.showProductCounts ? 'shown' : 'hidden'}`;
      return {
        capabilityId: 'category-sidebar',
        capabilityKind: 'whole-feature',
        sourceBranch: 'branch-a',
        route: catalogueRoute,
        pageId: cataloguePageId,
        configuration: {
          schemaVersion: catalogueIntegrationAdapterVersion,
          identity,
          ...configuration
        }
      };
    }
    if (selection.capabilityId === productIdCapabilityId) {
      validateOwnership(selection, { branch: 'branch-incompatible' });
      if (selection.capabilityKind !== 'whole-feature') {
        refuseIntegrationPlan('The Product-ID decision is malformed.', 'Expected whole-feature capability kind.');
      }
      return {
        capabilityId: productIdCapabilityId,
        capabilityKind: 'whole-feature',
        sourceBranch: 'branch-incompatible',
        route: catalogueRoute,
        pageId: cataloguePageId
      };
    }
    const match = /^product-quick-view:(.+)$/.exec(selection.capabilityId);
    if (match) {
      validateOwnership(selection, { branch: 'branch-b' });
      if (selection.capabilityKind !== 'feature-instance') {
        refuseIntegrationPlan('This Quick View decision is malformed.', 'Expected feature-instance capability kind.');
      }
      const targetIds = selection.targetIds ?? [match[1]];
      if (targetIds.length !== 1 || new Set(targetIds).size !== targetIds.length) {
        refuseIntegrationPlan('Quick View must target one product once.', `Received targets: ${targetIds.join(', ') || '(none)'}.`);
      }
      const productId = targetIds[0] as CatalogueProductId;
      if (match[1] !== productId || !productOrder.has(productId)) {
        refuseIntegrationPlan(
          'Quick View cannot be added because this product is not available in the selected version.',
          `Unknown or mismatched stable product ID ${productId || match[1]}.`
        );
      }
      return {
        capabilityId: `product-quick-view:${productId}`,
        capabilityKind: 'feature-instance',
        sourceBranch: 'branch-b',
        route: catalogueRoute,
        pageId: cataloguePageId,
        parentCapabilityId: quickViewAllCapabilityId,
        targetIds: [productId]
      };
    }
    if (selection.capabilityId === 'category-sidebar:options') {
      refuseIntegrationPlan(
        'Add the Category sidebar before applying its configuration.',
        'Category configuration must be embedded in the Category sidebar selection.'
      );
    }
    refuseIntegrationPlan(
      'This feature is not supported by the Product Catalogue adapter.',
      `Unknown capability ${selection.capabilityId}.`
    );
  },
  selectionIdentity(selection) {
    return selection.capabilityId;
  },
  selectionOrder(selection) {
    const prefix = `${selection.pageId}:${selection.route}:`;
    if (selection.capabilityId === 'category-sidebar') return `${prefix}0`;
    if (selection.capabilityId.startsWith('product-quick-view:')) {
      return `${prefix}1:${String(productOrder.get(selection.targetIds![0] as CatalogueProductId)).padStart(3, '0')}`;
    }
    return `${prefix}2:${selection.capabilityId}`;
  }
};

export const emptyCatalogueIntegrationPlan = canonicalizeCatalogueIntegrationPlan(
  createEmptyIntegrationPlan('main')
);

export function canonicalizeCatalogueIntegrationPlan(plan: IntegrationPlanV1) {
  return canonicalizeIntegrationPlan(plan, catalogueIntegrationPlanAdapter) as CatalogueIntegrationPlan;
}

export function cataloguePlanIdentity(plan: IntegrationPlanV1) {
  return integrationPlanIdentity(plan, catalogueIntegrationPlanAdapter);
}

export function sidebarPlanSelection(plan: IntegrationPlanV1) {
  return canonicalizeCatalogueIntegrationPlan(plan).selections.find(
    (selection): selection is CatalogueSidebarPlanSelection => selection.capabilityId === 'category-sidebar'
  ) ?? null;
}

export function quickViewPlanSelections(plan: IntegrationPlanV1) {
  return canonicalizeCatalogueIntegrationPlan(plan).selections.filter(
    (selection): selection is CatalogueQuickViewPlanSelection => selection.capabilityId.startsWith('product-quick-view:')
  );
}

export function hasIncompatibleProductId(plan: IntegrationPlanV1) {
  return canonicalizeCatalogueIntegrationPlan(plan).selections.some(selection => selection.capabilityId === productIdCapabilityId);
}

export interface CataloguePreviewModel {
  planIdentity: string;
  route: typeof catalogueRoute;
  pageId: typeof cataloguePageId;
  sidebar: CategorySidebarConfiguration | null;
  quickViewProductIds: CatalogueProductId[];
  incompatibleProductId: boolean;
  refused: boolean;
}

export function integrationPlanToPreviewModel(plan: IntegrationPlanV1): CataloguePreviewModel {
  const canonical = canonicalizeCatalogueIntegrationPlan(plan);
  const sidebar = sidebarPlanSelection(canonical);
  const quickViewProductIds = quickViewPlanSelections(canonical).map(selection => selection.targetIds[0]);
  const incompatibleProductId = hasIncompatibleProductId(canonical);
  return {
    planIdentity: cataloguePlanIdentity(canonical),
    route: catalogueRoute,
    pageId: cataloguePageId,
    sidebar: sidebar ? normalizeCategorySidebarConfiguration(sidebar.configuration) : null,
    quickViewProductIds,
    incompatibleProductId,
    refused: incompatibleProductId && quickViewProductIds.length > 0
  };
}

export interface CatalogueGenerationProjection {
  planIdentity: string;
  foundation: { branchRef: 'main'; role: 'base' };
  selectedCapabilities: {
    capabilityId: string;
    sourceBranch: string;
    route: string;
    pageId: string;
  }[];
  sourceConfigurations: Omit<CandidateSourceConfiguration, 'sliceId'>[];
}

export function integrationPlanToGenerationRequest(plan: IntegrationPlanV1): CatalogueGenerationProjection {
  const canonical = canonicalizeCatalogueIntegrationPlan(plan);
  const preview = integrationPlanToPreviewModel(canonical);
  if (preview.refused) {
    refuseIntegrationPlan(
      'This combination is unsafe. The selected Quick Views require stable string product IDs.',
      'The experimental Product-ID change replaces the shared Product.id contract with numeric IDs.'
    );
  }
  const sourceConfigurations: CatalogueGenerationProjection['sourceConfigurations'] = [];
  if (preview.sidebar) sourceConfigurations.push({
    ...categorySidebarRepositoryMetadata.source,
    value: categorySidebarSourceValue(preview.sidebar)
  });
  if (preview.quickViewProductIds.length) sourceConfigurations.push({
    path: 'src/config/quickViewTargets.ts',
    declaration: 'quickViewTargetIds',
    value: [...preview.quickViewProductIds]
  });
  return {
    planIdentity: preview.planIdentity,
    foundation: { branchRef: 'main', role: 'base' },
    selectedCapabilities: canonical.selections
      .filter(selection => selection.capabilityId !== productIdCapabilityId)
      .map(selection => ({
        capabilityId: selection.capabilityId,
        sourceBranch: selection.sourceBranch,
        route: selection.route,
        pageId: selection.pageId
      })),
    sourceConfigurations
  };
}

export interface CatalogueVerificationExpectations {
  planIdentity: string;
  route: typeof catalogueRoute;
  sidebarPresent: boolean;
  categories: Record<string, boolean>;
  defaultCategoryId: string | null;
  headingVisible: boolean;
  countsVisible: boolean;
  categoryCounts: Record<string, number>;
  quickViewByProductId: Record<CatalogueProductId, boolean>;
  unrelatedPromotionPresent: false;
  unrelatedInventoryPresent: false;
}

export function integrationPlanToVerificationExpectations(plan: IntegrationPlanV1): CatalogueVerificationExpectations {
  const preview = integrationPlanToPreviewModel(plan);
  const enabled = new Set(preview.sidebar?.enabledCategoryIds ?? []);
  const selectedQuickViews = new Set(preview.quickViewProductIds);
  return {
    planIdentity: preview.planIdentity,
    route: catalogueRoute,
    sidebarPresent: Boolean(preview.sidebar),
    categories: Object.fromEntries(categorySidebarRepositoryMetadata.categories.map(category => [category.id, enabled.has(category.id)])),
    defaultCategoryId: preview.sidebar?.defaultCategoryId ?? null,
    headingVisible: Boolean(preview.sidebar?.showHeading),
    countsVisible: Boolean(preview.sidebar?.showProductCounts),
    categoryCounts: categoryProductCounts(),
    quickViewByProductId: Object.fromEntries(catalogueProducts.map(product => [product.id, selectedQuickViews.has(product.id)])) as Record<CatalogueProductId, boolean>,
    unrelatedPromotionPresent: false,
    unrelatedInventoryPresent: false
  };
}

export interface CatalogueEvidenceSummary {
  planIdentity: string;
  groups: {
    route: string;
    pageId: string;
    rows: { capabilityId: string; label: string; details: string[]; sourceBranch: string; sourceLabel: string }[];
  }[];
}

export function integrationPlanToEvidenceSummary(plan: IntegrationPlanV1): CatalogueEvidenceSummary {
  const preview = integrationPlanToPreviewModel(plan);
  const rows: CatalogueEvidenceSummary['groups'][number]['rows'] = [];
  if (preview.sidebar) rows.push({
    capabilityId: 'category-sidebar',
    label: 'Category sidebar',
    sourceBranch: 'branch-a',
    sourceLabel: 'Version A',
    details: [
      categoryLabels(preview.sidebar.enabledCategoryIds).join(', '),
      `Default: ${categoryLabels([preview.sidebar.defaultCategoryId])[0]}`,
      `Heading: ${preview.sidebar.showHeading ? 'Shown' : 'Hidden'}`,
      `Counts: ${preview.sidebar.showProductCounts ? 'Shown' : 'Hidden'}`
    ]
  });
  if (preview.quickViewProductIds.length) rows.push({
    capabilityId: 'product-quick-view',
    label: 'Quick View',
    sourceBranch: 'branch-b',
    sourceLabel: 'Version B',
    details: preview.quickViewProductIds.map(id => catalogueProducts.find(product => product.id === id)!.name)
  });
  return {
    planIdentity: preview.planIdentity,
    groups: rows.length ? [{ route: catalogueRoute, pageId: cataloguePageId, rows }] : []
  };
}

export function historicalCandidateKeyForPlan(plan: IntegrationPlanV1) {
  const preview = integrationPlanToPreviewModel(plan);
  return canonicalSelectionKey({
    sidebar: Boolean(preview.sidebar),
    quickViewProductIds: preview.quickViewProductIds
  });
}

export function sidebarPlanDecision(configuration: CategorySidebarConfiguration = completeCategorySidebarConfiguration): CatalogueSidebarPlanSelection {
  return catalogueIntegrationPlanAdapter.normalizeSelection({
    capabilityId: 'category-sidebar',
    capabilityKind: 'whole-feature',
    sourceBranch: 'branch-a',
    route: catalogueRoute,
    pageId: cataloguePageId,
    configuration
  }) as CatalogueSidebarPlanSelection;
}

export function quickViewPlanDecision(productId: CatalogueProductId): CatalogueQuickViewPlanSelection {
  return catalogueIntegrationPlanAdapter.normalizeSelection({
    capabilityId: `product-quick-view:${productId}`,
    capabilityKind: 'feature-instance',
    sourceBranch: 'branch-b',
    route: catalogueRoute,
    pageId: cataloguePageId,
    parentCapabilityId: quickViewAllCapabilityId,
    targetIds: [productId]
  }) as CatalogueQuickViewPlanSelection;
}

export function incompatibleProductIdDecision(): CatalogueIncompatiblePlanSelection {
  return catalogueIntegrationPlanAdapter.normalizeSelection({
    capabilityId: productIdCapabilityId,
    capabilityKind: 'whole-feature',
    sourceBranch: 'branch-incompatible',
    route: catalogueRoute,
    pageId: cataloguePageId
  }) as CatalogueIncompatiblePlanSelection;
}

export function replacePlanSelection(plan: IntegrationPlanV1, selection: CataloguePlanSelection) {
  const canonical = canonicalizeCatalogueIntegrationPlan(plan);
  return canonicalizeCatalogueIntegrationPlan({
    ...canonical,
    selections: [...canonical.selections.filter(item => item.capabilityId !== selection.capabilityId), selection]
  });
}

export function removePlanSelection(plan: IntegrationPlanV1, capabilityId: string) {
  const canonical = canonicalizeCatalogueIntegrationPlan(plan);
  return canonicalizeCatalogueIntegrationPlan({
    ...canonical,
    selections: canonical.selections.filter(selection => selection.capabilityId !== capabilityId)
  });
}

export function clearIntegrationSelections(plan: IntegrationPlanV1) {
  return canonicalizeCatalogueIntegrationPlan({ ...plan, selections: [] });
}
