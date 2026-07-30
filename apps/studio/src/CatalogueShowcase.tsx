import { useEffect, useMemo, useReducer, useRef, useState, type RefObject } from 'react';
import type { PublicArtifact, PublicCandidate } from '../../../packages/showcase-evidence/src/schema';
import { catalogueManifest, evidenceForScope, recordedRefusal, resolveCatalogueCandidate } from './catalogueEvidence';
import { catalogueProduct } from './catalogueProducts';
import {
  candidateKey,
  emptyShowcaseSelection,
  hasQuickViewSelection,
  scopeFromRuntime,
  scopeKey,
  showcaseSelectionReducer,
  type ShowcaseScope
} from './showcaseSelection';
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

type View = 'landing' | 'compare';
type ComparisonPreview = 'branch-a' | 'branch-b';
type WorkspaceState = 'comparison' | 'combined';
type EvidenceTab = 'source' | 'dependencies' | 'verification';
const github = 'https://github.com/varun-raj-77/ui-merge-studio';
const focusableSelector = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

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
  onToggle?: (scope: string) => void;
  onContextMessage: (message: PreviewContextMessage) => void;
}

function contextualControlLabel(scope: string, selected: boolean) {
  if (selected) return 'Added';
  return scope === 'category-sidebar' ? 'Add sidebar' : 'Add Quick View';
}

