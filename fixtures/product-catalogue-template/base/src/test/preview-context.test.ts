import { beforeEach, expect, test, vi } from 'vitest';
import { products } from '../fixtures/products';
import {
  applyPreviewContext,
  getPreviewCapabilities,
  getPreviewContext,
  registerCatalogueProducts,
  registerQuickViewTargets,
  resetPreviewContextForTests,
  setPreviewCategoryFromUser,
  subscribePreviewCapabilities,
  subscribeIntentionalPreviewContext
} from '../state/previewContext';

beforeEach(() => {
  resetPreviewContextForTests();
  registerCatalogueProducts(products);
});

test('reports explicit fixture capabilities without inventing search or sort controls', () => {
  expect(getPreviewCapabilities()).toMatchObject({
    route: true,
    viewport: true,
    scroll: true,
    catalogue: {
      category: true,
      search: false,
      sort: false,
      selectedProduct: true,
      quickView: false
    }
  });
});

test('intentional category changes publish once while Studio-applied changes do not echo', () => {
  const intentional = vi.fn();
  const unsubscribe = subscribeIntentionalPreviewContext(intentional);
  setPreviewCategoryFromUser('desk');
  expect(intentional).toHaveBeenCalledOnce();

  applyPreviewContext({
    ...getPreviewContext(),
    catalogue: { ...getPreviewContext().catalogue, categoryId: 'audio' }
  });
  expect(intentional).toHaveBeenCalledOnce();
  expect(getPreviewContext().catalogue.categoryId).toBe('audio');
  unsubscribe();
});

test('unsupported Quick View closes deterministically while selected product remains', () => {
  const selectedProductId = String(products.find(product => product.category === 'Desk')!.id);
  const otherProductId = String(products.find(product => String(product.id) !== selectedProductId)!.id);
  registerQuickViewTargets([otherProductId]);
  const result = applyPreviewContext({
    ...getPreviewContext(),
    catalogue: {
      ...getPreviewContext().catalogue,
      categoryId: 'desk',
      selectedProductId,
      quickViewOpen: true
    }
  });
  expect(result.context.catalogue).toMatchObject({
    categoryId: 'desk',
    selectedProductId,
    quickViewOpen: false
  });
  expect(result.notices[0]).toMatchObject({ code: 'unsupported-quick-view' });
  expect(result.notices[0].message).toContain('The product list remains selected.');
});

test('re-registering identical runtime Quick View targets does not republish capabilities', () => {
  const listener = vi.fn();
  const unsubscribe = subscribePreviewCapabilities(listener);
  registerQuickViewTargets(['p-105']);
  registerQuickViewTargets(['p-105']);
  expect(listener).toHaveBeenCalledOnce();
  unsubscribe();
});

test('unavailable product fallback preserves other compatible context', () => {
  const result = applyPreviewContext({
    ...getPreviewContext(),
    catalogue: {
      ...getPreviewContext().catalogue,
      categoryId: 'travel',
      selectedProductId: 'missing',
      quickViewOpen: true
    }
  });
  expect(result.context.catalogue.categoryId).toBe('travel');
  expect(result.context.catalogue.selectedProductId).toBeNull();
  expect(result.notices[0].message).toBe('The previously selected product is unavailable in this version.');
});
