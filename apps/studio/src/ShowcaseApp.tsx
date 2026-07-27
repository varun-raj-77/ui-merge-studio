import { useMemo, useState } from 'react';
import { showcaseManifest, type ShowcaseFeatureId } from './showcaseManifest';

type Stage = 'compare' | 'select' | 'plan' | 'verify' | 'result';
type Selection = Record<ShowcaseFeatureId, boolean>;
const emptySelection: Selection = { navigation: false, activity: false };
const stages: readonly { id: Stage; label: string }[] = [
  { id: 'compare', label: 'Compare' },
  { id: 'select', label: 'Select' },
  { id: 'plan', label: 'Plan' },
  { id: 'verify', label: 'Verify' },
  { id: 'result', label: 'Result' }
];

function ProductPreview({ selection, label, branchFeature, selectable, onToggle }: {
  selection: Selection;
  label: string;
  branchFeature?: ShowcaseFeatureId;
  selectable?: boolean;
  onToggle?: (feature: ShowcaseFeatureId) => void;
}) {
  const navigation = selection.navigation;
  const activity = selection.activity;
  const feature = branchFeature && showcaseManifest.features.find(item => item.id === branchFeature);
  return <div className="product-preview" aria-label={label}>
    <div className="preview-chrome"><span /><span /><span /><b>Sample Support Desk</b></div>
    <div className="support-app">
      <aside className={navigation ? 'has-change' : ''}>
        <div className="support-logo">S</div>
        <nav aria-label={`${label} navigation`}>
          <strong>Workspace</strong><span className="active">Tickets <i>12</i></span><span>Customers</span><span>Reports</span>
        </nav>
        {navigation && <button
          type="button"
          className="feature-control"
          disabled={!selectable}
          aria-pressed={selectable ? selection.navigation : undefined}
          onClick={() => selectable && onToggle?.('navigation')}
        ><b>‹</b><span>Collapse navigation</span></button>}
      </aside>
      <section>
        <header><div><small>Support operations</small><strong>Ticket activity</strong></div><span className="avatar">RK</span></header>
        <main>
          <div className="tickets"><strong>Open tickets</strong>{['Login issue on mobile', 'Update billing address', 'Export is taking too long'].map((ticket, index) =>
            <article className={index === 0 ? 'active' : ''} key={ticket}><i>{index === 0 ? 'AM' : 'JL'}</i><p><b>{ticket}</b><small>{index + 2} min ago</small></p></article>)}</div>
          <div className="activity">
            <header><div><small>#1042 · Priority</small><strong>Login issue on mobile</strong></div><em>Open</em></header>
            {activity && <button
              type="button"
              className="activity-filter feature-control"
              disabled={!selectable}
              aria-pressed={selectable ? selection.activity : undefined}
              onClick={() => selectable && onToggle?.('activity')}
            ><b>All</b><span>Notes</span><span>Replies</span></button>}
            <article><i /><p><b>Rekha replied</b><small>Thanks — I can reproduce this on iOS.</small></p></article>
            <article><i /><p><b>Internal note</b><small>Escalated to the identity team.</small></p></article>
          </div>
        </main>
      </section>
    </div>
    {feature && <div className="change-caption"><span>{feature.branchLabel} · {feature.branch}</span><b>{feature.name}</b></div>}
  </div>;
}

function Landing({ start }: { start: () => void }) {
  const { links } = showcaseManifest;
  return <main className="showcase landing">
    <header className="site-header"><a className="brand" href="/"><b>UM</b><span>UI Merge Studio</span></a><a href={links.source.href}>View source ↗</a></header>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Dependency-aware React feature integration</p>
        <h1>Choose visible features.<br /><em>Trace the code. Verify the result.</em></h1>
        <p>UI Merge Studio compares two running React branches, maps selected UI to source and dependencies, then builds one verified candidate from their shared base.</p>
        <div className="hero-actions"><button className="primary" onClick={start}>Explore the verified demo <span>→</span></button><a href={links.source.href}>View source</a></div>
        <div className="boundary-note"><b>Hosted showcase</b> replays committed evidence. <b>Local engine</b> runs Git, source analysis, candidate generation, and verification.</div>
      </div>
      <div className="hero-preview">
        <ProductPreview selection={{ navigation: true, activity: true }} label="Verified combined result preview" />
        <div className="proof-chip"><b>✓ Verified candidate</b><span>2 selected boundaries · dependencies traced</span></div>
      </div>
    </section>
    <section className="workflow" aria-label="Product workflow">{['Compare branches', 'Select visible features', 'Trace source + dependencies', 'Review the plan', 'Verify one candidate'].map((item, index) => <div key={item}><span>{index + 1}</span><b>{item}</b></div>)}</section>
    <section className="credibility" aria-labelledby="credibility-title"><div><p className="eyebrow">Repository-backed proof</p><h2 id="credibility-title">A visual decision connected to engineering evidence.</h2></div><ul><li>Deterministic candidate generation</li><li>Unrelated edits explicitly excluded</li><li>Source and dependency trace recorded</li><li>Typecheck, tests, and build passed</li><li>Unsafe combinations can be refused</li><li>External React/Vite validation documented</li></ul></section>
  </main>;
}

