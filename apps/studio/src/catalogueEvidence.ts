export type CatalogueFeatureId = 'category-sidebar' | 'promotional-banner' | 'quick-view' | 'newest-first';
export type CatalogueBranch = 'Branch A' | 'Branch B';

export interface CatalogueFeatureEvidence {
  id: CatalogueFeatureId;
  name: string;
  branch: CatalogueBranch;
  declaration: string;
  sourceFile: string;
  dependencies: { path: string; reason: string }[];
  inclusionReason: string;
  siblingExclusion: string;
  compatibility: 'recorded-safe' | 'recorded-incompatible' | 'unrecorded';
}

export const catalogueEvidence: Record<CatalogueFeatureId, CatalogueFeatureEvidence> = {
  'category-sidebar': {
    id: 'category-sidebar',
    name: 'Collapsible category sidebar',
    branch: 'Branch A',
    declaration: 'CategorySidebar',
    sourceFile: 'src/features/catalogue/CategorySidebar.tsx',
    dependencies: [
      { path: 'src/hooks/useCategoryFilter.ts', reason: 'Owns collapse and category-filter state.' },
      { path: 'src/types/catalogue.ts', reason: 'Defines the shared category contract.' },
      { path: 'src/styles/category-sidebar.css', reason: 'Styles the selected sidebar surface and controls.' },
      { path: 'src/test/category-sidebar.test.tsx', reason: 'Verifies collapse, expansion, and filtering.' }
    ],
    inclusionReason: 'Selected from the rendered Branch A sidebar boundary.',
    siblingExclusion: 'Promotional banner',
    compatibility: 'recorded-safe'
  },
  'promotional-banner': {
    id: 'promotional-banner',
    name: 'Promotional banner',
    branch: 'Branch A',
    declaration: 'PromotionalBanner',
    sourceFile: 'src/features/catalogue/PromotionalBanner.tsx',
    dependencies: [
      { path: 'src/types/catalogue.ts', reason: 'Migrates Product.id from string to number for promotion targeting.' },
      { path: 'src/styles/promotion.css', reason: 'Styles the promotional surface.' }
    ],
    inclusionReason: 'Selected from the rendered Branch A promotional boundary.',
    siblingExclusion: 'Collapsible category sidebar',
    compatibility: 'recorded-incompatible'
  },
  'quick-view': {
    id: 'quick-view',
    name: 'Product quick-view inspector',
    branch: 'Branch B',
    declaration: 'ProductQuickView',
    sourceFile: 'src/features/catalogue/ProductQuickView.tsx',
    dependencies: [
      { path: 'src/hooks/useSelectedProduct.ts', reason: 'Owns selected-product and close behavior.' },
      { path: 'src/types/catalogue.ts', reason: 'Uses the original string Product.id contract.' },
      { path: 'src/styles/quick-view.css', reason: 'Styles the inspector and focus treatment.' },
      { path: 'src/test/quick-view.test.tsx', reason: 'Verifies open, close, Escape, and focus return.' }
    ],
    inclusionReason: 'Selected from linked rendered card-trigger and inspector regions.',
    siblingExclusion: 'Newest-first sorting',
    compatibility: 'recorded-safe'
  },
  'newest-first': {
    id: 'newest-first',
    name: 'Newest-first sorting',
    branch: 'Branch B',
    declaration: 'sortProductsNewestFirst',
    sourceFile: 'src/utils/sortProducts.ts',
    dependencies: [
      { path: 'src/features/catalogue/ProductGrid.tsx', reason: 'Consumes the selected sort function.' },
      { path: 'src/test/product-sorting.test.tsx', reason: 'Verifies visible product order.' }
    ],
    inclusionReason: 'Selected from the rendered Branch B sorting boundary.',
    siblingExclusion: 'Product quick-view inspector',
    compatibility: 'unrecorded'
  }
};

export const recordedSafePair: CatalogueFeatureId[] = ['category-sidebar', 'quick-view'];

export function combinationOutcome(selected: CatalogueFeatureId[]) {
  const ids = new Set(selected);
  if (ids.has('promotional-banner') && ids.has('quick-view')) return 'incompatible' as const;
  if (selected.length === 2 && recordedSafePair.every(id => ids.has(id))) return 'recorded-safe' as const;
  return 'unrecorded' as const;
}
