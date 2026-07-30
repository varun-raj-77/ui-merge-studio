type StudioModeMessage = {
  type: 'ums-showcase-mode';
  mode: 'play' | 'select';
  showChanges: boolean;
  selectedScopes: string[];
};

const selector = '[data-ums-scope]';
const nativeSemantics = new WeakMap<HTMLElement, {
  tabIndex: string | null;
  role: string | null;
  ariaLabel: string | null;
}>();
let mode: StudioModeMessage['mode'] = 'play';
let showChanges = false;
let selectedScopes = new Set<string>();

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

addEventListener('message', event => {
  if (event.origin !== location.origin || event.data?.type !== 'ums-showcase-mode') return;
  const message = event.data as StudioModeMessage;
  mode = message.mode;
  showChanges = message.showChanges;
  selectedScopes = new Set(message.selectedScopes);
  applyState();
});

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
new MutationObserver(applyState).observe(document.body, { childList: true, subtree: true });
parent.postMessage({ type: 'ums-showcase-ready' }, location.origin);