function Progress({ stage }: { stage: Stage }) {
  const current = stages.findIndex(item => item.id === stage);
  return <nav className="stage-nav" aria-label="Showcase workflow">{stages.map((item, index) => <span key={item.id} aria-current={index === current ? 'step' : undefined} className={index < current ? 'complete' : index === current ? 'current' : ''}><b>{index < current ? '✓' : index + 1}</b>{item.label}</span>)}</nav>;
}

function ResultPreview({ selection }: { selection: Selection }) {
  const count = Number(selection.navigation) + Number(selection.activity);
  return <aside className="result-preview" aria-labelledby="result-preview-title">
    <header><div><p className="eyebrow">Visual preview — not a generated branch</p><h2 id="result-preview-title">Result Preview</h2></div><span aria-live="polite">{count ? `${count} feature${count > 1 ? 's' : ''} selected` : 'Baseline'}</span></header>
    <ProductPreview selection={selection} label="Visual preview of the currently selected feature set" />
    <div className="selection-legend"><span className={selection.navigation ? 'on' : ''}>A · Navigation</span><span className={selection.activity ? 'on' : ''}>B · Activity filters</span></div>
  </aside>;
}

export function ShowcaseApp() {
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState<Stage>('compare');
  const [selected, setSelected] = useState<Selection>(emptySelection);
  const [gateIndex, setGateIndex] = useState(0);
  const features = showcaseManifest.features;
  const selectedFeatures = useMemo(() => features.filter(feature => selected[feature.id]), [selected, features]);
  const valid = selectedFeatures.length > 0;
  const toggle = (id: ShowcaseFeatureId) => setSelected(value => ({ ...value, [id]: !value[id] }));
  const restart = () => { setStarted(false); setStage('compare'); setSelected(emptySelection); setGateIndex(0); };
  const goTo = (next: Stage) => setStage(next);
  if (!started) return <Landing start={() => setStarted(true)} />;

  return <main className="showcase demo">
    <header className="demo-header"><button className="brand" onClick={restart} aria-label="Restart UI Merge Studio showcase"><b>UM</b><span>UI Merge Studio</span></button><Progress stage={stage} /><span className="replay-badge">Hosted evidence replay</span></header>

    {stage === 'compare' && <section className="stage-content">
      <div className="stage-intro"><p className="eyebrow">Stage 1 · Compare</p><h1>One shared baseline. Two unmistakable branch changes.</h1><p>Inspect what each running implementation adds before choosing anything. Selection is disabled in this stage.</p></div>
      <div className="comparison">
        <article><header><span>Shared baseline</span><code>main</code><p>Neither experiment exists yet.</p></header><ProductPreview selection={emptySelection} label="Baseline application before either feature" /></article>
        {features.map(feature => <article className={`branch-card ${feature.id}`} key={feature.id}><header><span>{feature.branchLabel}</span><code>{feature.branch}</code><p>{feature.summary}</p></header><ProductPreview selection={{ ...emptySelection, [feature.id]: true }} branchFeature={feature.id} label={`${feature.branchLabel}: ${feature.name}`} /></article>)}
      </div>
      <div className="stage-action"><p>Shared content remains constant; outlined regions are branch-owned changes.</p><button className="primary" onClick={() => goTo('select')}>I understand the comparison <span>→</span></button></div>
    </section>}

    {stage === 'select' && <section className="stage-content split">
      <div><div className="stage-intro"><p className="eyebrow">Stage 2 · Select</p><h1>Select the visible features to carry forward.</h1><p>Selections are explicit and reversible. The preview updates causally with every choice.</p></div>
        <div className="feature-choices">{features.map(feature => <button className={selected[feature.id] ? 'selected' : ''} aria-pressed={selected[feature.id]} onClick={() => toggle(feature.id)} key={feature.id}><span>{feature.branchLabel} · <code>{feature.branch}</code></span><b>{feature.name}</b><p>{feature.summary}</p><em>{selected[feature.id] ? '✓ Selected — choose to remove' : '+ Add to candidate preview'}</em></button>)}</div>
        <div className="stage-action"><button onClick={() => goTo('compare')}>Back to comparison</button><button className="primary" disabled={!valid} onClick={() => goTo('plan')}>Review integration plan <span>→</span></button></div>
      </div><ResultPreview selection={selected} />
    </section>}

    {stage === 'plan' && valid && <section className="stage-content">
      <div className="stage-intro"><p className="eyebrow">Stage 3 · Integration plan</p><h1>Review the source work before approving it.</h1><p>This plan replays the recorded local analysis for the selected boundaries. It is source integration, not visual compositing.</p></div>
      <div className="plan-summary"><div><small>Common base</small><code>{showcaseManifest.repository.commonBaseCommit.slice(0, 12)}</code></div><div><small>Candidate branch</small><code>{showcaseManifest.repository.candidateBranch}</code></div><div><small>Compatibility</small><b className="compatible">✓ {showcaseManifest.repository.compatibility}</b></div></div>
      <div className="plan-grid">{selectedFeatures.map(feature => <article key={feature.id}><header><span>{feature.branchLabel} · {feature.branch}</span><h2>{feature.name}</h2></header><dl><div><dt>React boundary</dt><dd><code>{feature.boundary}</code></dd></div><div><dt>Source file</dt><dd><code>{feature.sourceFile}</code></dd></div></dl><h3>Supporting files</h3><ul>{feature.supportingFiles.map(file => <li key={file.path}><code>{file.path}</code><span>{file.reason}</span></li>)}</ul><h3>Unrelated changes excluded</h3><ul className="excluded">{feature.excludedFiles.map(file => <li key={file.path}><code>{file.path}</code><span>{file.reason}</span></li>)}</ul></article>)}</div>
      <div className="stage-action"><button onClick={() => goTo('select')}>Back to selections</button><button className="primary" onClick={() => { setGateIndex(0); goTo('verify'); }}>Approve candidate generation <span>→</span></button></div>
    </section>}

    {stage === 'plan' && !valid && <section className="stage-content invalid-state"><h1>No valid integration plan</h1><p>Select at least one evidence-backed feature before opening a plan.</p><button className="primary" onClick={() => goTo('select')}>Back to selections</button></section>}

    {stage === 'verify' && <section className="stage-content verify">
      <div className="stage-intro"><p className="eyebrow">Stage 4 · Verify</p><h1>Inspect each recorded verification gate.</h1><p><b>No checks are running in this browser.</b> The hosted version replays evidence from a previously executed deterministic local run.</p></div>
      <ol className="gate-list">{showcaseManifest.gates.map((gate, index) => <li className={index < gateIndex ? 'reviewed' : index === gateIndex ? 'active' : ''} key={gate.id}><span>{index < gateIndex ? '✓' : index + 1}</span><div><h2>{gate.name}</h2><p>{gate.checks}</p>{index <= gateIndex && <small><b>Recorded status: {gate.status}</b> · {gate.evidenceSource}</small>}</div></li>)}</ol>
      <div className="stage-action"><button onClick={() => goTo('plan')}>Back to plan</button>{gateIndex < showcaseManifest.gates.length - 1 ? <button className="primary" onClick={() => setGateIndex(index => index + 1)}>Inspect next gate <span>→</span></button> : <button className="primary" onClick={() => goTo('result')}>Open verified result <span>→</span></button>}</div>
    </section>}

    {stage === 'result' && <section className="stage-content">
      <div className="stage-intro"><p className="eyebrow">Stage 5 · Result</p><h1>Baseline versus the verified candidate.</h1><p>The final preview contains only the selected features and their traced dependencies.</p></div>
      <div className="final-grid"><article><header><span>Before</span><h2>Shared baseline</h2></header><ProductPreview selection={emptySelection} label="Baseline before selected features" /></article><article className="final"><header><span>After · <code>{showcaseManifest.repository.candidateBranch}</code></span><h2>Verified combined result</h2></header><ProductPreview selection={selected} label="Final result with selected features" /><div className="final-features">{selectedFeatures.map(feature => <span key={feature.id}>✓ {feature.name} · {feature.branch}</span>)}</div></article></div>
      <div className="result-evidence"><article><h2>Included source + dependencies</h2>{selectedFeatures.flatMap(feature => [feature.sourceFile, ...feature.supportingFiles.map(file => file.path)]).map(path => <code key={path}>{path}</code>)}</article><article><h2>Excluded unrelated changes</h2>{selectedFeatures.flatMap(feature => feature.excludedFiles.map(file => file.path)).map(path => <code key={path}>{path}</code>)}</article><article><h2>Verification summary</h2><p>{showcaseManifest.gates.length} recorded gates passed in the deterministic local run.</p><a href={showcaseManifest.links.candidateEvidence.href}>Inspect candidate evidence ↗</a></article></div>
      <nav className="result-actions" aria-label="Result actions"><button onClick={() => goTo('plan')}>Back to plan</button><button onClick={() => goTo('select')}>Back to selections</button><button onClick={restart}>Restart demo</button><a href={showcaseManifest.links.source.href}>View repository ↗</a><a href={showcaseManifest.links.localSetup.href}>Read local setup ↗</a></nav>
      <footer className="public-links">{Object.values(showcaseManifest.links).filter(link => link !== showcaseManifest.links.candidateEvidence).map(link => <a href={link.href} key={link.label}>{link.label}</a>)}</footer>
    </section>}
  </main>;
}
