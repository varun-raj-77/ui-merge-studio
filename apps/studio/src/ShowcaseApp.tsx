import { useState } from 'react';
import { showcaseManifest, type ShowcaseFeatureId } from './showcaseManifest';

type Stage = 'compare' | 'select' | 'plan' | 'result';
type Selection = Record<ShowcaseFeatureId, boolean>;
const none: Selection = { navigation: false, activity: false };
const steps: { id: Stage; label: string }[] = [
  { id: 'compare', label: 'Compare actual builds' }, { id: 'select', label: 'Select features' },
  { id: 'plan', label: 'Review source plan' }, { id: 'result', label: 'Inspect verified candidate' }
];
const artifact = (id: string) => showcaseManifest.artifacts.find(item => item.id === id)!;

function ArtifactFrame({ id, title }: { id: 'baseline' | 'branch-a' | 'branch-b' | 'combined-result'; title?: string }) {
  const item = artifact(id);
  return <div className="artifact-shell">
    <div className="artifact-label"><strong>{title ?? item.label}</strong><code>{item.commit.slice(0, 8)}</code></div>
    <iframe title={`${item.label} actual compiled application`} src={`${item.path}index.html`} loading="eager" sandbox="allow-scripts allow-same-origin" />
  </div>;
}
function Header({ stage, restart }: { stage: Stage; restart: () => void }) {
  const current = steps.findIndex(item => item.id === stage);
  return <header className="showcase-header">
    <button className="brand" onClick={restart} aria-label="Restart"><b>UM</b><span>UI Merge Studio</span></button>
    <nav aria-label="Recorded run stages">{steps.map((item, index) => <span key={item.id} className={index === current ? 'active' : index < current ? 'done' : ''}><i>{index + 1}</i>{item.label}</span>)}</nav>
    <span className="recorded-badge">Recorded local run</span>
  </header>;
}
function Landing({ start }: { start: () => void }) {
  return <main className="showcase landing">
    <header className="landing-nav"><span className="brand"><b>UM</b><span>UI Merge Studio</span></span><span className="recorded-badge">Static inspection · real local evidence</span></header>
    <section className="landing-hero">
      <div>
        <p className="eyebrow">Real compiled applications · recorded engine evidence</p>
        <h1>See two branch features become one verified React build.</h1>
        <p className="lede">Compare real branch builds, select two visible React features, inspect their source and dependency plan, and view the actual verified combined build.</p>
        <div className="actions"><button className="primary" onClick={start}>Inspect the real recorded run <span>→</span></button><a href={showcaseManifest.links.source}>View source</a></div>
        <div className="truth-note"><strong>What is real here</strong><span>All four applications are actual compiled artifacts. Evidence came from a genuine local engine run. This browser is not running Git or tests; local mode performs the live repository operation.</span></div>
      </div>
      <ArtifactFrame id="combined-result" title="Actual verified combined build" />
    </section>
  </main>;
}
function SourceTrace({ feature }: { feature: typeof showcaseManifest.features[number] }) {
  return <article className="trace-card" id={`trace-${feature.id}`} tabIndex={-1}>
    <header><span>{feature.branchLabel}</span><h3>{feature.name}</h3><code>{feature.branch}@{feature.branchCommit.slice(0, 8)}</code></header>
    <dl><div><dt>Selected boundary</dt><dd>{feature.selectedBoundary}</dd></div><div><dt>Analyzed boundary</dt><dd>{feature.analyzedBoundary}</dd></div><div><dt>Source</dt><dd><code>{feature.sourceFile}</code></dd></div></dl>
    <h4>Supporting source and dependencies</h4>
    <ul>{feature.supportingFiles.map(item => <li key={item.path}><code>{item.path}</code><span>{item.reason}</span></li>)}</ul>
    <h4>Unrelated changes excluded</h4>
    <ul className="excluded">{feature.excludedFiles.map(item => <li key={`${item.path}:${item.symbol}`}><code>{item.path}{item.symbol ? `#${item.symbol}` : ''}</code><span>{item.reason}</span></li>)}</ul>
  </article>;
}
export function ShowcaseApp() {
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState<Stage>('compare');
  const [selected, setSelected] = useState<Selection>(none);
  const complete = selected.navigation && selected.activity;
  const restart = () => { setStarted(false); setStage('compare'); setSelected(none); };
  const toggle = (id: ShowcaseFeatureId) => {
    setSelected(value => ({ ...value, [id]: !value[id] }));
    if (stage === 'plan' || stage === 'result') setStage('select');
  };
  if (!started) return <Landing start={() => setStarted(true)} />;
  return <main className="showcase demo">
    <Header stage={stage} restart={restart} />
    {stage === 'compare' && <section className="stage">
      <div className="stage-copy"><p className="eyebrow">Stage 1 — Compare actual builds</p><h1>One exact base. Two independently compiled branches.</h1><p>The labels and annotations belong to the Showcase; every application surface below comes from its Git commit and production Vite build.</p></div>
      <div className="artifact-grid three"><article><p><strong>Baseline</strong> has the support dashboard without either selected experiment.</p><ArtifactFrame id="baseline" /></article><article><p><strong>Branch A</strong> visibly adds collapsible navigation.</p><ArtifactFrame id="branch-a" /></article><article><p><strong>Branch B</strong> visibly adds activity filters.</p><ArtifactFrame id="branch-b" /></article></div>
      <div className="stage-actions"><button className="primary" onClick={() => setStage('select')}>Continue to feature selection →</button></div>
    </section>}
    {stage === 'select' && <section className="stage">
      <div className="stage-copy"><p className="eyebrow">Stage 2 — Select features</p><h1>Select the exact recorded combination.</h1><p>Both repository-backed boundaries are required. Until both are selected, the preview remains the actual baseline—not a pretend generated subset.</p></div>
      <div className="selection-layout"><div className="feature-options">{showcaseManifest.features.map(feature => <button key={feature.id} className={selected[feature.id] ? 'feature selected' : 'feature'} aria-pressed={selected[feature.id]} onClick={() => toggle(feature.id)}><span>{feature.branchLabel} · {feature.branch}</span><strong>{feature.name}</strong><code>{feature.selectedBoundary} · {feature.sourceFile}</code><em>{selected[feature.id] ? 'Selected — remove' : 'Select recorded feature'}</em></button>)}</div>
      <aside className="selection-preview"><header><div><p className="eyebrow">{complete ? 'Exact recorded set complete' : 'Explanatory selection state'}</p><h2>{complete ? 'Actual combined candidate' : 'Actual baseline'}</h2></div><span>{Number(selected.navigation) + Number(selected.activity)}/2 selected</span></header><ArtifactFrame id={complete ? 'combined-result' : 'baseline'} />{!complete && <p className="lock-copy">The recorded two-feature candidate stays locked. No subset candidate was generated for this public proof.</p>}</aside></div>
      <div className="stage-actions"><button onClick={() => setStage('compare')}>Back to comparison</button><button className="primary" disabled={!complete} onClick={() => setStage('plan')}>Review recorded source plan →</button></div>
    </section>}
    {stage === 'plan' && complete && <section className="stage">
      <div className="stage-copy"><p className="eyebrow">Stage 3 — Review source plan</p><h1>Trace each visible feature to selected source and dependencies.</h1><p>Common base <code>{showcaseManifest.repository.commonBaseCommit}</code> · candidate <code>{showcaseManifest.repository.candidateBranch}</code> · compatibility <strong>{showcaseManifest.repository.compatibility}</strong>.</p></div>
      <div className="trace-grid">{showcaseManifest.features.map(feature => <SourceTrace key={feature.id} feature={feature} />)}</div>
      <div className="stage-actions"><button onClick={() => setStage('select')}>Back to selections</button><button className="primary" onClick={() => setStage('result')}>Inspect recorded run →</button></div>
    </section>}
    {stage === 'result' && complete && <section className="stage">
      <div className="stage-copy"><p className="eyebrow">Stage 4 — Inspect verified candidate</p><h1>The actual generated candidate, beside its exact baseline.</h1><p>Candidate commit <code>{showcaseManifest.repository.candidateCommit}</code>. These checks ran during the recorded local candidate-generation run. The hosted site is displaying committed evidence; it is not executing Git or tests in your browser.</p></div>
      <div className="artifact-grid result"><ArtifactFrame id="baseline" title="Actual baseline" /><ArtifactFrame id="combined-result" title="Actual verified combined result" /></div>
      <section className="verification" aria-labelledby="verification-title"><header><p className="eyebrow">Inspect recorded verification</p><h2 id="verification-title">Immutable results from the local run</h2></header><div>{showcaseManifest.verification.map(gate => <details key={gate.id}><summary><span className="pass">Passed</span><strong>{gate.id}</strong><code>exit {gate.exitCode}</code></summary><p>{gate.purpose}</p><pre>{gate.command}</pre><a href={showcaseManifest.links.report}>{gate.evidenceReference} ↗</a></details>)}</div></section>
      <div className="final-trace">{showcaseManifest.features.map(feature => <a key={feature.id} href={`#trace-${feature.id}`} onClick={event => { event.preventDefault(); setStage('plan'); setTimeout(() => document.getElementById(`trace-${feature.id}`)?.focus(), 0); }}><strong>{feature.name}</strong><span>{feature.branch} → {feature.selectedBoundary} → {feature.sourceFile}</span></a>)}</div>
      <div className="stage-actions wrap"><button onClick={() => setStage('plan')}>Back to source plan</button><button onClick={() => setStage('select')}>Back to selections</button><button onClick={restart}>Restart</button><a href={showcaseManifest.links.source}>View source</a><a href={showcaseManifest.links.architecture}>Read architecture</a><a href={showcaseManifest.links.localSetup}>Run locally</a></div>
    </section>}
  </main>;
}
