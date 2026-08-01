import { useEffect, useMemo, useReducer, useRef, useState, type RefObject } from 'react';
import type { PublicArtifact, PublicCandidate } from '../../../packages/showcase-evidence/src/schema';
import { catalogueManifest, evidenceForScope, recordedRefusal, resolveCatalogueCandidate } from './catalogueEvidence';
import { catalogueProduct } from './catalogueProducts';
import {
  catalogueCapabilityForScope,
  catalogueCapabilityFromRuntime,
  catalogueScopesForCapability,
  catalogueSelectionCapabilities,
  quickViewAllCapabilityId,
  type CatalogueSourceBranch
} from './catalogueSelectionCapabilities';
import {
  candidateKey,
  categorySidebarDecision,
  emptyShowcaseSelection,
  hasQuickViewSelection,
  scopeIdentityKey,
  scopeKey,
  showcaseSelectionReducer,
  type ShowcaseScope
} from './showcaseSelection';
import {
  selectionCapabilityCompatibility,
  type SelectionCapability
} from './selectionCapability';
import {
  initialSelectionHistory,
  selectionHistoryReducer,
  selectionHistoryShortcut
} from './selectionHistory';
import {
  acceptIntentionalContext,
  createApplyPreviewContextCommand,
  defaultPreviewContext,
  parsePreviewContextMessage,
  type PreviewCapabilities,
  type PreviewContext,
  type PreviewContextMessage,
  type PreviewContextNotice
} from './previewContext';
import {
  categoryLabels,
  categorySidebarRepositoryMetadata,
  completeCategorySidebarConfiguration,
  configuredCategoryPreviewContext,
  createCategorySidebarConfigurationSelection,
  normalizeCategorySidebarConfiguration,
  CategorySidebarConfigurationRefusal,
  type CategorySidebarConfiguration
} from './categorySidebarConfiguration';

type View = 'landing' | 'compare';
type ComparisonPreview = 'branch-a' | 'branch-b';
type WorkspaceState = 'comparison' | 'combined';
type EvidenceTab = 'source' | 'dependencies' | 'verification';
const github = 'https://github.com/varun-raj-77/ui-merge-studio';
const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function Landing({ open }: { open: () => void }) {
  return <main className="catalogue-site">
    <nav className="catalogue-nav">
      <a href="#top" className="catalogue-wordmark"><span>UM</span>UI Merge Studio</a>
      <a href={github} target="_blank" rel="noreferrer noopener">GitHub</a>
    </nav>
    <section className="catalogue-hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow">Visual integration for React</p>
        <h1>Combine the best parts of parallel React implementations.</h1>
        <p>Compare working versions, pick visible features, and generate one verified branch.</p>
        <div className="catalogue-actions">
          <button onClick={open}>Try the interactive example</button>
          <a href="#how">How it works</a>
        </div>
      </div>
      <div className="outcome-illustration" aria-label="Compare two versions, pick visible features, and view the combined result">
        <div className="outcome-frame compare-frame"><span>01</span><b>Compare two versions</b><i><em /><em /></i></div>
        <div className="outcome-arrow" aria-hidden="true">→</div>
        <div className="outcome-frame pick-frame"><span>02</span><b>Pick visible features</b><i><em>+</em></i></div>
        <div className="outcome-arrow" aria-hidden="true">→</div>
        <div className="outcome-frame result-frame"><span>03</span><b>View combined result</b><i><em>✓</em></i></div>
      </div>
    </section>
    <section className="outcome-steps" id="how" aria-label="How it works">
      <article><span>Compare</span><p>Open two working implementations side by side.</p></article>
      <article><span>Choose</span><p>Add only the visible features you want to keep.</p></article>
      <article><span>Combine</span><p>Inspect one exact, verified result.</p></article>
    </section>
  </main>;
}

interface ArtifactFrameProps {
  artifact: PublicArtifact;
  title: string;
  previewId: string;
  context: PreviewContext;
  selectedScopes: string[];
  selectionEnabled?: boolean;
  visibilitySignal?: boolean;
  resolveCapability?: (scope: string, visibleLabel: string) => SelectionCapability<CatalogueSourceBranch>;
  onToggle?: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onUnsupportedCapability?: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onDetailsCapability?: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onHistoryShortcut?: (action: 'undo' | 'redo') => void;
  onContextMessage: (message: PreviewContextMessage) => void;
  categoryConfiguration?: CategorySidebarConfiguration | null;
}

function applyConfiguredCategoryOptions(
  document: Document | null | undefined,
  configuration?: CategorySidebarConfiguration | null
) {
  if (!document) return;
  const enabledLabels = new Set(configuration ? categoryLabels(configuration.enabledCategoryIds) : []);
  document.querySelectorAll<HTMLButtonElement>('[aria-label="Product categories"] button').forEach(button => {
    const retained = !configuration || enabledLabels.has(button.textContent?.trim() ?? '');
    button.hidden = !retained;
    button.toggleAttribute('data-ums-configuration-excluded', !retained);
  });
  document.documentElement?.toggleAttribute('data-ums-configured-preview', Boolean(configuration));
}

function contextualControlLabel(capability: SelectionCapability, selected: boolean) {
  if (!capability.supported) return 'Why unavailable';
  if (selected) return 'Added';
  if (capability.kind === 'whole-feature') return 'Add sidebar';
  if (capability.kind === 'all-instances') return 'Add all';
  if (capability.kind === 'configurable-subset') return 'Configure';
  return 'Add Quick View';
}

