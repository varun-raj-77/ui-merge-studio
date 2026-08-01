import type { CatalogueCategoryId, PreviewContext, PreviewContextNotice } from './previewContext';
import type { CandidateSourceConfiguration } from '../../../packages/candidate-generation/src/types';
import {
  cataloguePageId,
  catalogueRoute,
  categorySubsetCapabilityId,
  type CatalogueSourceBranch
} from './catalogueSelectionCapabilities';

export interface CategorySidebarConfiguration {
  enabledCategoryIds: CatalogueCategoryId[];
  defaultCategoryId: CatalogueCategoryId;
}

export interface CategorySidebarConfigurationSelection {
  capabilityId: typeof categorySubsetCapabilityId;
  sourceBranch: Extract<CatalogueSourceBranch, 'branch-a'>;
  route: typeof catalogueRoute;
  pageId: typeof cataloguePageId;
  identity: string;
  configuration: CategorySidebarConfiguration;
}

export interface CategorySidebarRepositoryMetadata {
  categories: readonly { id: CatalogueCategoryId; label: string }[];
  source: {
    path: string;
    declaration: string;
  };
}

export const categorySidebarRepositoryMetadata: CategorySidebarRepositoryMetadata = {
  categories: [
    { id: 'all', label: 'All' },
    { id: 'audio', label: 'Audio' },
    { id: 'desk', label: 'Desk' },
    { id: 'travel', label: 'Travel' }
  ],
  source: {
    path: 'src/config/categorySidebarConfiguration.ts',
    declaration: 'categorySidebarConfiguration'
  }
};

export class CategorySidebarConfigurationRefusal extends Error {
  constructor(
    public readonly productMessage: string,
    public readonly technicalDetail: string
  ) {
    super(`${productMessage} ${technicalDetail}`);
    this.name = 'CategorySidebarConfigurationRefusal';
  }
}

function refuse(productMessage: string, technicalDetail: string): never {
  throw new CategorySidebarConfigurationRefusal(productMessage, technicalDetail);
}

export function normalizeCategorySidebarConfiguration(
  input: { enabledCategoryIds: readonly string[]; defaultCategoryId: string },
  metadata = categorySidebarRepositoryMetadata
): CategorySidebarConfiguration {
  const order = new Map(metadata.categories.map((category, index) => [category.id, index]));
  const uniqueIds = [...new Set(input.enabledCategoryIds)];
  const unknownIds = uniqueIds.filter(id => !order.has(id as CatalogueCategoryId));
  if (unknownIds.length) {
    refuse(
      'One or more categories are not available for this sidebar.',
      `Unknown category IDs: ${unknownIds.sort().join(', ')}.`
    );
  }
  const enabledCategoryIds = uniqueIds
    .map(id => id as CatalogueCategoryId)
    .sort((left, right) => order.get(left)! - order.get(right)!);
  if (!enabledCategoryIds.length) {
    refuse('Keep at least one category in the sidebar.', 'The enabled category set is empty.');
  }
  if (!order.has(input.defaultCategoryId as CatalogueCategoryId)
    || !enabledCategoryIds.includes(input.defaultCategoryId as CatalogueCategoryId)) {
    refuse(
      'Choose a default category from the categories you kept.',
      `Default category ${input.defaultCategoryId || '(empty)'} is not enabled.`
    );
  }
  return {
    enabledCategoryIds,
    defaultCategoryId: input.defaultCategoryId as CatalogueCategoryId
  };
}

export function categorySidebarConfigurationIdentity(
  input: { enabledCategoryIds: readonly string[]; defaultCategoryId: string }
) {
  const configuration = normalizeCategorySidebarConfiguration(input);
  return `categories-${configuration.enabledCategoryIds.join('_')}--default-${configuration.defaultCategoryId}`;
}

export function createCategorySidebarConfigurationSelection(
  input: { enabledCategoryIds: readonly string[]; defaultCategoryId: string }
): CategorySidebarConfigurationSelection {
  const configuration = normalizeCategorySidebarConfiguration(input);
  return {
    capabilityId: categorySubsetCapabilityId,
    sourceBranch: 'branch-a',
    route: catalogueRoute,
    pageId: cataloguePageId,
    identity: categorySidebarConfigurationIdentity(configuration),
    configuration
  };
}

export const completeCategorySidebarConfiguration = normalizeCategorySidebarConfiguration({
  enabledCategoryIds: categorySidebarRepositoryMetadata.categories.map(category => category.id),
  defaultCategoryId: 'all'
});

export function configuredCategoryPreviewContext(
  temporaryContext: PreviewContext,
  configurationInput: CategorySidebarConfiguration
): { context: PreviewContext; notices: PreviewContextNotice[] } {
  const configuration = normalizeCategorySidebarConfiguration(configurationInput);
  if (configuration.enabledCategoryIds.includes(temporaryContext.catalogue.categoryId)) {
    return { context: temporaryContext, notices: [] };
  }
  const requested = categorySidebarRepositoryMetadata.categories.find(
    category => category.id === temporaryContext.catalogue.categoryId
  )?.label ?? temporaryContext.catalogue.categoryId;
  const fallback = categorySidebarRepositoryMetadata.categories.find(
    category => category.id === configuration.defaultCategoryId
  )?.label ?? configuration.defaultCategoryId;
  return {
    context: {
      ...temporaryContext,
      catalogue: {
        ...temporaryContext.catalogue,
        categoryId: configuration.defaultCategoryId,
        selectedProductId: null,
        quickViewOpen: false
      }
    },
    notices: [{
      code: 'unsupported-category',
      message: `${requested} is not included in this result. Showing the default category, ${fallback}.`
    }]
  };
}

export function categoryLabels(ids: readonly CatalogueCategoryId[]) {
  const labels = new Map(categorySidebarRepositoryMetadata.categories.map(item => [item.id, item.label]));
  return ids.map(id => labels.get(id) ?? id);
}

export function categorySidebarSourceValue(configurationInput: CategorySidebarConfiguration) {
  const configuration = normalizeCategorySidebarConfiguration(configurationInput);
  return {
    enabledCategoryIds: [...configuration.enabledCategoryIds],
    defaultCategoryId: configuration.defaultCategoryId
  };
}

export function categorySidebarCandidateSourceConfiguration(input: {
  sliceId: string;
  sidebarSelected: boolean;
  selection: CategorySidebarConfigurationSelection | null | undefined;
  expectedSourceContentHash?: string;
}): CandidateSourceConfiguration {
  if (!input.sidebarSelected) {
    refuse(
      'Add the Category sidebar before generating its customization.',
      'The category configuration has no selected parent feature slice.'
    );
  }
  if (!input.selection) {
    refuse(
      'Apply a valid Category sidebar customization before generating it.',
      'The permanent category configuration is missing.'
    );
  }
  return {
    sliceId: input.sliceId,
    ...categorySidebarRepositoryMetadata.source,
    value: categorySidebarSourceValue(input.selection.configuration),
    ...(input.expectedSourceContentHash
      ? { expectedSourceContentHash: input.expectedSourceContentHash }
      : {})
  };
}
