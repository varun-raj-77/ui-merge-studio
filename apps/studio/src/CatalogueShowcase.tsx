import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { catalogueEvidence, combinationOutcome, recordedRefusal, type CatalogueFeatureId } from './catalogueEvidence';

type View = 'landing' | 'compare';
type BranchView = 'branch-a' | 'branch-b';
type Category = 'All' | 'Audio' | 'Desk' | 'Travel';
const products = [
  { id: 'p-101', name: 'Arc Headphones', category: 'Audio' as Category, price: '$249', added: 1, tone: 'coral' },
  { id: 'p-102', name: 'Studio Speaker', category: 'Audio' as Category, price: '$189', added: 4, tone: 'violet' },
  { id: 'p-103', name: 'Task Lamp', category: 'Desk' as Category, price: '$96', added: 2, tone: 'lime' },
  { id: 'p-104', name: 'Carry Case', category: 'Travel' as Category, price: '$72', added: 5, tone: 'blue' },
  { id: 'p-105', name: 'Desk Stand', category: 'Desk' as Category, price: '$118', added: 3, tone: 'sand' }
];
const github = 'https://github.com/varun-raj-77/ui-merge-studio';

function ProductCard({ product, quickView, onOpen }: { product: typeof products[number]; quickView?: boolean; onOpen?: () => void }) {
  return <article className="catalogue-card"><div className={`product-art ${product.tone}`} aria-hidden="true"><i /></div><div><small>{product.category}</small><h4>{product.name}</h4><strong>{product.price}</strong>{quickView && <button onClick={onOpen}>Quick view <span aria-hidden="true">↗</span></button>}</div></article>;
}