function installContextualControls(
  frame: HTMLIFrameElement | null,
  enabled: boolean,
  selectedScopes: string[],
  onToggle?: (scope: string) => void
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
        position: fixed;
        display: inline-flex; align-items: center; gap: 5px;
        min-height: 30px; padding: 6px 9px;
        border: 1px solid #34342f; border-radius: 9px;
        background: #1c1d19; color: #fff;
        box-shadow: 0 7px 20px #17191426;
        font: 800 11px/1 system-ui, sans-serif;
        opacity: .9; pointer-events: auto; cursor: pointer;
        transition: opacity 180ms ease, transform 180ms ease;
      }
      .ums-context-add:hover, .ums-context-add:focus-visible { opacity: 1; transform: translateY(-1px); }
      [data-ums-scope][data-ums-selected] {
        outline: 2px solid #715ee8; outline-offset: 3px;
        box-shadow: 0 0 0 6px #715ee818;
      }
      .ums-context-add[data-selected] {
        border-color: #715ee8; background: #715ee8;
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
    activeScopes.add(scope);
    element.toggleAttribute('data-ums-selected', selected.has(scope));
    let control = layer!.querySelector<HTMLButtonElement>(`.ums-context-add[data-scope="${CSS.escape(scope)}"]`);
    if (!control) {
      control = document.createElement('button');
      control.type = 'button';
      control.className = 'ums-context-add';
      control.dataset.scope = scope;
      layer!.append(control);
    }
    const isSelected = selected.has(scope);
    const text = `${isSelected ? '✓' : '+'} ${contextualControlLabel(scope, isSelected)}`;
    if (control.textContent !== text) control.textContent = text;
    control.toggleAttribute('data-selected', isSelected);
    control.setAttribute('aria-label', `${isSelected ? 'Remove' : 'Add'} ${element.dataset.umsLabel ?? scope}`);
    const rect = element.getBoundingClientRect();
    const frameWidth = document.defaultView?.innerWidth ?? 0;
    const frameHeight = document.defaultView?.innerHeight ?? 0;
    const offset = scope === 'category-sidebar' ? 126 : 112;
    control.style.top = `${Math.max(8, rect.top + 9)}px`;
    control.style.left = `${Math.max(8, Math.min(frameWidth - offset, rect.right - offset))}px`;
    control.hidden = rect.bottom < 0 || rect.top > frameHeight;
    control.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      onToggle?.(scope);
    };
  });
  layer?.querySelectorAll<HTMLButtonElement>('.ums-context-add').forEach(control => {
    if (!activeScopes.has(control.dataset.scope ?? '')) control.remove();
  });
  const reposition = () => {
    layer?.querySelectorAll<HTMLButtonElement>('.ums-context-add').forEach(control => {
      const scope = control.dataset.scope;
      const element = scope
        ? document.querySelector<HTMLElement>(`[data-ums-scope="${CSS.escape(scope)}"]`)
        : null;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const frameWidth = document.defaultView?.innerWidth ?? 0;
      const frameHeight = document.defaultView?.innerHeight ?? 0;
      const offset = scope === 'category-sidebar' ? 126 : 112;
      control.style.top = `${Math.max(8, rect.top + 9)}px`;
      control.style.left = `${Math.max(8, Math.min(frameWidth - offset, rect.right - offset))}px`;
      control.hidden = rect.bottom < 0 || rect.top > frameHeight;
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
  onToggle,
  onContextMessage
}: ArtifactFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const scopeObserver = useRef<MutationObserver | null>(null);
  const toggleRef = useRef(onToggle);
  const contextMessageRef = useRef(onContextMessage);
  const contextRef = useRef(context);
  const selectedScopesRef = useRef(selectedScopes);
  const applySequence = useRef(0);
  toggleRef.current = onToggle;
  contextMessageRef.current = onContextMessage;
  contextRef.current = context;
  selectedScopesRef.current = selectedScopes;
  const postState = () => {
    frame.current?.contentWindow?.postMessage({
      type: 'ums-showcase-mode',
      mode: 'play',
      showChanges: false,
      selectedScopes
    }, location.origin);
    installContextualControls(frame.current, selectionEnabled, selectedScopes, scope => toggleRef.current?.(scope));
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
    postState();
    const body = frame.current?.contentDocument?.body;
    if (!selectionEnabled || !body) return;
    scopeObserver.current = new MutationObserver(() => {
      installContextualControls(frame.current, true, selectedScopesRef.current, scope => toggleRef.current?.(scope));
    });
    scopeObserver.current.observe(body, { childList: true, subtree: true });
  };

  useEffect(() => {
    postState();
    const repositionFrame = requestAnimationFrame(postState);
    const settledFrame = setTimeout(postState, 100);
    return () => {
      cancelAnimationFrame(repositionFrame);
      clearTimeout(settledFrame);
    };
  }, [selectionEnabled, selectedScopes.join(','), visibilitySignal]);
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
  useEffect(() => () => scopeObserver.current?.disconnect(), []);
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

function PreviewPanel({ preview, title, subtitle, artifact, active, context, selectedScopes, onToggle, onContextMessage }: {
  preview: ComparisonPreview;
  title: string;
  subtitle: string;
  artifact: PublicArtifact;
  active: boolean;
  context: PreviewContext;
  selectedScopes: string[];
  onToggle: (scope: string) => void;
  onContextMessage: (message: PreviewContextMessage) => void;
}) {
  return <article className={`workspace-preview ${active ? 'mobile-active' : ''}`} data-view={preview}>
    <header><div><span className={`preview-dot ${preview}`} /><div><h2>{title}</h2><p>{subtitle}</p></div></div></header>
    <div className="artifact-stage">
      <ArtifactFrame
        artifact={artifact}
        title={`${title} live application`}
        previewId={preview}
        context={context}
        selectedScopes={selectedScopes}
        selectionEnabled
        visibilitySignal={active}
        onToggle={onToggle}
        onContextMessage={onContextMessage}
      />
    </div>
  </article>;
}

function SelectionChip({ scope, openEvidence, remove }: {
  scope: ShowcaseScope;
  openEvidence: (scope: ShowcaseScope, opener: HTMLElement) => void;
  remove: (scope: ShowcaseScope) => void;
}) {
  return <span className="selection-chip">
    <span>{scopeLabel(scope)}</span>
    <button onClick={event => openEvidence(scope, event.currentTarget)} aria-label={`Evidence for ${scopeLabel(scope)}`}>i</button>
    <button onClick={() => remove(scope)} aria-label={`Remove ${scopeLabel(scope)}`}>×</button>
  </span>;
}

function Comparison({ exit }: { exit: () => void }) {
  const [selection, dispatch] = useReducer(showcaseSelectionReducer, emptyShowcaseSelection);
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
  const evidenceOpener = useRef<HTMLElement | null>(null);
  const lastContextRevision = useRef<Record<string, number>>({});
  const desiredKey = candidateKey(selection);
  const refused = selection.incompatibleProductId && hasQuickViewSelection(selection);
  const selectedScopeKeys = selection.scopes.map(scopeKey);
  const branchAArtifact = catalogueManifest.artifacts.find(item => item.kind === 'branch-a')!;
  const branchBArtifact = catalogueManifest.artifacts.find(item => item.kind === 'branch-b')!;
  const quickCount = selection.scopes.filter(scope => scope.featureId === 'product-quick-view').length;
  const selectionCount = selection.scopes.length + (selection.incompatibleProductId ? 1 : 0);

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
    if (refused || candidate.key === desiredKey) return;
    setCandidateStatus('resolving');
    const timer = setTimeout(() => {
      setCandidate(resolveCatalogueCandidate(desiredKey));
      setCandidateStatus('ready');
    }, 180);
    return () => clearTimeout(timer);
  }, [candidate.key, desiredKey, refused]);

  const removeScope = (scope: ShowcaseScope) => {
    dispatch({ type: 'remove-scope', scope });
    if (scope.featureId === 'product-quick-view' && quickCount === 1 && selection.incompatibleProductId) {
      dispatch({ type: 'toggle-incompatible' });
      setShowConflict(false);
    }
  };
  const toggleRuntimeScope = (branch: ComparisonPreview, raw: string) => {
    const scope = scopeFromRuntime(raw, catalogueManifest.productIds);
    if (!scope || scope.branch !== branch) return;
    const alreadySelected = selection.scopes.some(item => scopeKey(item) === scopeKey(scope));
    const removingLastQuickView = scope.featureId === 'product-quick-view'
      && alreadySelected
      && quickCount === 1;
    dispatch({ type: 'toggle-scope', scope });
    if (!alreadySelected && window.innerWidth <= 700) {
      setDockExpanded(false);
    }
    if (removingLastQuickView && selection.incompatibleProductId) {
      dispatch({ type: 'toggle-incompatible' });
      setShowConflict(false);
    }
  };
  const openEvidence = (scope: ShowcaseScope, opener: HTMLElement) => {
    evidenceOpener.current = opener;
    setEvidenceScope(scope);
  };
  const clearSelections = () => {
    dispatch({ type: 'clear' });
    setShowConflict(false);
  };
  const removeIncompatible = () => {
    dispatch({ type: 'toggle-incompatible' });
    setShowConflict(false);
    setShowConflictEvidence(false);
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
  const activeContextNotices = workspaceState === 'combined'
    ? contextNotices.combined ?? []
    : (contextNotices[mobilePreview] ?? []).filter(notice => notice.code !== 'unsupported-quick-view');

  return <main
    className={`comparison-shell ${selectionCount ? 'has-selection' : ''}`}
    data-context-ready-count={Object.keys(previewCapabilities).length}
    data-context-category={previewContext.catalogue.categoryId}
    data-context-product={previewContext.catalogue.selectedProductId ?? ''}
    data-context-quick-view={previewContext.catalogue.quickViewOpen}
  >
    <header className="workspace-commandbar">
      <button onClick={exit} className="catalogue-wordmark"><span>UM</span><i>UI Merge Studio</i></button>
      <span className="workspace-name">Product Catalogue example</span>
      {workspaceState === 'comparison' && <button
        className={selection.incompatibleProductId ? 'experimental active' : 'experimental'}
        disabled={!hasQuickViewSelection(selection)}
        aria-pressed={selection.incompatibleProductId}
        onClick={() => dispatch({ type: 'toggle-incompatible' })}
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
        <PreviewPanel preview="branch-a" title="Version A" subtitle="Category navigation" artifact={branchAArtifact} active={mobilePreview === 'branch-a'} context={previewContext} selectedScopes={selectedScopeKeys} onToggle={scope => toggleRuntimeScope('branch-a', scope)} onContextMessage={handleContextMessage} />
        <PreviewPanel preview="branch-b" title="Version B" subtitle="Product Quick View" artifact={branchBArtifact} active={mobilePreview === 'branch-b'} context={previewContext} selectedScopes={selectedScopeKeys} onToggle={scope => toggleRuntimeScope('branch-b', scope)} onContextMessage={handleContextMessage} />
      </section>
    </section>
    <section className="result-workspace" hidden={workspaceState !== 'combined'}>
      <header className="result-header">
        <button onClick={() => setWorkspaceState('comparison')}>← Back to comparison</button>
        <div><span>Combined result</span><h1>Built from {selection.scopes.length} selection{selection.scopes.length === 1 ? '' : 's'}</h1></div>
        <div className="result-chips" aria-label="Selections used">{scopeSummary.map(label => <span key={label}>✓ {label}</span>)}</div>
      </header>
      <div className="combined-stage">
        <ArtifactFrame artifact={candidate.artifact} title="Combined result application" previewId="combined" context={previewContext} selectedScopes={[]} onContextMessage={handleContextMessage} />
        {candidateStatus === 'resolving' && <div className="candidate-loading" role="status">Updating result…</div>}
      </div>
    </section>

    {activeContextNotices.length > 0 && <aside className="context-notice" role="status" aria-live="polite">
      {activeContextNotices.map(notice => <p key={`${notice.code}:${notice.message}`}>{notice.message}</p>)}
    </aside>}

    {selectionCount > 0 && <aside className={`selection-dock ${dockExpanded ? 'expanded' : 'collapsed'} ${refused ? 'has-conflict' : ''}`} aria-label="Current selections">
      <button className="dock-toggle" onClick={() => setDockExpanded(value => !value)} aria-expanded={dockExpanded}>
        <strong>{selectionCount} selection{selectionCount === 1 ? '' : 's'}</strong><span>{dockExpanded ? 'Minimize' : 'Review'}</span>
      </button>
      <div className="selection-chips">
        {selection.scopes.map(scope => <SelectionChip key={scopeKey(scope)} scope={scope} openEvidence={openEvidence} remove={removeScope} />)}
        {selection.incompatibleProductId && <span className="selection-chip conflict-chip">
          <span>Product-ID change <b>Conflict</b></span>
          <button onClick={() => setShowConflict(true)} aria-label="Evidence for Product-ID conflict">i</button>
          <button onClick={removeIncompatible} aria-label="Remove incompatible Product-ID change">×</button>
        </span>}
      </div>
      <button className="clear-selections" onClick={clearSelections}>Clear</button>
      {workspaceState === 'combined'
        ? <button className="view-combined" onClick={() => setWorkspaceState('comparison')}>Back to comparison</button>
        : <button className={refused ? 'review-conflict' : 'view-combined'} onClick={viewCombined}>{refused ? 'Review conflict' : 'View combined'}</button>}
    </aside>}

    <p className="selection-live" role="status" aria-live="polite">
      {refused ? 'Cannot combine the selected Product-ID change with Quick View. Safe selections are preserved.' : `${selectionCount} selections. ${candidateStatus === 'resolving' ? 'Updating combined result.' : 'Result ready.'}`}
    </p>
    {evidenceScope && <EvidenceDialog scope={evidenceScope} candidate={candidate} opener={evidenceOpener} close={() => setEvidenceScope(null)} />}
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
