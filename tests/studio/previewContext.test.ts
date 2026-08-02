import { describe, expect, it } from 'vitest';
import {
  acceptIntentionalContext,
  clampScrollRatio,
  createApplyPreviewContextCommand,
  defaultPreviewContext,
  negotiatePreviewContext,
  parsePreviewContextMessage,
  type PreviewCapabilities,
  type PreviewContext
} from '../../apps/studio/src/previewContext';
import {
  candidateKey,
  emptyShowcaseSelection,
  showcaseSelectionReducer
} from '../../apps/studio/src/showcaseSelection';

const capabilities: PreviewCapabilities = {
  route: true,
  viewport: true,
  scroll: true,
  catalogue: {
    category: true,
    search: false,
    sort: false,
    selectedProduct: true,
    quickView: true,
    categoryIds: ['all', 'audio', 'desk', 'travel'],
    productIds: ['p-101', 'p-103', 'p-105'],
    quickViewProductIds: ['p-103', 'p-105']
  }
};

function withContext(update: Partial<PreviewContext['catalogue']>): PreviewContext {
  return {
    ...defaultPreviewContext,
    catalogue: { ...defaultPreviewContext.catalogue, ...update }
  };
}

describe('shared preview context protocol', () => {
  it('starts with an explicit serializable default separate from source selections', () => {
    expect(JSON.parse(JSON.stringify(defaultPreviewContext))).toEqual(defaultPreviewContext);
    expect(defaultPreviewContext.catalogue.categoryId).toBe('all');
    expect(candidateKey(emptyShowcaseSelection)).toBe('sidebar-0--quick-none');
  });

  it('accepts a category update from Version A', () => {
    const desk = withContext({ categoryId: 'desk' });
    expect(acceptIntentionalContext(defaultPreviewContext, desk, 1, -1)).toEqual({
      context: desk,
      acceptedRevision: 1,
      accepted: true
    });
  });

  it('lets the latest intentional Version B interaction win', () => {
    const desk = withContext({ categoryId: 'desk' });
    const audio = withContext({ categoryId: 'audio' });
    const first = acceptIntentionalContext(defaultPreviewContext, desk, 1, -1);
    const second = acceptIntentionalContext(first.context, audio, 2, first.acceptedRevision);
    expect(second.context.catalogue.categoryId).toBe('audio');
  });

  it('rejects duplicate and stale revisions', () => {
    const desk = withContext({ categoryId: 'desk' });
    expect(acceptIntentionalContext(defaultPreviewContext, desk, 3, 3).accepted).toBe(false);
    expect(acceptIntentionalContext(defaultPreviewContext, desk, 2, 3).accepted).toBe(false);
  });

  it('creates sequenced commands and rejects malformed preview messages', () => {
    const command = createApplyPreviewContextCommand('branch-a', defaultPreviewContext, 4);
    expect(command.operationId).toBe('branch-a:4');
    expect(parsePreviewContextMessage({
      type: 'ums-preview-context-changed',
      protocol: 1,
      previewId: 'branch-a',
      revision: 2,
      intent: 'user',
      fields: ['catalogue.category'],
      context: defaultPreviewContext
    }, 'branch-a')?.type).toBe('ums-preview-context-changed');
    expect(parsePreviewContextMessage({ ...command, type: 'unknown' }, 'branch-a')).toBeNull();
    expect(parsePreviewContextMessage({
      type: 'ums-preview-context-changed',
      protocol: 1,
      previewId: 'branch-b',
      revision: 2,
      intent: 'user',
      fields: ['catalogue.category'],
      context: defaultPreviewContext
    }, 'branch-a')).toBeNull();
  });

  it('negotiates category, product, Quick View, route, viewport, and scroll capabilities', () => {
    const result = negotiatePreviewContext(withContext({
      categoryId: 'desk',
      selectedProductId: 'p-103',
      quickViewOpen: true,
      searchQuery: 'lamp',
      sortId: 'price'
    }), capabilities, { 'p-103': 'Task Lamp' });
    expect(result.context.catalogue).toEqual({
      categoryId: 'desk',
      searchQuery: '',
      sortId: 'featured',
      selectedProductId: 'p-103',
      quickViewOpen: true
    });
    expect(result.notices).toEqual([]);
  });

  it('falls back from an unsupported category with an explicit explanation', () => {
    const result = negotiatePreviewContext(
      withContext({ categoryId: 'desk' }),
      {
        ...capabilities,
        catalogue: { ...capabilities.catalogue, categoryIds: ['all', 'audio'] }
      }
    );
    expect(result.context.catalogue.categoryId).toBe('all');
    expect(result.notices[0].message).toBe('Desk is not available in this version. Showing All products.');
  });

  it('falls back from an unavailable product without discarding compatible category context', () => {
    const result = negotiatePreviewContext(
      withContext({ categoryId: 'desk', selectedProductId: 'p-999', quickViewOpen: true }),
      capabilities
    );
    expect(result.context.catalogue.categoryId).toBe('desk');
    expect(result.context.catalogue.selectedProductId).toBeNull();
    expect(result.notices[0].message).toBe('The previously selected product is unavailable in this version.');
  });

  it('closes unsupported Quick View while retaining the selected product', () => {
    const result = negotiatePreviewContext(
      withContext({ categoryId: 'desk', selectedProductId: 'p-103', quickViewOpen: true }),
      {
        ...capabilities,
        catalogue: { ...capabilities.catalogue, quickViewProductIds: ['p-105'] }
      },
      { 'p-103': 'Task Lamp' }
    );
    expect(result.context.catalogue.selectedProductId).toBe('p-103');
    expect(result.context.catalogue.quickViewOpen).toBe(false);
    expect(result.notices[0].message).toBe(
      'Quick View is not available for Task Lamp in this candidate. The product list remains selected.'
    );
  });

  it('keeps viewport values aligned and clamps normalized scroll', () => {
    const requested = {
      ...defaultPreviewContext,
      viewport: { width: 390, height: 844 },
      scroll: { xRatio: 2, yRatio: -1 }
    };
    const result = negotiatePreviewContext(requested as PreviewContext, capabilities);
    expect(result.context.viewport).toEqual({ width: 390, height: 844 });
    expect(result.context.scroll).toEqual({ xRatio: 1, yRatio: 0 });
    expect(clampScrollRatio(Number.NaN)).toBe(0);
  });

  it('does not alter candidate keys or integration selections when only context changes', () => {
    const selected = showcaseSelectionReducer(emptyShowcaseSelection, {
      type: 'toggle-scope',
      scope: {
        kind: 'feature',
        featureId: 'category-sidebar',
        branch: 'branch-a',
        capabilityId: 'category-sidebar',
        route: '/catalogue',
        pageId: 'product-catalogue'
      }
    });
    const before = candidateKey(selected);
    const context = withContext({ categoryId: 'desk', selectedProductId: 'p-105' });
    expect(context.catalogue.categoryId).toBe('desk');
    expect(candidateKey(selected)).toBe(before);
    expect(selected.selections).toHaveLength(1);
  });

  it('does not let a scroll intent overwrite unsupported catalogue state', () => {
    const current = withContext({
      categoryId: 'desk',
      selectedProductId: 'p-105',
      quickViewOpen: true
    });
    const destinationSnapshot = {
      ...defaultPreviewContext,
      scroll: { xRatio: 0, yRatio: 0.5 },
      catalogue: {
        ...current.catalogue,
        selectedProductId: 'p-105',
        quickViewOpen: false
      }
    };
    const result = acceptIntentionalContext(current, destinationSnapshot, 4, 3, ['scroll']);
    expect(result.context.scroll.yRatio).toBe(0.5);
    expect(result.context.catalogue.quickViewOpen).toBe(true);
  });
});