function CataloguePreview({ mode, selected, onToggle }: { mode: 'baseline' | BranchView | 'combined'; selected: Set<CatalogueFeatureId>; onToggle?: (id: CatalogueFeatureId) => void }) {
  const hasSidebar = mode === 'branch-a' || mode === 'combined';
  const hasInspector = mode === 'branch-b' || mode === 'combined';
  const hasPromotion = mode === 'branch-a';
  const hasInventorySummary = mode === 'branch-b';
  const [collapsed, setCollapsed] = useState(false);
  const [category, setCategory] = useState<Category>('All');
  const [activeProduct, setActiveProduct] = useState<typeof products[number] | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (activeProduct) closeButton.current?.focus(); }, [activeProduct]);
  const closeInspector = () => { setActiveProduct(null); requestAnimationFrame(() => lastTrigger.current?.focus()); };
  const onInspectorKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeInspector(); };
  const visible = products.filter(product => category === 'All' || product.category === category);
  const selectable = mode === 'branch-a' || mode === 'branch-b';
  return <section className={`catalogue-preview ${mode}`} aria-label={`${mode === 'baseline' ? 'Baseline' : mode === 'branch-a' ? 'Branch A' : mode === 'branch-b' ? 'Branch B' : 'Combined result'} product catalogue`}>
    <header><div><span className="catalogue-mark">PC</span><div><b>Product Catalogue</b><small>Controlled sample data</small></div></div><span>{visible.length} products</span></header>
    {hasPromotion && <div className="promotion-region"><div><small>Seasonal edit</small><strong>Workspace essentials, 20% off</strong></div></div>}
    <div className={`catalogue-body ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {hasSidebar && <aside className={`change-region sidebar-region ${selected.has('category-sidebar') ? 'selected' : ''}`} data-highlight="category-sidebar" aria-label="Category sidebar">
        <button className="collapse-control" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expand category sidebar' : 'Collapse category sidebar'}>{collapsed ? '›' : '‹'}</button>
        {!collapsed && <><strong>Categories</strong><div role="group" aria-label="Product categories">{(['All','Audio','Desk','Travel'] as Category[]).map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>{selectable && <button className="region-select" aria-pressed={selected.has('category-sidebar')} onClick={() => onToggle?.('category-sidebar')}>{selected.has('category-sidebar') ? 'Selected' : 'Select category sidebar'}</button>}</>}
      </aside>}
      <main><div className="catalogue-heading"><div><small>{hasInventorySummary ? '5 products ready' : 'Spring collection'}</small><h3>Objects for focused work.</h3></div></div>
        <div className="product-grid">{visible.map(product => <ProductCard key={product.id} product={product} quickView={hasInspector} onOpen={(event?: unknown) => { lastTrigger.current = (event as { currentTarget?: HTMLButtonElement })?.currentTarget ?? document.activeElement as HTMLButtonElement; setActiveProduct(product); }} />)}</div>
      </main>
    </div>
    {hasInspector && <div className={`inspector-linked-region ${selected.has('quick-view') ? 'selected' : ''}`} data-highlight="quick-view"><span>Linked change: card triggers + inspector</span>{selectable && <button className="region-select" aria-pressed={selected.has('quick-view')} onClick={() => onToggle?.('quick-view')}>{selected.has('quick-view') ? 'Selected' : 'Select quick-view inspector'}</button>}</div>}
    {activeProduct && <aside className="quick-view-drawer" role="dialog" aria-modal="true" aria-label={`${activeProduct.name} quick view`} onKeyDown={onInspectorKey}><button ref={closeButton} onClick={closeInspector} aria-label="Close quick view">×</button><div className={`product-art ${activeProduct.tone}`} aria-hidden="true"><i /></div><small>{activeProduct.category}</small><h3>{activeProduct.name}</h3><strong>{activeProduct.price}</strong><p>A focused product view with specifications, availability, and purchase context.</p></aside>}
  </section>;
}

function Landing({ open }: { open: () => void }) {
  return <main className="catalogue-site"><nav className="catalogue-nav"><a href="#top" className="catalogue-wordmark"><span>UM</span>UI Merge Studio</a><div><a href="#local">Run locally</a><a href={github} target="_blank" rel="noreferrer noopener">GitHub</a></div></nav><section className="catalogue-hero" id="top"><div><p className="eyebrow">Visual branch integration for React</p><h1>Compare React branches. Keep the best parts.</h1><p>Run implementations side by side, select rendered features, trace them to source, and create one verified branch.</p><div className="catalogue-actions"><button onClick={open}>Try interactive sample</button><a href="#local">Run locally</a><a href={github} target="_blank" rel="noreferrer noopener">View GitHub</a></div><small>Interactive sample — no Git operations run in your browser.</small></div><div className="hero-catalogue"><div className="hero-branch"><span>Baseline</span><b>Product grid</b></div><div className="hero-branch a"><span>Branch A</span><b>Category sidebar</b></div><div className="hero-branch b"><span>Branch B</span><b>Quick view</b></div><div className="hero-result"><span>Selected features</span><b>One verified result</b></div></div></section><section className="compact-proof"><article><span>01</span><b>Select rendered changes</b><p>Choose visible regions—not commits or filenames.</p></article><article><span>02</span><b>Trace exact source</b><p>Review the declaration and required dependencies.</p></article><article><span>03</span><b>Generate or refuse</b><p>Replay proven results; stop before unsafe mutation.</p></article></section><section className="local-setup" id="local"><p className="eyebrow">Real local engine</p><h2>Use your own React repository.</h2><p>The hosted sample cannot access your files. Local mode launches branches in isolated worktrees, maps rendered elements to source, generates a candidate from the common base, and runs verification.</p><pre><code>npm ci{'\n'}npm run dev{'\n'}# open http://127.0.0.1:4310/?mode=local</code></pre></section></main>;
}

function EvidenceDrawer({ selected }: { selected: CatalogueFeatureId[] }) {
  if (!selected.length) return <aside className="evidence-drawer empty"><strong>Selection evidence</strong><p>Select a highlighted region to reveal its source and dependencies.</p></aside>;
  return <aside className="evidence-drawer"><strong>Selection evidence</strong>{selected.map(id => { const item = catalogueEvidence[id]; return <details key={id} open><summary>{item.name}<span>{item.branch}</span></summary><dl><div><dt>React declaration</dt><dd>{item.declaration}</dd></div><div><dt>Source</dt><dd><code>{item.sourceFile}</code></dd></div><div><dt>Why included</dt><dd>{item.inclusionReason}</dd></div><div><dt>Excluded sibling</dt><dd>{item.siblingExclusion}</dd></div></dl><ul>{item.dependencies.map(dependency => <li key={dependency.path}><code>{dependency.path}</code><small>{dependency.reason}</small></li>)}</ul></details>; })}</aside>;
}

function Comparison({ exit }: { exit: () => void }) {
  const [branch, setBranch] = useState<BranchView>('branch-a');
  const [selected, setSelected] = useState<CatalogueFeatureId[]>([]);
  const [showChanges, setShowChanges] = useState(true);
  const [result, setResult] = useState<'idle' | 'combined'>('idle');
  const [creationState, setCreationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [creationError, setCreationError] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState('');
  const [showEvidence, setShowEvidence] = useState(false);
  const [showRefusal, setShowRefusal] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const creationLock = useRef(false);
  const complete = selected.includes('category-sidebar') && selected.includes('quick-view');
  const displayName = (id: CatalogueFeatureId) => id === 'category-sidebar' ? 'Category sidebar' : 'Product quick view';
  const resetResult = () => { setResult('idle'); setCreationState('idle'); setCreationError(null); };
  const toggle = (id: CatalogueFeatureId) => {
    if (creationLock.current) return;
    resetResult();
    setSelected(current => {
      const removing = current.includes(id);
      setSelectionMessage(removing ? `Removed ${displayName(id)}` : `Selected ${displayName(id)} from ${catalogueEvidence[id].branch}`);
      return removing ? current.filter(item => item !== id) : [...current, id];
    });
  };
  const missingGuidance = complete
    ? 'Both required features are selected. The combined version is ready to create.'
    : selected.includes('category-sidebar')
      ? 'Next, select Product quick view from Branch B.'
      : selected.includes('quick-view')
        ? 'Next, select Category sidebar from Branch A.'
        : 'Select Category sidebar from Branch A and Product quick view from Branch B.';
  const createCombined = async () => {
    if (!complete || creationLock.current) return;
    creationLock.current = true;
    setCreationState('loading'); setCreationError(null); setResult('idle');
    try {
      await new Promise(resolve => setTimeout(resolve, 80));
      if (combinationOutcome(selected) !== 'recorded-safe') throw new Error('The recorded evidence no longer matches these selections.');
      setResult('combined'); setCreationState('success');
    } catch (error) {
      setCreationState('error');
      setCreationError(error instanceof Error ? error.message : 'The combined version could not be displayed. Please try again.');
    } finally {
      creationLock.current = false;
    }
  };
  useEffect(() => {
    if (result !== 'combined') return;
    resultRef.current?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
    resultRef.current?.focus();
  }, [result]);
  return <main className={`comparison-shell ${showChanges ? 'show-changes' : ''}`}><header className="comparison-header"><button onClick={exit} className="catalogue-wordmark"><span>UM</span>UI Merge Studio</button><span>Interactive sample — no Git operations run in your browser.</span><a href="#local" onClick={exit}>Run locally</a></header><section className="comparison-intro"><div><p className="eyebrow">Product Catalogue comparison</p><h1>Choose the interface you want.</h1><p>Hover over highlighted changes and select the parts you want.</p></div><div className="comparison-controls"><button aria-pressed={showChanges} onClick={() => setShowChanges(value => !value)}>Show changed regions</button><div role="tablist" aria-label="Focused branch"><button role="tab" aria-selected={branch === 'branch-a'} onClick={() => setBranch('branch-a')}>Branch A</button><button role="tab" aria-selected={branch === 'branch-b'} onClick={() => setBranch('branch-b')}>Branch B</button></div></div></section>
    <ol className="workflow-steps" aria-label="Showcase workflow"><li><b>1</b> Compare branches</li><li><b>2</b> Select both features</li><li><b>3</b> Review selections</li><li><b>4</b> Create combined version</li></ol>
    <section className="comparison-grid"><div><header><b>Baseline</b><small>Always visible</small></header><CataloguePreview mode="baseline" selected={new Set()} /></div><div><header><b>{branch === 'branch-a' ? 'Branch A' : 'Branch B'}</b><small>Independent preview</small></header><CataloguePreview mode={branch} selected={new Set(selected)} onToggle={toggle} /></div></section>
    <p className="selection-announcement" role="status" aria-live="polite">{selectionMessage}</p>
    <section className={`selection-workbench ${showEvidence ? 'evidence-open' : ''}`}><div className="selection-tray"><header><div><strong>Review your selections</strong><small>{selected.length} of 2 required features selected</small></div><button disabled={!selected.length || creationState === 'loading'} onClick={() => { setSelected([]); resetResult(); setSelectionMessage('Selections cleared'); }}>Clear</button></header>{!selected.length ? <p>No features selected yet.</p> : <ul>{selected.map(id => <li key={id}><span><b>{displayName(id)}</b><small>{catalogueEvidence[id].branch}</small></span><button disabled={creationState === 'loading'} onClick={() => toggle(id)} aria-label={`Remove ${displayName(id)}`}>×</button></li>)}</ul>}<p id="combination-guidance" className={complete ? 'combination-guidance ready' : 'combination-guidance'}>{missingGuidance}</p><button className="evaluate-button" aria-describedby="combination-guidance" aria-busy={creationState === 'loading'} disabled={!complete || creationState === 'loading' || creationState === 'success'} onClick={createCombined}>{creationState === 'loading' ? 'Creating combined version…' : creationState === 'success' ? 'Combined version created' : 'Create combined version'}</button>{creationError && <p className="action-error" role="alert">{creationError}</p>}<div className="secondary-actions"><button aria-expanded={showEvidence} aria-controls="technical-evidence" disabled={!selected.length} onClick={() => setShowEvidence(value => !value)}>{showEvidence ? 'Hide technical evidence' : 'View technical evidence'}</button><button aria-expanded={showRefusal} aria-controls="refusal-example" onClick={() => setShowRefusal(value => !value)}>{showRefusal ? 'Hide refusal example' : 'View refusal example'}</button></div><small>This hosted sample replays committed engine results. Run UI Merge Studio locally to evaluate your own repository.</small></div>{showEvidence && <div id="technical-evidence"><EvidenceDrawer selected={selected} /></div>}</section>
    {result === 'combined' && <section ref={resultRef} tabIndex={-1} className="outcome-panel success-outcome" aria-labelledby="combined-result-heading"><header><p className="eyebrow">Combined version created</p><h2 id="combined-result-heading">Combined result</h2><p className="success-message" role="status" aria-live="polite">Success. Your combined version includes both selected features.</p><p>Included: Category sidebar from Branch A and Product quick view from Branch B. Excluded: Promotional banner and inventory summary.</p></header><CataloguePreview mode="combined" selected={new Set(selected)} /></section>}
    {showRefusal && <section id="refusal-example" className="outcome-panel refusal-outcome" aria-labelledby="refusal-heading"><p className="eyebrow">Separate refusal example</p><h2 id="refusal-heading">UI Merge Studio refused an unsafe Product-ID combination.</h2><p>Product quick view depends on the existing string-based Product ID contract. The incompatible example replaces that shared contract, so automatic integration would be unsafe.</p><p>{recordedRefusal.reason}</p><strong>No broken candidate branch was generated.</strong><details><summary>View refusal evidence</summary><p><code>{recordedRefusal.contractPath}#{recordedRefusal.contractSymbol}</code></p><p>{recordedRefusal.manualResolution}</p></details></section>}
  </main>;
}

export function CatalogueShowcase() {
  const [view, setView] = useState<View>(() => new URLSearchParams(location.search).get('view') === 'compare' ? 'compare' : 'landing');
  const navigate = (next: View) => { history.pushState({ catalogueView: next }, '', next === 'compare' ? '?mode=showcase&view=compare' : '?mode=showcase'); setView(next); };
  useEffect(() => { const listener = (event: PopStateEvent) => setView(event.state?.catalogueView === 'compare' ? 'compare' : 'landing'); addEventListener('popstate', listener); return () => removeEventListener('popstate', listener); }, []);
  return view === 'compare' ? <Comparison exit={() => navigate('landing')} /> : <Landing open={() => navigate('compare')} />;
}
