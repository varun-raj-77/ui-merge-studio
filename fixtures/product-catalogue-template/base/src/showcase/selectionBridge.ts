import {
  applyPreviewContext,
  getPreviewCapabilities,
  getPreviewContext,
  getPreviewRevision,
  registerQuickViewTargets,
  setPreviewScrollFromUser,
  subscribeIntentionalPreviewContext,
  subscribePreviewCapabilities,
  type PreviewContext
} from '../state/previewContext';

type StudioModeMessage = {
  type: 'ums-showcase-mode';
  mode: 'play' | 'select';
  showChanges: boolean;
  selectedScopes: string[];
};

type ApplyPreviewContextMessage = {
  type: 'ums-preview-context-apply';
  protocol: 1;
  previewId: string;
  operationId: string;
  sequence: number;
  context: PreviewContext;
};

const selector = '[data-ums-scope]';
const previewId = new URLSearchParams(location.search).get('ums-preview') ?? 'unregistered';
const nativeSemantics = new WeakMap<HTMLElement, {
  tabIndex: string | null;
  role: string | null;
  ariaLabel: string | null;
}>();
let mode: StudioModeMessage['mode'] = 'play';
let showChanges = false;
let selectedScopes = new Set<string>();
let latestApplySequence = 0;
let applyingScroll = false;
let scrollTimer = 0;

function scopeElement(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>(selector) : null;
}

function announce(type: 'hover' | 'toggle', element: HTMLElement | null) {
  if (!element) return;
  parent.postMessage({
    type: `ums-showcase-scope-${type}`,
    scope: element.dataset.umsScope,
    label: element.dataset.umsLabel
  }, location.origin);
}

function sendContext(type: string, payload: Record<string, unknown>) {
  parent.postMessage({
    type,
    protocol: 1,
    previewId,
    ...payload
  }, location.origin);
}

function contextReady() {
  sendContext('ums-preview-context-ready', {
    revision: getPreviewRevision(),
    capabilities: getPreviewCapabilities(),
    context: getPreviewContext()
  });
}

function isPreviewContext(value: unknown): value is PreviewContext {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PreviewContext>;
  return typeof item.route === 'string'
    && Boolean(item.viewport)
    && typeof item.viewport?.width === 'number'
    && typeof item.viewport?.height === 'number'
    && Boolean(item.scroll)
    && typeof item.scroll?.xRatio === 'number'
    && typeof item.scroll?.yRatio === 'number'
    && Boolean(item.catalogue)
    && typeof item.catalogue?.categoryId === 'string'
    && typeof item.catalogue?.searchQuery === 'string'
    && typeof item.catalogue?.sortId === 'string'
    && (item.catalogue?.selectedProductId === null || typeof item.catalogue?.selectedProductId === 'string')
    && typeof item.catalogue?.quickViewOpen === 'boolean';
}

function isApplyContextMessage(value: unknown): value is ApplyPreviewContextMessage {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ApplyPreviewContextMessage>;
  return item.type === 'ums-preview-context-apply'
    && item.protocol === 1
    && item.previewId === previewId
    && typeof item.operationId === 'string'
    && typeof item.sequence === 'number'
    && Number.isInteger(item.sequence)
    && item.sequence > 0
    && isPreviewContext(item.context);
}

function applyNormalizedScroll(context: PreviewContext) {
  applyingScroll = true;
  requestAnimationFrame(() => {
    const maxX = Math.max(0, document.documentElement.scrollWidth - innerWidth);
    const maxY = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    scrollTo({
      left: Math.round(context.scroll.xRatio * maxX),
      top: Math.round(context.scroll.yRatio * maxY),
      behavior: 'auto'
    });
    requestAnimationFrame(() => {
      applyingScroll = false;
    });
  });
}

function applyState() {
  document.body.dataset.umsMode = mode;
  document.body.toggleAttribute('data-ums-show-changes', showChanges);
  document.querySelectorAll<HTMLElement>(selector).forEach(element => {
    if (!nativeSemantics.has(element)) {
      nativeSemantics.set(element, {
        tabIndex: element.getAttribute('tabindex'),
        role: element.getAttribute('role'),
        ariaLabel: element.getAttribute('aria-label')
      });
    }
    const selected = selectedScopes.has(element.dataset.umsScope ?? '');
    element.toggleAttribute('data-ums-selected', selected);
    if (mode === 'select') {
      element.tabIndex = 0;
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', `${selected ? 'Deselect' : 'Select'} ${element.dataset.umsLabel}`);
    } else {
      const native = nativeSemantics.get(element)!;
      for (const [name, value] of [
        ['tabindex', native.tabIndex],
        ['role', native.role],
        ['aria-label', native.ariaLabel]
      ] as const) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    }
  });
}

function refreshRuntimeCapabilities() {
  registerQuickViewTargets(
    [...document.querySelectorAll<HTMLElement>('[data-ums-scope^="product-quick-view:"]')]
      .map(element => element.dataset.umsScope?.split(':')[1])
      .filter((id): id is string => Boolean(id))
  );
}

addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin) return;
  if (event.data?.type === 'ums-showcase-mode') {
    const message = event.data as StudioModeMessage;
    mode = message.mode;
    showChanges = message.showChanges;
    selectedScopes = new Set(message.selectedScopes);
    applyState();
    return;
  }
  if (!isApplyContextMessage(event.data) || event.data.sequence <= latestApplySequence) return;
  latestApplySequence = event.data.sequence;
  const result = applyPreviewContext(event.data.context);
  applyNormalizedScroll(result.context);
  sendContext('ums-preview-context-applied', {
    operationId: event.data.operationId,
    sequence: event.data.sequence,
    context: result.context,
    notices: result.notices
  });
});

subscribeIntentionalPreviewContext((context, revision, fields) => {
  sendContext('ums-preview-context-changed', {
    revision,
    intent: 'user',
    fields,
    context
  });
});
subscribePreviewCapabilities(contextReady);

addEventListener('scroll', () => {
  if (applyingScroll) return;
  clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(() => {
    const maxX = Math.max(0, document.documentElement.scrollWidth - innerWidth);
    const maxY = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    setPreviewScrollFromUser(
      maxX > 0 ? scrollX / maxX : 0,
      maxY > 0 ? scrollY / maxY : 0
    );
  }, 80);
}, { passive: true });

document.addEventListener('pointerover', event => {
  if (mode === 'select') announce('hover', scopeElement(event.target));
});
document.addEventListener('focusin', event => {
  if (mode === 'select') announce('hover', scopeElement(event.target));
});
document.addEventListener('click', event => {
  if (mode !== 'select') return;
  const element = scopeElement(event.target);
  if (!element) return;
  event.preventDefault();
  event.stopPropagation();
  announce('toggle', element);
}, true);
document.addEventListener('keydown', event => {
  if (mode !== 'select' || (event.key !== 'Enter' && event.key !== ' ')) return;
  const element = scopeElement(event.target);
  if (!element) return;
  event.preventDefault();
  event.stopPropagation();
  announce('toggle', element);
}, true);

applyState();
new MutationObserver(() => {
  refreshRuntimeCapabilities();
  applyState();
}).observe(document.body, { childList: true, subtree: true });
refreshRuntimeCapabilities();
parent.postMessage({ type: 'ums-showcase-ready' }, location.origin);
contextReady();
