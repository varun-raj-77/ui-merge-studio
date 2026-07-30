import { useSyncExternalStore } from 'react';
import type { Product, ProductCategory } from '../types/product';

export type CatalogueCategoryId = 'all' | 'audio' | 'desk' | 'travel';

export interface PreviewContext {
  route: string;
  viewport: { width: number; height: number };
  scroll: { xRatio: number; yRatio: number };
  catalogue: {
    categoryId: CatalogueCategoryId;
    searchQuery: string;
    sortId: string;
    selectedProductId: string | null;
    quickViewOpen: boolean;
  };
}

export interface PreviewCapabilities {
  route: boolean;
  viewport: boolean;
  scroll: boolean;
  catalogue: {
    category: boolean;
    search: boolean;
    sort: boolean;
    selectedProduct: boolean;
    quickView: boolean;
    categoryIds: CatalogueCategoryId[];
    productIds: string[];
    quickViewProductIds: string[];
  };
}

export interface PreviewContextNotice {
  code: 'unsupported-category' | 'unsupported-product' | 'unsupported-quick-view' | 'unsupported-route';
  message: string;
}

export type PreviewContextField =
  | 'route'
  | 'viewport'
  | 'scroll'
  | 'catalogue.category'
  | 'catalogue.search'
  | 'catalogue.sort'
  | 'catalogue.selectedProduct'
  | 'catalogue.quickView';

const categoryIds: CatalogueCategoryId[] = ['all', 'audio', 'desk', 'travel'];
const categoryById: Record<CatalogueCategoryId, 'All' | ProductCategory> = {
  all: 'All',
  audio: 'Audio',
  desk: 'Desk',
  travel: 'Travel'
};
const categoryIdByLabel = Object.fromEntries(
  Object.entries(categoryById).map(([id, label]) => [label, id])
) as Record<'All' | ProductCategory, CatalogueCategoryId>;

let productIds = new Set<string>();
let productCategoryById = new Map<string, CatalogueCategoryId>();
let quickViewProductIds = new Set<string>();
let revision = 0;
let context: PreviewContext = {
  route: '/catalogue',
  viewport: { width: 1280, height: 720 },
  scroll: { xRatio: 0, yRatio: 0 },
  catalogue: {
    categoryId: 'all',
    searchQuery: '',
    sortId: 'featured',
    selectedProductId: null,
    quickViewOpen: false
  }
};

const subscribers = new Set<() => void>();
const intentionalSubscribers = new Set<(
  value: PreviewContext,
  nextRevision: number,
  fields: PreviewContextField[]
) => void>();
const capabilitySubscribers = new Set<() => void>();

function sameContext(left: PreviewContext, right: PreviewContext) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function commit(next: PreviewContext, intentionalFields: PreviewContextField[] | null) {
  if (sameContext(context, next)) return;
  context = next;
  revision += 1;
  subscribers.forEach(listener => listener());
  if (intentionalFields) {
    intentionalSubscribers.forEach(listener => listener(context, revision, intentionalFields));
  }
}

export function registerCatalogueProducts(products: Product[]) {
  productIds = new Set(products.map(product => String(product.id)));
  productCategoryById = new Map(products.map(product => [
    String(product.id),
    categoryIdByLabel[product.category]
  ]));
  capabilitySubscribers.forEach(listener => listener());
}

export function registerQuickViewTargets(ids: readonly string[]) {
  const next = new Set(ids.map(String));
  if (next.size === quickViewProductIds.size
    && [...next].every(id => quickViewProductIds.has(id))) return;
  quickViewProductIds = next;
  capabilitySubscribers.forEach(listener => listener());
}

export function getPreviewContext() {
  return context;
}

export function getPreviewRevision() {
  return revision;
}

export function getPreviewCapabilities(): PreviewCapabilities {
  return {
    route: true,
    viewport: true,
    scroll: true,
    catalogue: {
      category: true,
      search: false,
      sort: false,
      selectedProduct: true,
      quickView: quickViewProductIds.size > 0,
      categoryIds: [...categoryIds],
      productIds: [...productIds],
      quickViewProductIds: [...quickViewProductIds]
    }
  };
}

