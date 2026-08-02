import { canonicalSelectionKey } from '../../../packages/showcase-evidence/src/schema';
import manifestJson from './generated/showcaseRun.json';
import { validatePublicShowcaseReport } from '../../../packages/showcase-evidence/src/schema';
import type { CandidateSourceConfiguration } from '../../../packages/candidate-generation/src/types';
import {
  canonicalizeIntegrationPlan,
  createEmptyIntegrationPlan,
  integrationPlanIdentity,
  refuseIntegrationPlan,
  type IntegrationPlanAdapter,
  type IntegrationFoundation,
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
export const catalogueRepositoryId = 'controlled-product-catalogue';
const recordedRepository = validatePublicShowcaseReport(manifestJson).repository;
const commitPattern = /^[a-f0-9]{40}$/;

export type CatalogueFoundationBranch = 'main' | 'branch-a' | 'branch-b' | 'branch-incompatible';
export const catalogueFoundationLabels: Record<CatalogueFoundationBranch, string> = {
  main: 'Main',
  'branch-a': 'Version A',
  'branch-b': 'Version B',
  'branch-incompatible': 'Experimental Product-ID'
};

export const catalogueRecordedCommits: Record<CatalogueFoundationBranch, string> = {
  main: recordedRepository.commonBaseCommit,
  'branch-a': recordedRepository.branchA.commit,
  'branch-b': recordedRepository.branchB.commit,
  'branch-incompatible': recordedRepository.incompatible.commit
};

export function catalogueFoundation(
  branchRef: CatalogueFoundationBranch,
  commits: Partial<Record<CatalogueFoundationBranch, string>> = {}
): IntegrationFoundation {
  return {
    repositoryId: catalogueRepositoryId,
    branchRef,
    commitSha: commits[branchRef] ?? catalogueRecordedCommits[branchRef],
    commonAncestorCommit: commits.main ?? catalogueRecordedCommits.main,
    role: 'base'
  };
}

export const catalogueFoundationOptions = ([
  ['main', 'Include only the features you select.'],
  ['branch-a', 'Include all Version A changes, then add selected features from other versions.'],
  ['branch-b', 'Include all Version B changes, then add selected features from other versions.']
] as const).map(([branchRef, description]) => ({
  branchRef,
  label: catalogueFoundationLabels[branchRef],
  description,
  foundation: catalogueFoundation(branchRef)
}));

export interface CatalogueSidebarPlanSelection extends IntegrationSelection {
  capabilityId: 'category-sidebar';
  capabilityKind: 'whole-feature';
  sourceBranch: 'branch-a';
  sourceCommitSha: string;
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
  sourceCommitSha: string;
  route: typeof catalogueRoute;
  pageId: typeof cataloguePageId;
  parentCapabilityId: typeof quickViewAllCapabilityId;
  targetIds: [CatalogueProductId];
}

export interface CatalogueIncompatiblePlanSelection extends IntegrationSelection {
  capabilityId: typeof productIdCapabilityId;
  capabilityKind: 'whole-feature';
  sourceBranch: 'branch-incompatible';
  sourceCommitSha: string;
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
  if (!commitPattern.test(selection.sourceCommitSha ?? '')) {
    refuseIntegrationPlan(
      'This feature is missing its pinned source version.',
      `${selection.capabilityId} requires an exact 40-character Git commit SHA.`
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
  id: 'product-catalogue-v2',
  defaultFoundation: catalogueFoundation('main'),
  normalizeFoundation(foundation) {
    const branchRef = foundation?.branchRef as CatalogueFoundationBranch;
    if (foundation?.role !== 'base'
      || foundation.repositoryId !== catalogueRepositoryId
      || !(branchRef in catalogueFoundationLabels)) {
      refuseIntegrationPlan(
        'This integration plan does not use a supported foundation.',
        `Expected ${catalogueRepositoryId} and Main, Version A, Version B, or the controlled incompatible proof.`
      );
    }
    if (!commitPattern.test(foundation.commitSha ?? '')
      || !commitPattern.test(foundation.commonAncestorCommit ?? '')) {
      refuseIntegrationPlan(
        'The selected foundation is not pinned to verified Git history.',
        'Foundation commit and common ancestor must be exact 40-character Git SHAs.'
      );
    }
    return {
      repositoryId: catalogueRepositoryId,
      branchRef,
      commitSha: foundation.commitSha,
      commonAncestorCommit: foundation.commonAncestorCommit,
      role: 'base'
    };
  },
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
        sourceCommitSha: selection.sourceCommitSha,
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
        sourceCommitSha: selection.sourceCommitSha,
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
        sourceCommitSha: selection.sourceCommitSha,
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
  createEmptyIntegrationPlan(catalogueFoundation('main'))
);

export function canonicalizeCatalogueIntegrationPlan(plan: IntegrationPlanV1) {
  const canonical = canonicalizeIntegrationPlan(plan, catalogueIntegrationPlanAdapter);
  return {
    ...canonical,
    selections: canonical.selections.filter(selection => selection.sourceBranch !== canonical.foundation.branchRef)
  } as CatalogueIntegrationPlan;
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
  foundation: IntegrationFoundation & { label: string };
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
  const foundationBranch = canonical.foundation.branchRef as CatalogueFoundationBranch;
  const foundationIncludesSidebar = foundationBranch === 'branch-a';
  const foundationIncludesQuickViews = foundationBranch === 'branch-b';
  const foundationIsIncompatible = foundationBranch === 'branch-incompatible';
  const quickViewProductIds = foundationIncludesQuickViews
    ? catalogueProducts.map(product => product.id)
    : quickViewPlanSelections(canonical).map(selection => selection.targetIds[0]);
  const incompatibleProductId = foundationIsIncompatible || hasIncompatibleProductId(canonical);
  return {
    planIdentity: cataloguePlanIdentity(canonical),
    foundation: {
      ...canonical.foundation,
      label: catalogueFoundationLabels[foundationBranch]
    },
    route: catalogueRoute,
    pageId: cataloguePageId,
    sidebar: foundationIncludesSidebar
      ? completeCategorySidebarConfiguration
      : sidebar ? normalizeCategorySidebarConfiguration(sidebar.configuration) : null,
    quickViewProductIds,
    incompatibleProductId,
    refused: incompatibleProductId && quickViewProductIds.length > 0
  };
}

export interface CatalogueGenerationProjection {
  planIdentity: string;
  foundation: IntegrationFoundation;
  selectedCapabilities: {
    capabilityId: string;
    sourceBranch: string;
    route: string;
    pageId: string;
    sourceCommitSha: string;
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
  const explicitSidebar = sidebarPlanSelection(canonical);
  const explicitQuickViews = quickViewPlanSelections(canonical).map(selection => selection.targetIds[0]);
  if (explicitSidebar) sourceConfigurations.push({
    ...categorySidebarRepositoryMetadata.source,
    value: categorySidebarSourceValue(explicitSidebar.configuration)
  });
  if (explicitQuickViews.length) sourceConfigurations.push({
    path: 'src/config/quickViewTargets.ts',
    declaration: 'quickViewTargetIds',
    value: [...explicitQuickViews]
  });
  return {
    planIdentity: preview.planIdentity,
    foundation: canonical.foundation,
    selectedCapabilities: canonical.selections
      .filter(selection => selection.capabilityId !== productIdCapabilityId)
      .map(selection => ({
        capabilityId: selection.capabilityId,
        sourceBranch: selection.sourceBranch,
        sourceCommitSha: selection.sourceCommitSha,
        route: selection.route,
        pageId: selection.pageId
      })),
    sourceConfigurations
  };
}

export interface CatalogueVerificationExpectations {
  planIdentity: string;
  foundation: { branchRef: string; commitSha: string; allChangesIncluded: boolean };
  route: typeof catalogueRoute;
  sidebarPresent: boolean;
  categories: Record<string, boolean>;
  defaultCategoryId: string | null;
  headingVisible: boolean;
  countsVisible: boolean;
  categoryCounts: Record<string, number>;
  quickViewByProductId: Record<CatalogueProductId, boolean>;
  unrelatedPromotionPresent: boolean;
  unrelatedInventoryPresent: boolean;
}

export function integrationPlanToVerificationExpectations(plan: IntegrationPlanV1): CatalogueVerificationExpectations {
  const preview = integrationPlanToPreviewModel(plan);
  const enabled = new Set(preview.sidebar?.enabledCategoryIds ?? []);
  const selectedQuickViews = new Set(preview.quickViewProductIds);
  return {
    planIdentity: preview.planIdentity,
    foundation: {
      branchRef: preview.foundation.branchRef,
      commitSha: preview.foundation.commitSha,
      allChangesIncluded: true
    },
    route: catalogueRoute,
    sidebarPresent: Boolean(preview.sidebar),
    categories: Object.fromEntries(categorySidebarRepositoryMetadata.categories.map(category => [category.id, enabled.has(category.id)])),
    defaultCategoryId: preview.sidebar?.defaultCategoryId ?? null,
    headingVisible: Boolean(preview.sidebar?.showHeading),
    countsVisible: Boolean(preview.sidebar?.showProductCounts),
    categoryCounts: categoryProductCounts(),
    quickViewByProductId: Object.fromEntries(catalogueProducts.map(product => [product.id, selectedQuickViews.has(product.id)])) as Record<CatalogueProductId, boolean>,
    unrelatedPromotionPresent: preview.foundation.branchRef === 'branch-a',
    unrelatedInventoryPresent: preview.foundation.branchRef === 'branch-b'
  };
}

export interface CatalogueEvidenceSummary {
  planIdentity: string;
  foundation: {
    label: string;
    branchRef: string;
    commitSha: string;
    commonAncestorCommit: string;
    description: string;
  };
  groups: {
    route: string;
    pageId: string;
    rows: { capabilityId: string; label: string; details: string[]; sourceBranch: string; sourceLabel: string }[];
  }[];
}

export function integrationPlanToEvidenceSummary(plan: IntegrationPlanV1): CatalogueEvidenceSummary {
  const canonical = canonicalizeCatalogueIntegrationPlan(plan);
  const preview = integrationPlanToPreviewModel(plan);
  const explicitSidebar = sidebarPlanSelection(canonical);
  const explicitQuickViews = quickViewPlanSelections(canonical).map(selection => selection.targetIds[0]);
  const rows: CatalogueEvidenceSummary['groups'][number]['rows'] = [];
  if (explicitSidebar) rows.push({
    capabilityId: 'category-sidebar',
    label: 'Category sidebar',
    sourceBranch: 'branch-a',
    sourceLabel: 'Version A',
    details: [
      categoryLabels(explicitSidebar.configuration.enabledCategoryIds).join(', '),
      `Default: ${categoryLabels([explicitSidebar.configuration.defaultCategoryId])[0]}`,
      `Heading: ${explicitSidebar.configuration.showHeading ? 'Shown' : 'Hidden'}`,
      `Counts: ${explicitSidebar.configuration.showProductCounts ? 'Shown' : 'Hidden'}`
    ]
  });
  if (explicitQuickViews.length) rows.push({
    capabilityId: 'product-quick-view',
    label: 'Quick View',
    sourceBranch: 'branch-b',
    sourceLabel: 'Version B',
    details: explicitQuickViews.map(id => catalogueProducts.find(product => product.id === id)!.name)
  });
  return {
    planIdentity: preview.planIdentity,
    foundation: {
      label: preview.foundation.label,
      branchRef: preview.foundation.branchRef,
      commitSha: preview.foundation.commitSha,
      commonAncestorCommit: preview.foundation.commonAncestorCommit,
      description: preview.foundation.branchRef === 'main'
        ? 'Only explicitly selected features are added.'
        : `All ${preview.foundation.label} changes are included.`
    },
    groups: [...new Set(rows.map(row => row.sourceBranch))].map(sourceBranch => ({
      route: catalogueRoute,
      pageId: cataloguePageId,
      rows: rows.filter(row => row.sourceBranch === sourceBranch)
    }))
  };
}

export interface FoundationChangeResult {
  plan: CatalogueIntegrationPlan;
  removedCapabilityIds: string[];
  announcement: string;
}

export function changeCatalogueFoundation(
  plan: IntegrationPlanV1,
  foundation: IntegrationFoundation
): FoundationChangeResult {
  const current = canonicalizeCatalogueIntegrationPlan(plan);
  const normalizedFoundation = catalogueIntegrationPlanAdapter.normalizeFoundation(foundation);
  const removed = current.selections.filter(selection => selection.sourceBranch === normalizedFoundation.branchRef);
  const next = canonicalizeCatalogueIntegrationPlan({
    ...current,
    foundation: normalizedFoundation,
    selections: current.selections.filter(selection => selection.sourceBranch !== normalizedFoundation.branchRef)
  });
  const preview = integrationPlanToPreviewModel(next);
  if (preview.refused) {
    const label = catalogueFoundationLabels[normalizedFoundation.branchRef as CatalogueFoundationBranch];
    refuseIntegrationPlan(
      `${label} cannot be used as the foundation with the current selections.`,
      normalizedFoundation.branchRef === 'branch-incompatible'
        ? 'This foundation replaces stable product IDs required by the selected Quick Views.'
        : 'The selected Product-ID change conflicts with Quick Views included by this foundation.'
    );
  }
  const label = catalogueFoundationLabels[normalizedFoundation.branchRef as CatalogueFoundationBranch];
  const removedDescription = removed.length
    ? ` ${removed.map(selection => selection.capabilityId.startsWith('product-quick-view:') ? 'Quick View' : 'Category sidebar').filter((value, index, values) => values.indexOf(value) === index).join(' and ')} is now included through ${label}, so the separate selection was removed.`
    : '';
  return {
    plan: next,
    removedCapabilityIds: removed.map(selection => selection.capabilityId),
    announcement: `Changed foundation to ${label}.${removedDescription}`
  };
}

export function foundationIncludesCapability(plan: IntegrationPlanV1, sourceBranch: string) {
  return canonicalizeCatalogueIntegrationPlan(plan).foundation.branchRef === sourceBranch;
}

export function historicalCandidateKeyForPlan(plan: IntegrationPlanV1) {
  const preview = integrationPlanToPreviewModel(plan);
  return canonicalSelectionKey({
    sidebar: Boolean(preview.sidebar),
    quickViewProductIds: preview.quickViewProductIds
  });
}

export function sidebarPlanDecision(
  configuration: CategorySidebarConfiguration = completeCategorySidebarConfiguration,
  sourceCommitSha = catalogueRecordedCommits['branch-a']
): CatalogueSidebarPlanSelection {
  return catalogueIntegrationPlanAdapter.normalizeSelection({
    capabilityId: 'category-sidebar',
    capabilityKind: 'whole-feature',
    sourceBranch: 'branch-a',
    sourceCommitSha,
    route: catalogueRoute,
    pageId: cataloguePageId,
    configuration
  }) as CatalogueSidebarPlanSelection;
}

export function quickViewPlanDecision(
  productId: CatalogueProductId,
  sourceCommitSha = catalogueRecordedCommits['branch-b']
): CatalogueQuickViewPlanSelection {
  return catalogueIntegrationPlanAdapter.normalizeSelection({
    capabilityId: `product-quick-view:${productId}`,
    capabilityKind: 'feature-instance',
    sourceBranch: 'branch-b',
    sourceCommitSha,
    route: catalogueRoute,
    pageId: cataloguePageId,
    parentCapabilityId: quickViewAllCapabilityId,
    targetIds: [productId]
  }) as CatalogueQuickViewPlanSelection;
}

export function incompatibleProductIdDecision(
  sourceCommitSha = catalogueRecordedCommits['branch-incompatible']
): CatalogueIncompatiblePlanSelection {
  return catalogueIntegrationPlanAdapter.normalizeSelection({
    capabilityId: productIdCapabilityId,
    capabilityKind: 'whole-feature',
    sourceBranch: 'branch-incompatible',
    sourceCommitSha,
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