function installContextualControls(
  frame: HTMLIFrameElement | null,
  enabled: boolean,
  selectedScopes: string[],
  resolveCapability?: (scope: string, visibleLabel: string) => SelectionCapability<CatalogueSourceBranch>,
  onToggle?: (capability: SelectionCapability<CatalogueSourceBranch>) => void,
  onUnsupportedCapability?: (capability: SelectionCapability<CatalogueSourceBranch>) => void,
  onDetailsCapability?: (capability: SelectionCapability<CatalogueSourceBranch>) => void
) {
  const document = frame?.contentDocument;
  if (!document?.body) return;
  const styleId = 'ums-contextual-selection-style';
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      [data-ums-scope] { position: relative; }
      .ums-contextual-selection-layer {
        position: fixed; inset: 0; z-index: 2147483000;
        overflow: hidden; pointer-events: none;
      }
      .ums-context-add {
        display: inline-flex; align-items: center; gap: 5px;
        min-height: 30px; padding: 6px 9px;
        border: 1px solid #34342f; border-radius: 9px;
        background: #1c1d19; color: #fff;
        box-shadow: 0 7px 20px #17191426;
        font: 800 11px/1 system-ui, sans-serif;
        opacity: .9; pointer-events: auto; cursor: pointer;
        transition: opacity 180ms ease, transform 180ms ease;
      }
      .ums-context-control-group {
        position: fixed; display: flex; gap: 5px;
        pointer-events: auto;
      }
      .ums-context-details {
        min-height: 30px; padding: 6px 8px;
        border: 1px solid #34342f; border-radius: 9px;
        background: #fff; color: #34342f;
        font: 800 10px/1 system-ui, sans-serif;
        cursor: pointer;
      }
      .ums-context-add:hover, .ums-context-add:focus-visible { opacity: 1; transform: translateY(-1px); }
      [data-ums-scope][data-ums-selected] {
        outline: 2px solid #715ee8; outline-offset: 3px;
        box-shadow: 0 0 0 6px #715ee818;
      }
      .ums-context-add[data-selected] {
        border-color: #715ee8; background: #715ee8;
      }
      .ums-context-add[data-unsupported] {
        border-color: #9a6b29; background: #fff8e9; color: #69440e;
      }
      .ums-context-add:focus-visible { outline: 3px solid #d8f27a; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) {
        .ums-context-add { transition: none; }
      }
    `;
    document.head.append(style);
  }

  const selected = new Set(selectedScopes);
  let layer = document.querySelector<HTMLElement>('.ums-contextual-selection-layer');
  if (!layer && enabled) {
    layer = document.createElement('div');
    layer.className = 'ums-contextual-selection-layer';
    layer.setAttribute('aria-label', 'Source-backed integration actions');
    document.body.append(layer);
  }
  if (!enabled) {
    layer?.remove();
    document.querySelectorAll<HTMLElement>('[data-ums-scope]').forEach(element => {
      element.removeAttribute('data-ums-selected');
    });
    return;
  }
  const activeScopes = new Set<string>();
  document.querySelectorAll<HTMLElement>('[data-ums-scope]').forEach(element => {
    const scope = element.dataset.umsScope;
    if (!scope) return;
    const visibleLabel = element.dataset.umsLabel ?? scope;
    const capability = resolveCapability?.(scope, visibleLabel);
    if (!capability) return;
    activeScopes.add(scope);
    element.toggleAttribute('data-ums-selected', selected.has(scope));
    let group = layer!.querySelector<HTMLElement>(`.ums-context-control-group[data-scope="${CSS.escape(scope)}"]`);
    if (!group) {
      group = document.createElement('div');
      group.className = 'ums-context-control-group';
      group.dataset.scope = scope;
      layer!.append(group);
    }
    let control = group.querySelector<HTMLButtonElement>('.ums-context-add');
    if (!control) {
      control = document.createElement('button');
      control.type = 'button';
      control.className = 'ums-context-add';
      control.dataset.scope = scope;
      group.append(control);
    }
    let details = group.querySelector<HTMLButtonElement>('.ums-context-details');
    if (!details) {
      details = document.createElement('button');
      details.type = 'button';
      details.className = 'ums-context-details';
      details.textContent = 'Details';
      group.append(details);
    }
    const isSelected = selected.has(scope);
    const text = `${isSelected ? '✓' : capability.supported ? '+' : 'i'} ${contextualControlLabel(capability, isSelected)}`;
    if (control.textContent !== text) control.textContent = text;
    control.dataset.capabilityKind = capability.kind;
    control.dataset.pageId = capability.pageId;
    control.dataset.route = capability.route;
    control.toggleAttribute('data-selected', isSelected);
    control.toggleAttribute('data-unsupported', !capability.supported);
    control.setAttribute(
      'aria-label',
      capability.supported
        ? `${isSelected ? 'Remove' : 'Add'} ${visibleLabel}`
        : `${capability.label} unavailable: ${capability.unsupportedReason}`
    );
    control.title = capability.supported ? capability.label : capability.unsupportedReason ?? '';
    const rect = element.getBoundingClientRect();
    const frameWidth = document.defaultView?.innerWidth ?? 0;
    const frameHeight = document.defaultView?.innerHeight ?? 0;
    const offset = capability.kind === 'whole-feature' ? 196 : 182;
    group.style.top = `${Math.max(8, rect.top + 9)}px`;
    group.style.left = `${Math.max(8, Math.min(frameWidth - offset, rect.right - offset))}px`;
    group.hidden = rect.bottom < 0 || rect.top > frameHeight;
    control.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      if (capability.supported) onToggle?.(capability);
      else onUnsupportedCapability?.(capability);
    };
    details.setAttribute('aria-label', `Details for ${capability.label}`);
    details.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      onDetailsCapability?.(capability);
    };
  });
  layer?.querySelectorAll<HTMLElement>('.ums-context-control-group').forEach(group => {
    if (!activeScopes.has(group.dataset.scope ?? '')) group.remove();
  });
  const reposition = () => {
    layer?.querySelectorAll<HTMLElement>('.ums-context-control-group').forEach(group => {
      const scope = group.dataset.scope;
      const element = scope
        ? document.querySelector<HTMLElement>(`[data-ums-scope="${CSS.escape(scope)}"]`)
        : null;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const frameWidth = document.defaultView?.innerWidth ?? 0;
      const frameHeight = document.defaultView?.innerHeight ?? 0;
      const offset = scope === 'category-sidebar' ? 196 : 182;
      group.style.top = `${Math.max(8, rect.top + 9)}px`;
      group.style.left = `${Math.max(8, Math.min(frameWidth - offset, rect.right - offset))}px`;
      group.hidden = rect.bottom < 0 || rect.top > frameHeight;
    });
  };
  (layer as HTMLElement & { __umsReposition?: () => void }).__umsReposition = reposition;
  if (!document.documentElement.hasAttribute('data-ums-context-listeners')) {
    document.documentElement.setAttribute('data-ums-context-listeners', '');
    const update = () => {
      const current = document.querySelector<HTMLElement>('.ums-contextual-selection-layer') as
        (HTMLElement & { __umsReposition?: () => void }) | null;
      current?.__umsReposition?.();
    };
    document.defaultView?.addEventListener('scroll', update, { passive: true });
    document.defaultView?.addEventListener('resize', update);
  }
}

function ArtifactFrame({
  artifact,
  title,
  previewId,
  context,
  selectedScopes,
  selectionEnabled = false,
  visibilitySignal,
  resolveCapability,
  onToggle,
  onUnsupportedCapability,
  onDetailsCapability,
  onHistoryShortcut,
  onContextMessage,
  categoryConfiguration
}: ArtifactFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const scopeObserver = useRef<MutationObserver | null>(null);
  const shortcutCleanup = useRef<(() => void) | null>(null);
  const resolveCapabilityRef = useRef(resolveCapability);
  const toggleRef = useRef(onToggle);
  const unsupportedCapabilityRef = useRef(onUnsupportedCapability);
  const detailsCapabilityRef = useRef(onDetailsCapability);
  const historyShortcutRef = useRef(onHistoryShortcut);
  const contextMessageRef = useRef(onContextMessage);
  const contextRef = useRef(context);
  const selectedScopesRef = useRef(selectedScopes);
  const categoryConfigurationRef = useRef(categoryConfiguration);
  const applySequence = useRef(0);
  resolveCapabilityRef.current = resolveCapability;
  toggleRef.current = onToggle;
  unsupportedCapabilityRef.current = onUnsupportedCapability;
  detailsCapabilityRef.current = onDetailsCapability;
  historyShortcutRef.current = onHistoryShortcut;
  contextMessageRef.current = onContextMessage;
  contextRef.current = context;
  selectedScopesRef.current = selectedScopes;
  categoryConfigurationRef.current = categoryConfiguration;
  const postState = () => {
    frame.current?.contentWindow?.postMessage({
      type: 'ums-showcase-mode',
      mode: 'play',
      showChanges: false,
      selectedScopes
    }, location.origin);
    installContextualControls(
      frame.current,
      selectionEnabled,
      selectedScopes,
      (scope, label) => resolveCapabilityRef.current?.(scope, label)
        ?? catalogueCapabilityFromRuntime(scope, 'branch-a', label),
      capability => toggleRef.current?.(capability),
      capability => unsupportedCapabilityRef.current?.(capability),
      capability => detailsCapabilityRef.current?.(capability)
    );
    applyConfiguredCategoryOptions(frame.current?.contentDocument, categoryConfigurationRef.current);
  };
  const postContext = () => {
    applySequence.current += 1;
    frame.current?.contentWindow?.postMessage(
      createApplyPreviewContextCommand(previewId, contextRef.current, applySequence.current),
      location.origin
    );
  };
  const observeScopes = () => {
    scopeObserver.current?.disconnect();
    shortcutCleanup.current?.();
    postState();
    const body = frame.current?.contentDocument?.body;
    const contentWindow = frame.current?.contentWindow;
    if (contentWindow) {
      const listener = (event: KeyboardEvent) => {
        const action = selectionHistoryShortcut(event);
        if (!action || !historyShortcutRef.current) return;
        event.preventDefault();
        historyShortcutRef.current(action);
      };
      contentWindow.addEventListener('keydown', listener);
      shortcutCleanup.current = () => contentWindow.removeEventListener('keydown', listener);
    }
    if ((selectionEnabled || categoryConfigurationRef.current) && body) {
      scopeObserver.current = new MutationObserver(() => {
        installContextualControls(
          frame.current,
          true,
          selectedScopesRef.current,
          (scope, label) => resolveCapabilityRef.current?.(scope, label)
            ?? catalogueCapabilityFromRuntime(scope, 'branch-a', label),
          capability => toggleRef.current?.(capability),
          capability => unsupportedCapabilityRef.current?.(capability),
          capability => detailsCapabilityRef.current?.(capability)
        );
        applyConfiguredCategoryOptions(frame.current?.contentDocument, categoryConfigurationRef.current);
      });
      scopeObserver.current.observe(body, { childList: true, subtree: true });
    }
  };

  useEffect(() => {
    postState();
    const repositionFrame = requestAnimationFrame(postState);
    const settledFrame = setTimeout(postState, 100);
    return () => {
      cancelAnimationFrame(repositionFrame);
      clearTimeout(settledFrame);
    };
  }, [selectionEnabled, selectedScopes.join(','), visibilitySignal, categoryConfiguration?.enabledCategoryIds.join(','), categoryConfiguration?.defaultCategoryId]);
  useEffect(postContext, [
    context.route,
    context.viewport.width,
    context.viewport.height,
    context.scroll.xRatio,
    context.scroll.yRatio,
    context.catalogue.categoryId,
    context.catalogue.searchQuery,
    context.catalogue.sortId,
    context.catalogue.selectedProductId,
    context.catalogue.quickViewOpen
  ]);
  useEffect(() => () => {
    scopeObserver.current?.disconnect();
    shortcutCleanup.current?.();
  }, []);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'ums-showcase-ready') {
        observeScopes();
        return;
      }
      const message = parsePreviewContextMessage(event.data, previewId);
      if (!message) return;
      contextMessageRef.current(message);
      if (message.type === 'ums-preview-context-ready') postContext();
    };
    addEventListener('message', listener);
    return () => removeEventListener('message', listener);
  }, [previewId]);

  const source = `/catalogue?ums-artifact=${encodeURIComponent(`${artifact.path}index.html`)}&ums-preview=${encodeURIComponent(previewId)}`;
  return <iframe ref={frame} src={source} title={title} onLoad={() => {
    postState();
    postContext();
  }} />;
}

function scopeLabel(scope: ShowcaseScope) {
  if (scope.kind === 'feature') return 'Category sidebar';
  return `Quick View · ${catalogueProduct(scope.instanceId)?.name ?? scope.instanceId}`;
}

function pageLabel(pageId: string) {
  if (pageId === 'product-catalogue') return 'Catalogue';
  return pageId
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function useDialogFocus(close: () => void, opener?: RefObject<HTMLElement | null>) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const returnTarget = opener?.current ?? document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    focusables()[0]?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    addEventListener('keydown', listener);
    return () => {
      removeEventListener('keydown', listener);
      returnTarget?.focus();
    };
  }, []);
  return dialog;
}

function dependencyGroups(paths: string[]) {
  const groups = {
    Components: [] as string[],
    Hooks: [] as string[],
    Styles: [] as string[],
    Types: [] as string[],
    Configuration: [] as string[]
  };
  for (const path of paths) {
    if (path.includes('/hooks/') || /\/use[A-Z]/.test(path)) groups.Hooks.push(path);
    else if (path.endsWith('.css')) groups.Styles.push(path);
    else if (path.includes('/types/')) groups.Types.push(path);
    else if (path.includes('/config/')) groups.Configuration.push(path);
    else if (path.endsWith('.tsx')) groups.Components.push(path);
  }
  return Object.entries(groups).filter(([, items]) => items.length);
}

function EvidenceDialog({ scope, candidate, opener, close }: {
  scope: ShowcaseScope;
  candidate: PublicCandidate;
  opener: RefObject<HTMLElement | null>;
  close: () => void;
}) {
  const [tab, setTab] = useState<EvidenceTab>('source');
  const dialog = useDialogFocus(close, opener);
  const evidence = evidenceForScope(scope);
  const product = scope.kind === 'feature-instance' ? catalogueProduct(scope.instanceId) : null;
  const paths = [
    ...evidence.supportingFiles.map(item => item.path),
    ...(evidence.configuration ? [evidence.configuration.path] : [])
  ];
  const verification = [
    ['TypeScript', candidate.verification.some(gate => gate.id.includes('typecheck'))],
    ['Feature tests', candidate.verification.some(gate => gate.id.includes('test'))],
    ['Production build', candidate.verification.some(gate => gate.id.includes('build'))]
  ] as const;

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className="evidence-dialog" role="dialog" aria-modal="true" aria-labelledby="evidence-title">
      <header>
        <div><span>Selection evidence</span><h2 id="evidence-title">{scopeLabel(scope)}</h2></div>
        <button onClick={close} aria-label="Close technical evidence">×</button>
      </header>
      <div className="evidence-tabs" role="tablist" aria-label="Technical evidence">
        {(['source', 'dependencies', 'verification'] as EvidenceTab[]).map(item =>
          <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>{item}</button>
        )}
      </div>
      {tab === 'source' && <div className="evidence-pane evidence-source">
        <p><span>Component</span><strong>{evidence.selectedBoundary}</strong></p>
        <p><span>Source file</span><code>{evidence.sourceFile}:{evidence.sourceLine}</code></p>
        <p><span>Selected scope</span><strong>{scopeLabel(scope)}</strong></p>
        {product && <p><span>Product ID</span><code>{product.id}</code></p>}
      </div>}
      {tab === 'dependencies' && <div className="evidence-pane dependency-groups">
        {dependencyGroups(paths).map(([group, items]) => <section key={group}><h3>{group}</h3>{items.map(path => <code key={path}>{path}</code>)}</section>)}
      </div>}
      {tab === 'verification' && <div className="evidence-pane verification-list">
        {verification.map(([label, passed]) => <p key={label}><span>{label}</span><strong>{passed ? 'Passed' : 'Unavailable'} <i aria-hidden="true">✓</i></strong></p>)}
      </div>}
    </section>
  </div>;
}

function capabilityKindLabel(kind: SelectionCapability['kind']) {
  if (kind === 'whole-feature') return 'Whole feature';
  if (kind === 'feature-instance') return 'Feature instance';
  if (kind === 'all-instances') return 'All instances';
  if (kind === 'configurable-subset') return 'Configurable subset';
  return 'Unsupported selection';
}

function capabilityTargetLabels(capability: SelectionCapability) {
  return (capability.targetIds ?? []).map(id => (
    catalogueProduct(id)?.name ?? id.charAt(0).toUpperCase() + id.slice(1)
  ));
}

function CapabilityDetailsDialog({
  capability,
  close,
  customize
}: {
  capability: SelectionCapability<CatalogueSourceBranch>;
  close: () => void;
  customize?: (opener: HTMLElement) => void;
}) {
  const dialog = useDialogFocus(close);
  const targets = capabilityTargetLabels(capability);
  const configurableChild: SelectionCapability | undefined = catalogueSelectionCapabilities.find(item => (
    item.parentCapabilityId === capability.id && item.kind === 'configurable-subset'
  ));
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className="capability-dialog" role="dialog" aria-modal="true" aria-labelledby="capability-title">
      <header>
        <div><span>Selection details</span><h2 id="capability-title">{capability.label}</h2></div>
        <button onClick={close} aria-label="Close selection details">×</button>
      </header>
      <dl>
        <div><dt>Selection level</dt><dd>{capabilityKindLabel(capability.kind)}</dd></div>
        <div><dt>Source branch</dt><dd>{capability.sourceBranch === 'branch-a' ? 'Version A' : 'Version B'}</dd></div>
        <div><dt>Original route</dt><dd>{capability.route}</dd></div>
        <div><dt>Workspace</dt><dd>{capability.pageId}</dd></div>
        <div><dt>Availability</dt><dd>{capability.supported ? 'Supported' : 'Not available yet'}</dd></div>
      </dl>
      <section>
        <strong>What will be included</strong>
        <p>{targets.length > 0
          ? targets.join(', ')
          : capability.kind === 'whole-feature'
            ? 'The complete visible feature and its verified dependencies.'
            : 'No independently executable selection is available.'}</p>
      </section>
      {!capability.supported && <section className="capability-unavailable">
        <strong>Why it cannot be added</strong>
        <p>{capability.unsupportedReason}</p>
      </section>}
      {configurableChild && <section className="capability-customize">
        <strong>{configurableChild.label}</strong>
        <p>Choose the categories retained in the result and its permanent default.</p>
        <button onClick={event => {
          close();
          customize?.(event.currentTarget);
        }}>Customize categories</button>
      </section>}
    </section>
  </div>;
}

function CategoryConfigurationDialog({ initial, sidebarSelected, opener, close, apply }: {
  initial: CategorySidebarConfiguration;
  sidebarSelected: boolean;
  opener: RefObject<HTMLElement | null>;
  close: () => void;
  apply: (configuration: CategorySidebarConfiguration) => void;
}) {
  const dialog = useDialogFocus(close, opener);
  const [enabledCategoryIds, setEnabledCategoryIds] = useState<string[]>(initial.enabledCategoryIds);
  const [defaultCategoryId, setDefaultCategoryId] = useState(initial.defaultCategoryId);
  let configuration: CategorySidebarConfiguration | null = null;
  let validationMessage = '';
  try {
    configuration = normalizeCategorySidebarConfiguration({ enabledCategoryIds, defaultCategoryId });
  } catch (error) {
    validationMessage = error instanceof CategorySidebarConfigurationRefusal
      ? error.productMessage
      : 'This category configuration cannot be applied.';
  }
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className="category-configuration-dialog" role="dialog" aria-modal="true" aria-labelledby="category-configuration-title">
      <header>
        <div>
          <span>Version A · /catalogue</span>
          <h2 id="category-configuration-title">Category sidebar</h2>
        </div>
        <button onClick={close} aria-label="Close category customization">×</button>
      </header>
      <fieldset>
        <legend>Categories included</legend>
        {categorySidebarRepositoryMetadata.categories.map(category => <label key={category.id}>
          <input
            type="checkbox"
            checked={enabledCategoryIds.includes(category.id)}
            onChange={event => setEnabledCategoryIds(current => event.target.checked
              ? [...current, category.id]
              : current.filter(id => id !== category.id))}
          />
          <span>{category.label}</span>
        </label>)}
      </fieldset>
      <fieldset>
        <legend>Default category</legend>
        {categorySidebarRepositoryMetadata.categories
          .filter(category => enabledCategoryIds.includes(category.id))
          .map(category => <label key={category.id}>
            <input
              type="radio"
              name="default-category"
              value={category.id}
              checked={defaultCategoryId === category.id}
              onChange={() => setDefaultCategoryId(category.id)}
            />
            <span>{category.label}</span>
          </label>)}
      </fieldset>
      {validationMessage && <p className="configuration-validation" role="alert">{validationMessage}</p>}
      <footer>
        <button className="secondary-action" onClick={close}>Cancel</button>
        <button
          disabled={!configuration}
          onClick={() => {
            if (!configuration) return;
            apply(configuration);
          }}
        >{sidebarSelected ? 'Save customization' : 'Add customized sidebar'}</button>
      </footer>
    </section>
  </div>;
}

function ConflictDialog({ quickCount, close, remove, inspect, showingEvidence }: {
  quickCount: number;
  close: () => void;
  remove: () => void;
  inspect: () => void;
  showingEvidence: boolean;
}) {
  const dialog = useDialogFocus(close);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className="conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
      <header>
        <div><span>Conflict in {quickCount + 1} selections</span><h2 id="conflict-title">Cannot combine these selections</h2></div>
        <button onClick={close} aria-label="Close conflict review">×</button>
      </header>
      <p>The Product-ID change modifies the shared Product contract from string IDs to numeric IDs. The selected Quick View targets depend on stable string IDs.</p>
      <div className="affected-contract"><span>Affected contract</span><code>{recordedRefusal.contractPath}#{recordedRefusal.contractSymbol}</code></div>
      {showingEvidence && <div className="conflict-evidence">
        <strong>{recordedRefusal.selectedBoundary}</strong>
        <p>{recordedRefusal.reason}</p>
        <small>The previous verified candidate remains unchanged.</small>
      </div>}
      <footer>
        <button className="secondary-action" onClick={inspect}>{showingEvidence ? 'Hide evidence' : 'Inspect evidence'}</button>
        <button className="danger-action" onClick={remove}>Remove incompatible change</button>
      </footer>
    </section>
  </div>;
}

function PreviewPanel({ preview, title, subtitle, artifact, active, context, categoryConfiguration, selectedScopes, onToggle, onUnsupportedCapability, onDetailsCapability, onCustomizeCategories, onHistoryShortcut, onContextMessage }: {
  preview: ComparisonPreview;
  title: string;
  subtitle: string;
  artifact: PublicArtifact;
  active: boolean;
  context: PreviewContext;
  categoryConfiguration?: CategorySidebarConfiguration | null;
  selectedScopes: string[];
  onToggle: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onUnsupportedCapability: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onDetailsCapability: (capability: SelectionCapability<CatalogueSourceBranch>) => void;
  onCustomizeCategories: (opener: HTMLElement) => void;
  onHistoryShortcut: (action: 'undo' | 'redo') => void;
  onContextMessage: (message: PreviewContextMessage) => void;
}) {
  const bulkCapability = preview === 'branch-b'
    ? catalogueCapabilityFromRuntime(quickViewAllCapabilityId, 'branch-b')
    : null;
  const bulkSelected = selectedScopes.includes(quickViewAllCapabilityId);
  return <article className={`workspace-preview ${active ? 'mobile-active' : ''}`} data-view={preview}>
    <header>
      <div><span className={`preview-dot ${preview}`} /><div><h2>{title}</h2><p>{subtitle}</p></div></div>
      {bulkCapability && <div className="preview-capability-actions">
        <button onClick={() => onToggle(bulkCapability)}>
          {bulkSelected ? 'Remove Quick View from all products' : 'Add Quick View to all products'}
        </button>
        <button onClick={() => onDetailsCapability(bulkCapability)}>Details</button>
      </div>}
      {preview === 'branch-a' && <div className="preview-capability-actions">
        <button
          onClick={event => onCustomizeCategories(event.currentTarget)}
        >{selectedScopes.includes('category-sidebar') ? 'Edit categories' : 'Customize & add'}</button>
      </div>}
    </header>
    <div className="artifact-stage">
      <ArtifactFrame
        artifact={artifact}
        title={`${title} live application`}
        previewId={preview}
        context={context}
        categoryConfiguration={categoryConfiguration}
        selectedScopes={selectedScopes}
        selectionEnabled
        visibilitySignal={active}
        resolveCapability={(scope, label) => catalogueCapabilityFromRuntime(scope, preview, label)}
        onToggle={onToggle}
        onUnsupportedCapability={onUnsupportedCapability}
        onDetailsCapability={onDetailsCapability}
        onHistoryShortcut={onHistoryShortcut}
        onContextMessage={onContextMessage}
      />
    </div>
  </article>;
}

function SelectionChip({ scope, openEvidence, remove, configuration }: {
  scope: ShowcaseScope;
  openEvidence: (scope: ShowcaseScope, opener: HTMLElement) => void;
  remove: (scope: ShowcaseScope) => void;
  configuration?: CategorySidebarConfiguration | null;
}) {
  return <span className="selection-chip">
    <span className="selection-chip-copy">
      <span>{scopeLabel(scope)}</span>
      {scope.featureId === 'category-sidebar' && configuration && <small>
        {categoryLabels(configuration.enabledCategoryIds).join(', ')}<br />Default: {categoryLabels([configuration.defaultCategoryId])[0]}
      </small>}
    </span>
    <button onClick={event => openEvidence(scope, event.currentTarget)} aria-label={`Evidence for ${scopeLabel(scope)}`}>i</button>
    <button onClick={() => remove(scope)} aria-label={`Remove ${scopeLabel(scope)}`}>×</button>
  </span>;
}

function Comparison({ exit }: { exit: () => void }) {
  const [selectionHistory, dispatchHistory] = useReducer(
    selectionHistoryReducer,
    initialSelectionHistory
  );
  const selection = selectionHistory.present;
  const [previewContext, setPreviewContext] = useState(defaultPreviewContext);
  const [previewCapabilities, setPreviewCapabilities] = useState<Record<string, PreviewCapabilities>>({});
  const [contextNotices, setContextNotices] = useState<Record<string, PreviewContextNotice[]>>({});
  const [mobilePreview, setMobilePreview] = useState<ComparisonPreview>('branch-a');
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>('comparison');
  const [dockExpanded, setDockExpanded] = useState(true);
  const initialCandidate = resolveCatalogueCandidate(candidateKey(emptyShowcaseSelection));
  const [candidate, setCandidate] = useState(initialCandidate);
  const [candidateStatus, setCandidateStatus] = useState<'ready' | 'resolving'>('ready');
  const [evidenceScope, setEvidenceScope] = useState<ShowcaseScope | null>(null);
  const [showConflict, setShowConflict] = useState(false);
  const [showConflictEvidence, setShowConflictEvidence] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [capabilityNotice, setCapabilityNotice] = useState<SelectionCapability<CatalogueSourceBranch> | null>(null);
  const [detailsCapability, setDetailsCapability] = useState<SelectionCapability<CatalogueSourceBranch> | null>(null);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const evidenceOpener = useRef<HTMLElement | null>(null);
  const categoryEditorOpener = useRef<HTMLElement | null>(null);
  const lastContextRevision = useRef<Record<string, number>>({});
  const desiredKey = candidateKey(selection);
  const refused = selection.incompatibleProductId && hasQuickViewSelection(selection);
  const branchAArtifact = catalogueManifest.artifacts.find(item => item.kind === 'branch-a')!;
  const branchBArtifact = catalogueManifest.artifacts.find(item => item.kind === 'branch-b')!;
  const quickCount = selection.scopes.filter(scope => scope.featureId === 'product-quick-view').length;
  const selectedScopeKeys = [
    ...selection.scopes.map(scopeKey),
    ...(quickCount === catalogueManifest.productIds.length ? [quickViewAllCapabilityId] : [])
  ];
  const selectionCount = selection.scopes.length + (selection.incompatibleProductId ? 1 : 0);
  const sidebarDecision = categorySidebarDecision(selection);
  const categoryConfigurationSelection = sidebarDecision?.configuration ?? null;
  const configuredPreview = useMemo(() => categoryConfigurationSelection
    ? configuredCategoryPreviewContext(previewContext, categoryConfigurationSelection.configuration)
    : { context: previewContext, notices: [] as PreviewContextNotice[] }, [
      previewContext,
      categoryConfigurationSelection?.identity
    ]);

  function performHistoryAction(action: 'undo' | 'redo') {
    const available = action === 'undo'
      ? selectionHistory.past.length > 0
      : selectionHistory.future.length > 0;
    if (!available) return;
    dispatchHistory({ type: action });
    setShowConflict(false);
    setShowConflictEvidence(false);
  }

  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const updateViewport = () => {
      const width = Math.round(window.innerWidth);
      const height = Math.round(window.innerHeight);
      if (width < 320 || height < 320) return;
      setPreviewContext(current => ({
        ...current,
        viewport: { width, height }
      }));
    };
    const scheduleViewportUpdate = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateViewport, 80);
    };
    updateViewport();
    addEventListener('resize', scheduleViewportUpdate);
    return () => {
      clearTimeout(resizeTimer);
      removeEventListener('resize', scheduleViewportUpdate);
    };
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const action = selectionHistoryShortcut(event);
      if (!action) return;
      const available = action === 'undo'
        ? selectionHistory.past.length > 0
        : selectionHistory.future.length > 0;
      if (!available) return;
      event.preventDefault();
      performHistoryAction(action);
    };
    addEventListener('keydown', listener);
    return () => removeEventListener('keydown', listener);
  }, [selectionHistory.past.length, selectionHistory.future.length]);

  useEffect(() => {
    if (refused || candidate.key === desiredKey) return;
    setCandidateStatus('resolving');
    const timer = setTimeout(() => {
      setCandidate(resolveCatalogueCandidate(desiredKey));
      setCandidateStatus('ready');
    }, 180);
    return () => clearTimeout(timer);
  }, [candidate.key, desiredKey, refused]);

  const commitSelection = (
    next: typeof selection,
    label: string,
    offerImmediateUndo = false
  ) => {
    dispatchHistory({
      type: 'commit',
      selection: next,
      label,
      offerImmediateUndo
    });
  };
  const removeScope = (scope: ShowcaseScope) => {
    let next = showcaseSelectionReducer(selection, { type: 'remove-scope', scope });
    if (scope.featureId === 'product-quick-view' && quickCount === 1 && selection.incompatibleProductId) {
      next = showcaseSelectionReducer(next, { type: 'toggle-incompatible' });
      setShowConflict(false);
    }
    commitSelection(next, `Removed ${scopeLabel(scope)}`, true);
  };
  const toggleCapability = (
    branch: CatalogueSourceBranch,
    capability: SelectionCapability<CatalogueSourceBranch>
  ) => {
    if (!capability.supported || capability.sourceBranch !== branch) {
      setCapabilityNotice(capability);
      return;
    }
    const scopes = catalogueScopesForCapability(capability);
    if (scopes.length === 0) {
      setCapabilityNotice({
        ...capability,
        kind: 'unsupported',
        supported: false,
        unsupportedReason: `${capability.label} has no verified source selection.`
      });
      return;
    }
    const alreadySelected = scopes.every(scope => (
      selection.scopes.some(item => scopeIdentityKey(item) === scopeIdentityKey(scope))
    ));
    if (!alreadySelected) {
      const compatibility = selectionCapabilityCompatibility([
        ...selection.scopes.map(catalogueCapabilityForScope),
        capability
      ]);
      if (!compatibility.compatible) {
        setCapabilityNotice({
          ...capability,
          kind: 'unsupported',
          supported: false,
          unsupportedReason: compatibility.reason
        });
        return;
      }
    }
    let next = selection;
    for (const scope of scopes) {
      const contains = next.scopes.some(item => scopeIdentityKey(item) === scopeIdentityKey(scope));
      if (alreadySelected || !contains) {
        next = showcaseSelectionReducer(
          next,
          { type: alreadySelected ? 'remove-scope' : 'toggle-scope', scope }
        );
      }
    }
    if (!alreadySelected && window.innerWidth <= 700) {
      setDockExpanded(false);
    }
    if (alreadySelected && !hasQuickViewSelection(next) && selection.incompatibleProductId) {
      next = showcaseSelectionReducer(next, { type: 'toggle-incompatible' });
      setShowConflict(false);
    }
    setCapabilityNotice(null);
    const historySubject = capability.id === quickViewAllCapabilityId
      ? 'Quick View to all products'
      : capability.label;
    commitSelection(
      next,
      `${alreadySelected ? 'Removed' : 'Added'} ${historySubject}`,
      alreadySelected
    );
  };
  const openEvidence = (scope: ShowcaseScope, opener: HTMLElement) => {
    evidenceOpener.current = opener;
    setEvidenceScope(scope);
  };
  const clearSelections = () => {
    const count = selectionCount;
    commitSelection(
      showcaseSelectionReducer(selection, { type: 'clear' }),
      `Cleared ${count} selection${count === 1 ? '' : 's'}`,
      true
    );
    setShowConflict(false);
  };
  const removeIncompatible = () => {
    commitSelection(
      showcaseSelectionReducer(selection, { type: 'toggle-incompatible' }),
      'Removed Product-ID change',
      true
    );
    setShowConflict(false);
    setShowConflictEvidence(false);
  };
  const openCategoryEditor = (opener: HTMLElement) => {
    categoryEditorOpener.current = opener;
    setCategoryEditorOpen(true);
  };
  const applyCategoryConfiguration = (configuration: CategorySidebarConfiguration) => {
    const addingSidebar = !sidebarDecision;
    const configured = createCategorySidebarConfigurationSelection(configuration);
    const next = showcaseSelectionReducer(selection, {
      type: 'configure-category-sidebar',
      configuration: configured
    });
    commitSelection(next, addingSidebar ? 'Added customized Category sidebar' : 'Customized Category sidebar');
    if (addingSidebar && window.innerWidth <= 700) setDockExpanded(false);
    setCategoryEditorOpen(false);
  };
  const viewCombined = () => {
    if (refused) {
      setShowConflict(true);
      return;
    }
    setWorkspaceState('combined');
  };
  const handleContextMessage = (message: PreviewContextMessage) => {
    if (message.type === 'ums-preview-context-ready') {
      setPreviewCapabilities(current => ({
        ...current,
        [message.previewId]: message.capabilities
      }));
      return;
    }
    if (message.type === 'ums-preview-context-changed') {
      const lastRevision = lastContextRevision.current[message.previewId] ?? -1;
      if (message.revision <= lastRevision) return;
      lastContextRevision.current[message.previewId] = message.revision;
      setPreviewContext(current => acceptIntentionalContext(
        current,
        message.context,
        message.revision,
        lastRevision,
        message.fields
      ).context);
      setContextNotices(current => ({ ...current, [message.previewId]: [] }));
      return;
    }
    setContextNotices(current => ({
      ...current,
      [message.previewId]: message.notices
    }));
  };
  const scopeSummary = useMemo(() => selection.scopes.map(scopeLabel), [selection.scopes]);
  const selectionRouteGroups = useMemo(() => {
    const groups = new Map<string, { route: string; pageId: string; scopes: ShowcaseScope[] }>();
    for (const scope of selection.scopes) {
      const key = `${scope.pageId}\u0000${scope.route}`;
      const group = groups.get(key);
      if (group) group.scopes.push(scope);
      else groups.set(key, { route: scope.route, pageId: scope.pageId, scopes: [scope] });
    }
    return [...groups.values()].sort((left, right) => left.route.localeCompare(right.route));
  }, [selection.scopes]);
  const historyLabels = selectionHistory.past.slice(-6).reverse();
  const activeContextNotices = workspaceState === 'combined'
    ? [...configuredPreview.notices, ...(contextNotices.combined ?? [])]
    : (contextNotices[mobilePreview] ?? []).filter(notice => notice.code !== 'unsupported-quick-view');

  return <main
    className={`comparison-shell ${selectionCount ? 'has-selection' : ''}`}
    data-context-ready-count={Object.keys(previewCapabilities).length}
    data-context-category={previewContext.catalogue.categoryId}
    data-context-product={previewContext.catalogue.selectedProductId ?? ''}
    data-context-quick-view={previewContext.catalogue.quickViewOpen}
    data-history-past={selectionHistory.past.length}
    data-history-future={selectionHistory.future.length}
  >
    <header className="workspace-commandbar">
      <button onClick={exit} className="catalogue-wordmark"><span>UM</span><i>UI Merge Studio</i></button>
      <span className="workspace-name">Product Catalogue example</span>
      {workspaceState === 'comparison' && <button
        className={selection.incompatibleProductId ? 'experimental active' : 'experimental'}
        disabled={!hasQuickViewSelection(selection)}
        aria-pressed={selection.incompatibleProductId}
        onClick={() => commitSelection(
          showcaseSelectionReducer(selection, { type: 'toggle-incompatible' }),
          selection.incompatibleProductId ? 'Removed Product-ID change' : 'Added Product-ID change',
          selection.incompatibleProductId
        )}
      >{selection.incompatibleProductId ? '✓ Product-ID change added' : '+ Experimental Product-ID change'}</button>}
    </header>

    <section className="comparison-view" hidden={workspaceState !== 'comparison'}>
      <header className="workspace-heading">
        <h1>Compare versions</h1>
        <p>Preview context stays synchronized across generated candidates. The local tool creates the verified Git branch.</p>
      </header>
      <nav className="mobile-preview-tabs" aria-label="Preview versions">
        <button aria-pressed={mobilePreview === 'branch-a'} onClick={() => setMobilePreview('branch-a')}>Version A</button>
        <button aria-pressed={mobilePreview === 'branch-b'} onClick={() => setMobilePreview('branch-b')}>Version B</button>
      </nav>
      <section className="preview-workspace">
        <PreviewPanel preview="branch-a" title="Version A" subtitle="Category navigation" artifact={branchAArtifact} active={mobilePreview === 'branch-a'} context={configuredPreview.context} categoryConfiguration={categoryConfigurationSelection?.configuration} selectedScopes={selectedScopeKeys} onToggle={capability => toggleCapability('branch-a', capability)} onUnsupportedCapability={setCapabilityNotice} onDetailsCapability={setDetailsCapability} onCustomizeCategories={openCategoryEditor} onHistoryShortcut={performHistoryAction} onContextMessage={handleContextMessage} />
        <PreviewPanel preview="branch-b" title="Version B" subtitle="Product Quick View" artifact={branchBArtifact} active={mobilePreview === 'branch-b'} context={previewContext} selectedScopes={selectedScopeKeys} onToggle={capability => toggleCapability('branch-b', capability)} onUnsupportedCapability={setCapabilityNotice} onDetailsCapability={setDetailsCapability} onCustomizeCategories={openCategoryEditor} onHistoryShortcut={performHistoryAction} onContextMessage={handleContextMessage} />
      </section>
    </section>
    <section className="result-workspace" hidden={workspaceState !== 'combined'}>
      <header className="result-header">
        <button onClick={() => setWorkspaceState('comparison')}>← Back to comparison</button>
        <div><span>{categoryConfigurationSelection ? 'Configured preview' : 'Combined result'}</span><h1>Built from {selection.scopes.length} selection{selection.scopes.length === 1 ? '' : 's'}</h1></div>
        <div className="result-chips" aria-label="Selections used">{scopeSummary.map(label => <span key={label}>✓ {label}</span>)}</div>
      </header>
      <div className="combined-stage">
        <ArtifactFrame artifact={candidate.artifact} title="Combined result application" previewId="combined" context={configuredPreview.context} categoryConfiguration={categoryConfigurationSelection?.configuration} selectedScopes={[]} onHistoryShortcut={performHistoryAction} onContextMessage={handleContextMessage} />
        {candidateStatus === 'resolving' && <div className="candidate-loading" role="status">Updating result…</div>}
      </div>
    </section>

    {activeContextNotices.length > 0 && <aside className="context-notice" role="status" aria-live="polite">
      {activeContextNotices.map(notice => <p key={`${notice.code}:${notice.message}`}>{notice.message}</p>)}
    </aside>}
    {capabilityNotice && <aside className="capability-notice" role="status" aria-live="polite">
      <div>
        <strong>{capabilityNotice.label} cannot be selected independently.</strong>
        <p>{capabilityNotice.unsupportedReason}</p>
      </div>
      <button onClick={() => setCapabilityNotice(null)} aria-label="Dismiss selection explanation">×</button>
    </aside>}

    {(selectionCount > 0 || selectionHistory.past.length > 0 || selectionHistory.future.length > 0) && <aside className={`selection-dock ${dockExpanded ? 'expanded' : 'collapsed'} ${refused ? 'has-conflict' : ''}`} aria-label="Current selections">
      <button className="dock-toggle" onClick={() => setDockExpanded(value => !value)} aria-expanded={dockExpanded}>
        <strong>{selectionCount} selection{selectionCount === 1 ? '' : 's'}</strong><span>{dockExpanded ? 'Minimize' : 'Review'}</span>
      </button>
      <div className="selection-chips">
        {selectionRouteGroups.map(group => <section className="selection-route-group" key={`${group.pageId}:${group.route}`}>
          <strong>{pageLabel(group.pageId)} · {group.route}</strong>
          <div>
            {group.scopes.map(scope => <SelectionChip key={scopeIdentityKey(scope)} scope={scope} configuration={scope.featureId === 'category-sidebar' ? scope.configuration?.configuration : null} openEvidence={openEvidence} remove={removeScope} />)}
            {selection.incompatibleProductId && <span className="selection-chip conflict-chip">
              <span>Product-ID change <b>Conflict</b></span>
              <button onClick={() => setShowConflict(true)} aria-label="Evidence for Product-ID conflict">i</button>
              <button onClick={removeIncompatible} aria-label="Remove incompatible Product-ID change">×</button>
            </span>}
          </div>
        </section>)}
      </div>
      <div className="history-actions" aria-label="Selection history controls">
        <button
          onClick={() => performHistoryAction('undo')}
          disabled={selectionHistory.past.length === 0}
          aria-keyshortcuts="Control+Z Meta+Z"
        >Undo</button>
        <button
          onClick={() => performHistoryAction('redo')}
          disabled={selectionHistory.future.length === 0}
          aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
        >Redo</button>
        <button
          onClick={() => setHistoryOpen(value => !value)}
          aria-expanded={historyOpen}
          aria-controls="selection-history-list"
        >History</button>
      </div>
      <button className="clear-selections" onClick={clearSelections} disabled={selectionCount === 0}>Clear</button>
      {workspaceState === 'combined'
        ? <button className="view-combined" onClick={() => setWorkspaceState('comparison')}>Back to comparison</button>
        : <button className={refused ? 'review-conflict' : 'view-combined'} onClick={viewCombined}>{refused ? 'Review conflict' : 'View combined'}</button>}
      {selectionHistory.undoPrompt && !historyOpen && <div className="history-feedback">
        <span>{selectionHistory.undoPrompt}</span>
        <button onClick={() => performHistoryAction('undo')}>Undo</button>
      </div>}
      {historyOpen && <section className="history-panel" aria-label="Selection history">
        <strong>History</strong>
        <ol id="selection-history-list">
          {historyLabels.length === 0
            ? <li>No selection actions yet.</li>
            : historyLabels.map((entry, index) => <li key={`${selectionHistory.past.length - index}:${entry.label}`}>{entry.label}</li>)}
        </ol>
        {selectionHistory.future.length > 0 && <p>{selectionHistory.future.length} action{selectionHistory.future.length === 1 ? '' : 's'} available to redo.</p>}
      </section>}
    </aside>}

    <p className="selection-live" role="status" aria-live="polite">
      {selectionHistory.announcement || (refused ? 'Cannot combine the selected Product-ID change with Quick View. Safe selections are preserved.' : `${selectionCount} selections. ${candidateStatus === 'resolving' ? 'Updating combined result.' : 'Result ready.'}`)}
    </p>
    {evidenceScope && <EvidenceDialog scope={evidenceScope} candidate={candidate} opener={evidenceOpener} close={() => setEvidenceScope(null)} />}
    {detailsCapability && <CapabilityDetailsDialog capability={detailsCapability} close={() => setDetailsCapability(null)} customize={openCategoryEditor} />}
    {categoryEditorOpen && <CategoryConfigurationDialog
      initial={categoryConfigurationSelection?.configuration ?? completeCategorySidebarConfiguration}
      sidebarSelected={Boolean(sidebarDecision)}
      opener={categoryEditorOpener}
      close={() => setCategoryEditorOpen(false)}
      apply={applyCategoryConfiguration}
    />}
    {showConflict && <ConflictDialog quickCount={quickCount} close={() => setShowConflict(false)} remove={removeIncompatible} inspect={() => setShowConflictEvidence(value => !value)} showingEvidence={showConflictEvidence} />}
  </main>;
}

export function CatalogueShowcase() {
  const [view, setView] = useState<View>(() => new URLSearchParams(location.search).get('view') === 'compare' ? 'compare' : 'landing');
  const navigate = (next: View) => {
    history.pushState({ catalogueView: next }, '', next === 'compare' ? '?mode=showcase&view=compare' : '?mode=showcase');
    setView(next);
  };
  useEffect(() => {
    const listener = (event: PopStateEvent) => setView(event.state?.catalogueView === 'compare' ? 'compare' : 'landing');
    addEventListener('popstate', listener);
    return () => removeEventListener('popstate', listener);
  }, []);
  return view === 'landing' ? <Landing open={() => navigate('compare')} /> : <Comparison exit={() => navigate('landing')} />;
}