export function subscribePreviewContext(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function subscribeIntentionalPreviewContext(
  listener: (value: PreviewContext, nextRevision: number, fields: PreviewContextField[]) => void
) {
  intentionalSubscribers.add(listener);
  return () => intentionalSubscribers.delete(listener);
}

export function subscribePreviewCapabilities(listener: () => void) {
  capabilitySubscribers.add(listener);
  return () => capabilitySubscribers.delete(listener);
}

export function useCataloguePreviewContext() {
  return useSyncExternalStore(subscribePreviewContext, getPreviewContext, getPreviewContext);
}

export function categoryLabel(id: CatalogueCategoryId) {
  return categoryById[id];
}

export function categoryId(label: 'All' | ProductCategory) {
  return categoryIdByLabel[label];
}

export function setPreviewCategoryFromUser(id: CatalogueCategoryId) {
  const selectedProductId = context.catalogue.selectedProductId;
  const productMatches = !selectedProductId
    || id === 'all'
    || productCategoryById.get(selectedProductId) === id;
  commit({
    ...context,
    catalogue: {
      ...context.catalogue,
      categoryId: id,
      selectedProductId: productMatches ? selectedProductId : null,
      quickViewOpen: productMatches ? context.catalogue.quickViewOpen : false
    }
  }, ['catalogue.category', 'catalogue.selectedProduct', 'catalogue.quickView']);
}

export function openPreviewProductFromUser(product: Product) {
  commit({
    ...context,
    catalogue: {
      ...context.catalogue,
      selectedProductId: String(product.id),
      quickViewOpen: true
    }
  }, ['catalogue.selectedProduct', 'catalogue.quickView']);
}

export function closePreviewProductFromUser() {
  commit({
    ...context,
    catalogue: { ...context.catalogue, quickViewOpen: false }
  }, ['catalogue.quickView']);
}

export function setPreviewScrollFromUser(xRatio: number, yRatio: number) {
  const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  commit({
    ...context,
    scroll: { xRatio: clamp(xRatio), yRatio: clamp(yRatio) }
  }, ['scroll']);
}

export function applyPreviewContext(requested: PreviewContext) {
  const notices: PreviewContextNotice[] = [];
  const route = requested.route === '/catalogue' ? requested.route : '/catalogue';
  if (route !== requested.route) {
    notices.push({
      code: 'unsupported-route',
      message: `${requested.route} is not available in this version. Showing the catalogue.`
    });
  }

  const category = categoryIds.includes(requested.catalogue.categoryId)
    ? requested.catalogue.categoryId
    : 'all';
  if (category !== requested.catalogue.categoryId) {
    notices.push({
      code: 'unsupported-category',
      message: `${requested.catalogue.categoryId} is not available in this version. Showing All products.`
    });
  }

  let selectedProductId = requested.catalogue.selectedProductId;
  if (selectedProductId && !productIds.has(selectedProductId)) {
    notices.push({
      code: 'unsupported-product',
      message: 'The previously selected product is unavailable in this version.'
    });
    selectedProductId = null;
  }

  let quickViewOpen = requested.catalogue.quickViewOpen;
  if (quickViewOpen && selectedProductId && !quickViewProductIds.has(selectedProductId)) {
    const productLabel = selectedProductId === 'p-105' ? 'Desk Stand'
      : selectedProductId === 'p-104' ? 'Carry Case'
        : selectedProductId === 'p-103' ? 'Task Lamp'
          : selectedProductId === 'p-102' ? 'Studio Speaker'
            : selectedProductId === 'p-101' ? 'Arc Headphones'
              : selectedProductId;
    notices.push({
      code: 'unsupported-quick-view',
      message: `Quick View is not available for ${productLabel} in this candidate. The product list remains selected.`
    });
    quickViewOpen = false;
  }

  const next: PreviewContext = {
    route,
    viewport: {
      width: Math.max(1, Math.round(requested.viewport.width)),
      height: Math.max(1, Math.round(requested.viewport.height))
    },
    scroll: {
      xRatio: Math.max(0, Math.min(1, requested.scroll.xRatio)),
      yRatio: Math.max(0, Math.min(1, requested.scroll.yRatio))
    },
    catalogue: {
      categoryId: category,
      searchQuery: '',
      sortId: 'featured',
      selectedProductId,
      quickViewOpen
    }
  };
  commit(next, null);
  return { context: next, notices };
}

export function resetPreviewContextForTests() {
  productIds = new Set();
  productCategoryById = new Map();
  quickViewProductIds = new Set();
  revision = 0;
  context = {
    route: '/catalogue',
    viewport: { width: 1280, height: 720 },
    scroll: { xRatio: 0, yRatio: 0 },
    catalogue: {
      categoryId: 'all',
      searchQuery: '',
      sortId: 'featured',
      selectedProductId: null,
      quickViewOpen: false
    }
  };
  subscribers.forEach(listener => listener());
}
