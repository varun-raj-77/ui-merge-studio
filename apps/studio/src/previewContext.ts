export type CatalogueCategoryId = 'all' | 'audio' | 'desk' | 'travel';

export interface PreviewContext {
  route: string;
  viewport: {
    width: number;
    height: number;
  };
  scroll: {
    xRatio: number;
    yRatio: number;
  };
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

export type PreviewContextNoticeCode =
  | 'unsupported-category'
  | 'unsupported-product'
  | 'unsupported-quick-view'
  | 'unsupported-route';

export interface PreviewContextNotice {
  code: PreviewContextNoticeCode;
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

export const previewContextProtocol = 1 as const;

export type PreviewContextMessage =
  | {
      type: 'ums-preview-context-ready';
      protocol: 1;
      previewId: string;
      revision: number;
      capabilities: PreviewCapabilities;
      context: PreviewContext;
    }
  | {
      type: 'ums-preview-context-changed';
      protocol: 1;
      previewId: string;
      revision: number;
      intent: 'user';
      fields: PreviewContextField[];
      context: PreviewContext;
    }
  | {
      type: 'ums-preview-context-applied';
      protocol: 1;
      previewId: string;
      operationId: string;
      sequence: number;
      context: PreviewContext;
      notices: PreviewContextNotice[];
    };

export interface ApplyPreviewContextCommand {
  type: 'ums-preview-context-apply';
  protocol: 1;
  previewId: string;
  operationId: string;
  sequence: number;
  context: PreviewContext;
}

export const defaultPreviewContext: PreviewContext = {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isCategoryId(value: unknown): value is CatalogueCategoryId {
  return value === 'all' || value === 'audio' || value === 'desk' || value === 'travel';
}

export function isPreviewContext(value: unknown): value is PreviewContext {
  if (!isRecord(value) || typeof value.route !== 'string' || !isRecord(value.viewport)
    || !isRecord(value.scroll) || !isRecord(value.catalogue)) return false;
  return isFiniteNumber(value.viewport.width)
    && value.viewport.width > 0
    && isFiniteNumber(value.viewport.height)
    && value.viewport.height > 0
    && isFiniteNumber(value.scroll.xRatio)
    && value.scroll.xRatio >= 0
    && value.scroll.xRatio <= 1
    && isFiniteNumber(value.scroll.yRatio)
    && value.scroll.yRatio >= 0
    && value.scroll.yRatio <= 1
    && isCategoryId(value.catalogue.categoryId)
    && typeof value.catalogue.searchQuery === 'string'
    && typeof value.catalogue.sortId === 'string'
    && (value.catalogue.selectedProductId === null || typeof value.catalogue.selectedProductId === 'string')
    && typeof value.catalogue.quickViewOpen === 'boolean';
}

export function isPreviewCapabilities(value: unknown): value is PreviewCapabilities {
  if (!isRecord(value) || typeof value.route !== 'boolean' || typeof value.viewport !== 'boolean'
    || typeof value.scroll !== 'boolean' || !isRecord(value.catalogue)) return false;
  const catalogue = value.catalogue;
  return typeof catalogue.category === 'boolean'
    && typeof catalogue.search === 'boolean'
    && typeof catalogue.sort === 'boolean'
    && typeof catalogue.selectedProduct === 'boolean'
    && typeof catalogue.quickView === 'boolean'
    && Array.isArray(catalogue.categoryIds)
    && catalogue.categoryIds.every(isCategoryId)
    && Array.isArray(catalogue.productIds)
    && catalogue.productIds.every(item => typeof item === 'string')
    && Array.isArray(catalogue.quickViewProductIds)
    && catalogue.quickViewProductIds.every(item => typeof item === 'string');
}

function isNotice(value: unknown): value is PreviewContextNotice {
  return isRecord(value)
    && (value.code === 'unsupported-category'
      || value.code === 'unsupported-product'
      || value.code === 'unsupported-quick-view'
      || value.code === 'unsupported-route')
    && typeof value.message === 'string';
}

function isContextField(value: unknown): value is PreviewContextField {
  return value === 'route'
    || value === 'viewport'
    || value === 'scroll'
    || value === 'catalogue.category'
    || value === 'catalogue.search'
    || value === 'catalogue.sort'
    || value === 'catalogue.selectedProduct'
    || value === 'catalogue.quickView';
}

export function parsePreviewContextMessage(value: unknown, expectedPreviewId: string): PreviewContextMessage | null {
  if (!isRecord(value) || value.protocol !== previewContextProtocol || value.previewId !== expectedPreviewId
    || typeof value.type !== 'string' || !Number.isInteger(value.revision ?? value.sequence)) return null;
  if (value.type === 'ums-preview-context-ready') {
    return isPreviewCapabilities(value.capabilities) && isPreviewContext(value.context)
      ? value as unknown as PreviewContextMessage
      : null;
  }
  if (value.type === 'ums-preview-context-changed') {
    return value.intent === 'user'
      && Array.isArray(value.fields)
      && value.fields.length > 0
      && value.fields.every(isContextField)
      && isPreviewContext(value.context)
      ? value as unknown as PreviewContextMessage
      : null;
  }
  if (value.type === 'ums-preview-context-applied') {
    return typeof value.operationId === 'string'
      && isPreviewContext(value.context)
      && Array.isArray(value.notices)
      && value.notices.every(isNotice)
      ? value as unknown as PreviewContextMessage
      : null;
  }
  return null;
}

export function createApplyPreviewContextCommand(
  previewId: string,
  context: PreviewContext,
  sequence: number
): ApplyPreviewContextCommand {
  if (!isPreviewContext(context) || !Number.isInteger(sequence) || sequence < 1) {
    throw new Error('A valid preview context and positive sequence are required.');
  }
  return {
    type: 'ums-preview-context-apply',
    protocol: previewContextProtocol,
    previewId,
    operationId: `${previewId}:${sequence}`,
    sequence,
    context
  };
}

export function acceptIntentionalContext(
  current: PreviewContext,
  incoming: PreviewContext,
  incomingRevision: number,
  lastAcceptedRevision: number,
  fields: PreviewContextField[] = [
    'route',
    'viewport',
    'scroll',
    'catalogue.category',
    'catalogue.search',
    'catalogue.sort',
    'catalogue.selectedProduct',
    'catalogue.quickView'
  ]
) {
  if (incomingRevision <= lastAcceptedRevision) {
    return { context: current, acceptedRevision: lastAcceptedRevision, accepted: false };
  }
  const next: PreviewContext = {
    route: fields.includes('route') ? incoming.route : current.route,
    viewport: fields.includes('viewport') ? incoming.viewport : current.viewport,
    scroll: fields.includes('scroll') ? incoming.scroll : current.scroll,
    catalogue: {
      categoryId: fields.includes('catalogue.category')
        ? incoming.catalogue.categoryId
        : current.catalogue.categoryId,
      searchQuery: fields.includes('catalogue.search')
        ? incoming.catalogue.searchQuery
        : current.catalogue.searchQuery,
      sortId: fields.includes('catalogue.sort')
        ? incoming.catalogue.sortId
        : current.catalogue.sortId,
      selectedProductId: fields.includes('catalogue.selectedProduct')
        ? incoming.catalogue.selectedProductId
        : current.catalogue.selectedProductId,
      quickViewOpen: fields.includes('catalogue.quickView')
        ? incoming.catalogue.quickViewOpen
        : current.catalogue.quickViewOpen
    }
  };
  return { context: next, acceptedRevision: incomingRevision, accepted: true };
}

export function clampScrollRatio(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function negotiatePreviewContext(
  requested: PreviewContext,
  capabilities: PreviewCapabilities,
  productNames: Record<string, string> = {}
) {
  const notices: PreviewContextNotice[] = [];
  const context: PreviewContext = {
    route: capabilities.route ? requested.route : defaultPreviewContext.route,
    viewport: capabilities.viewport ? requested.viewport : defaultPreviewContext.viewport,
    scroll: capabilities.scroll ? {
      xRatio: clampScrollRatio(requested.scroll.xRatio),
      yRatio: clampScrollRatio(requested.scroll.yRatio)
    } : defaultPreviewContext.scroll,
    catalogue: {
      categoryId: requested.catalogue.categoryId,
      searchQuery: capabilities.catalogue.search ? requested.catalogue.searchQuery : '',
      sortId: capabilities.catalogue.sort ? requested.catalogue.sortId : 'featured',
      selectedProductId: requested.catalogue.selectedProductId,
      quickViewOpen: requested.catalogue.quickViewOpen
    }
  };

  if (!capabilities.route && requested.route !== defaultPreviewContext.route) {
    notices.push({
      code: 'unsupported-route',
      message: `${requested.route} is not available in this version. Showing the catalogue.`
    });
  }
  if (!capabilities.catalogue.category
    || !capabilities.catalogue.categoryIds.includes(requested.catalogue.categoryId)) {
    context.catalogue.categoryId = 'all';
    notices.push({
      code: 'unsupported-category',
      message: `${requested.catalogue.categoryId === 'desk' ? 'Desk' : requested.catalogue.categoryId} is not available in this version. Showing All products.`
    });
  }
  const selectedProductId = context.catalogue.selectedProductId;
  if (selectedProductId && (!capabilities.catalogue.selectedProduct
    || !capabilities.catalogue.productIds.includes(selectedProductId))) {
    context.catalogue.selectedProductId = null;
    context.catalogue.quickViewOpen = false;
    notices.push({
      code: 'unsupported-product',
      message: 'The previously selected product is unavailable in this version.'
    });
  } else if (context.catalogue.quickViewOpen && selectedProductId
    && (!capabilities.catalogue.quickView
      || !capabilities.catalogue.quickViewProductIds.includes(selectedProductId))) {
    context.catalogue.quickViewOpen = false;
    notices.push({
      code: 'unsupported-quick-view',
      message: `Quick View is not available for ${productNames[selectedProductId] ?? selectedProductId} in this candidate. The product list remains selected.`
    });
  }

  return { context, notices };
}
