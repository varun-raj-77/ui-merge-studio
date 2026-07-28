import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { showcaseManifest, type ShowcaseFeatureId } from './showcaseManifest';
import { showcaseRefusalEvidence as refusalEvidence } from './showcaseRefusal';

type Version = 'baseline' | 'branch-a' | 'branch-b' | 'combined-result';
interface LabState { activeVersion: Version; selectedFocusMode: boolean; selectedActivityLens: boolean; sourceEvidenceOpen: boolean; candidateCreated: boolean; verificationOpen: boolean; combinedResultVisible: boolean; unsafeScenarioActive: boolean; refusalVisible: boolean; }
const initialLab: LabState = { activeVersion: 'branch-a', selectedFocusMode: false, selectedActivityLens: false, sourceEvidenceOpen: false, candidateCreated: false, verificationOpen: false, combinedResultVisible: false, unsafeScenarioActive: false, refusalVisible: false };
const labUrl = '?mode=showcase&view=lab';
const versionOptions = [['branch-a','Version A'],['branch-b','Version B'],['baseline','Baseline']] as const;
const versionIds: Version[] = ['baseline', 'branch-a', 'branch-b', 'combined-result'];
function normalizeLabState(value: unknown): LabState {
  if (!value || typeof value !== 'object') return initialLab;
  const candidate = value as Partial<LabState>;
  const selectedFocusMode = candidate.selectedFocusMode === true;
  const selectedActivityLens = candidate.selectedActivityLens === true;
  const candidateCreated = selectedFocusMode && selectedActivityLens && candidate.candidateCreated === true;
  const requestedVersion = versionIds.includes(candidate.activeVersion as Version) ? candidate.activeVersion as Version : initialLab.activeVersion;
  const activeVersion = candidateCreated ? 'combined-result' : requestedVersion === 'combined-result' ? initialLab.activeVersion : requestedVersion;
  const combinedResultVisible = candidateCreated;
  const unsafeScenarioActive = combinedResultVisible && candidate.unsafeScenarioActive === true;
  return {
    activeVersion,
    selectedFocusMode,
    selectedActivityLens,
    sourceEvidenceOpen: candidate.sourceEvidenceOpen === true,
    candidateCreated,
    verificationOpen: combinedResultVisible && candidate.verificationOpen === true,
    combinedResultVisible,
    unsafeScenarioActive,
    refusalVisible: unsafeScenarioActive && candidate.refusalVisible === true
  };
}
const artifact = (id: Version) => showcaseManifest.artifacts.find(item => item.id === id)!;
const artifactReplayUrl = (id: Version) => {
  const params = new URLSearchParams({ ticket: 'TCK-102', 'ums-artifact': `${artifact(id).path}index.html` });
  return `/tickets?${params}`;
};
const feature = (id: ShowcaseFeatureId) => showcaseManifest.features.find(item => item.id === id)!;
const external = { target: '_blank', rel: 'noreferrer noopener' } as const;
const concepts = {
  navigation: { publicName: 'Focus Mode', title: 'Collapsible workspace navigation', benefit: 'Gives support agents more room to work without losing navigation.', version: 'Version A', accent: 'coral' },
  activity: { publicName: 'Activity Lens', title: 'Filterable ticket activity', benefit: 'Lets agents isolate notes, status updates, and customer messages.', version: 'Version B', accent: 'violet' }
} as const;
function LandingVisual() {
  return <div className="convergence-visual" aria-label="Version A and Version B converge into one verified combined result">
    <div className="branch-card branch-a-card"><span>A</span><div><small>Version A</small><strong>Focus Mode</strong></div></div>
    <div className="branch-card branch-b-card"><span>B</span><div><small>Version B</small><strong>Activity Lens</strong></div></div>
    <div className="converge-lines" aria-hidden="true"><i /><i /><b /></div>
    <div className="result-card"><div className="mini-support"><aside><b>SD</b><span /><span /><span /></aside><main><header /><div className="mini-columns"><section /><section><i /><i /><i /></section></div></main></div><footer><span>combined-result</span><strong>Verified ✓</strong></footer></div>
  </div>;
}

function Landing({ openLab }: { openLab: () => void }) {
  const focus = feature('navigation'); const activity = feature('activity');
  return <main className="showcase landing-page">
    <nav className="public-nav"><a className="wordmark" href="#top" aria-label="UI Merge Studio home"><span>UM</span>UI Merge Studio</a><div><a href="#how">How it works</a><button onClick={openLab}>Open Merge Lab</button></div></nav>
    <section className="hero" id="top"><div className="hero-copy"><p className="overline">Visual branch integration for React</p><h1>Take the best UI from every branch. <em>Ship one verified result.</em></h1><p>Run multiple React implementations, click the features you prefer, and generate one tested combined branch.</p><div className="hero-actions"><button className="cta" onClick={openLab}>Open the Merge Lab <span aria-hidden="true">↗</span></button><a {...external} href={showcaseManifest.links.source}>View GitHub</a></div><p className="proof-line">Local React repositories <i /> Deterministic source tracing <i /> Safe refusal</p><small>Hosted demo: interactive replay of a real verified local run.</small></div><LandingVisual /></section>
    <section className="story" id="how"><header><p className="overline">One causal chain</p><h2>Visible choices become verified source.</h2></header>
      <article className="story-row"><div><span>01</span><h3>Choose visible features, not filenames.</h3><p>Select the navigation behavior you want directly from a running branch. The system already knows which rendered boundary produced it.</p></div><div className="selection-demo"><div className="ui-boundary"><span>Changed UI boundary</span><strong>Collapsible navigation</strong><span className="selection-status">✓ Selected</span></div><div className="trace-line">Rendered UI <b>→</b> {focus.selectedBoundary} <b>→</b> source</div></div></article>
      <article className="story-row reverse"><div><span>02</span><h3>Carry the source that feature needs.</h3><p>The selected component travels with evidence-backed hooks, styles, types, imports, and focused tests—not an entire commit.</p></div><div className="dependency-demo"><strong>{focus.sourceFile}</strong>{focus.supportingFiles.slice(0, 4).map(item => <span key={item.path}>↳ {item.path.split('/').at(-1)}</span>)}</div></article>
      <article className="story-row"><div><span>03</span><h3>Exclude changes you did not choose.</h3><p>Each source branch intentionally contains unrelated edits. The verified candidate leaves them behind.</p></div><div className="exclusion-demo"><div><small>Version A excluded</small><strong>Operations Command Center heading</strong></div><div><small>Version B excluded</small><strong>Newest-first ticket sorting</strong></div></div></article>
      <article className="story-row reverse"><div><span>04</span><h3>Verify the result—or refuse it.</h3><p>A safe tool proves compatible combinations and stops when branch contracts no longer agree.</p></div><div className="outcome-demo"><div className="success"><b>✓</b><span><strong>{showcaseManifest.verification.length} recorded gates</strong><small>Combined result verified</small></span></div><div className="refused"><b>!</b><span><strong>Unsafe preview pairing refused</strong><small>Candidate planning never started</small></span></div></div></article>
    </section>
    <section className="landing-final"><p className="overline">See the proof</p><h2>Choose two features. Follow every source decision.</h2><button className="cta light" onClick={openLab}>Try the live Merge Lab <span aria-hidden="true">→</span></button></section>
  </main>;
}

function Preview({ version }: { version: Version }) {
  const item = artifact(version); const isA = version === 'branch-a'; const isB = version === 'branch-b';
  return <div className={`active-preview ${isA ? 'accent-a' : isB ? 'accent-b' : version === 'combined-result' ? 'accent-combined' : ''}`}>
    <header><div><i /><span>{item.label}</span></div><code>{item.commit.slice(0, 8)}</code></header>
    <div className="preview-stage"><iframe key={version} title={`${item.label} compiled Support Desk application`} src={artifactReplayUrl(version)} data-artifact-path={`${item.path}index.html`} loading="eager" sandbox="allow-scripts allow-same-origin" tabIndex={version === 'combined-result' ? 0 : -1} />{(isA || isB) && <div className={`boundary-callout ${isA ? 'boundary-a' : 'boundary-b'}`}><span>{isA ? 'Changed in Version A' : 'Changed in Version B'}</span><strong>{isA ? feature('navigation').selectedBoundary : feature('activity').selectedBoundary}</strong></div>}{version === 'combined-result' && <><span className="result-tag tag-a">Focus Mode · Version A</span><span className="result-tag tag-b">Activity Lens · Version B</span></>}</div>
  </div>;
}

function SourceTrace({ id, open, onOpenChange }: { id: ShowcaseFeatureId; open: boolean; onOpenChange: (open: boolean) => void }) {
  const evidence = feature(id); const copy = concepts[id];
  return <section className={`source-trace ${copy.accent}`} aria-label={`${copy.publicName} source evidence`}><div className="trace-origin"><span>Selected UI</span><strong>{copy.title}</strong></div><div className="trace-connector" aria-hidden="true">→</div><div className="trace-source"><span>Mapped React source</span><strong>{evidence.selectedBoundary}</strong><small>{evidence.supportingFiles.length} required supporting files</small></div><details open={open} onToggle={event => { if (event.currentTarget.open !== open) onOpenChange(event.currentTarget.open); }}><summary>View exact source evidence</summary><dl><div><dt>Selected source</dt><dd><code>{evidence.sourceFile}</code></dd></div><div><dt>Analyzed boundary</dt><dd>{evidence.analyzedBoundary}</dd></div><div><dt>Branch evidence</dt><dd><code>{evidence.branch}@{evidence.branchCommit.slice(0, 8)}</code></dd></div></dl><ul>{evidence.supportingFiles.map(item => <li key={item.path}><code>{item.path}</code><span>{item.reason}</span></li>)}</ul></details><p>Evidence replayed from a verified local run.</p></section>;
}

function CompositionTray({ state, onBuild }: { state: LabState; onBuild: () => void }) {
  const complete = state.selectedFocusMode && state.selectedActivityLens;
  return <aside className="composition-tray"><header><span>Your combined app</span><strong>{Number(state.selectedFocusMode) + Number(state.selectedActivityLens)} / 2</strong></header><div className={state.selectedFocusMode ? 'tray-item selected' : 'tray-item'}><b>{state.selectedFocusMode ? '✓' : '1'}</b><span><strong>Focus Mode</strong><small>{state.selectedFocusMode ? 'From Version A' : 'Select from Version A'}</small></span></div><div className={state.selectedActivityLens ? 'tray-item selected' : 'tray-item'}><b>{state.selectedActivityLens ? '✓' : '2'}</b><span><strong>Activity Lens</strong><small>{state.selectedActivityLens ? 'From Version B' : 'Select from Version B'}</small></span></div><button className="cta" disabled={!complete} onClick={onBuild}>Build combined result</button>{!complete && <p>Select one visible feature from each version.</p>}</aside>;
}

function IntegrationProof({ headingRef }: { headingRef: RefObject<HTMLHeadingElement | null> }) {
  return <section className="integration-proof" aria-labelledby="integration-title"><header><p className="overline">Recorded candidate replay</p><h2 id="integration-title" ref={headingRef} tabIndex={-1}>Selected source in. Unrelated edits out.</h2><p>Replaying the verified candidate-generation result.</p></header><div className="integration-grid"><div className="integration-tree"><div className="tree-root"><b>main</b><small>{showcaseManifest.repository.commonBaseCommit.slice(0, 8)}</small></div>{showcaseManifest.features.map(item => <div className={`tree-branch ${item.id}`} key={item.id}><span>{concepts[item.id].publicName}</span><strong>{item.sourceFile}</strong>{item.supportingFiles.slice(0, 4).map(file => <small key={file.path}>↳ {file.path}</small>)}</div>)}<div className="tree-result"><b>combined-result</b><small>{showcaseManifest.repository.candidateCommit.slice(0, 8)}</small></div></div><div className="integration-steps">{['Shared base confirmed','Selected source mapped','Required source set recorded','Unrelated changes excluded','Verified candidate created'].map((step, index) => <div key={step}><b>✓</b><span><small>0{index + 1}</small><strong>{step}</strong></span></div>)}</div></div>
    <div className="included-excluded"><article><header><span>Version A · Focus Mode</span></header><div className="included"><b>Included</b><strong>Collapsible navigation + {feature('navigation').supportingFiles.length} supporting files</strong></div><div className="excluded"><b>Excluded</b><strong>Operations Command Center heading</strong></div></article><article><header><span>Version B · Activity Lens</span></header><div className="included"><b>Included</b><strong>Activity filters + {feature('activity').supportingFiles.length} supporting files</strong></div><div className="excluded"><b>Excluded</b><strong>Newest-first ticket sorting</strong><small>src/utils/sortTickets.ts</small></div></article></div>
  </section>;
}

function Verification({ open, toggle }: { open: boolean; toggle: () => void }) {
  const supported = showcaseManifest.verification.filter(gate => ['typecheck', 'tests', 'focused-feature-tests', 'production-build'].includes(gate.id));
  return <section className="verification-panel"><header><div><p className="overline">Recorded evidence</p><h2>Verified combined result</h2></div><button aria-expanded={open} onClick={toggle}>{open ? 'Hide evidence' : 'View full verification evidence'}</button></header><div className="verification-summary">{supported.map(gate => <div key={gate.id}><b>✓</b><span><strong>{gate.id === 'production-build' ? 'Production build' : gate.id === 'focused-feature-tests' ? 'Feature tests' : gate.id === 'tests' ? 'Full test suite' : 'TypeScript'}</strong><small>Passed</small></span></div>)}</div>{open && <div className="verification-details">{supported.map(gate => <details key={gate.id}><summary><strong>{gate.id}</strong><span>exit {gate.exitCode}</span></summary><p>{gate.purpose}</p><code>{gate.command}</code><small>{gate.evidenceReference}</small></details>)}</div>}</section>;
}

function UnsafeChallenge({ state, update }: { state: LabState; update: (patch: Partial<LabState>) => void }) {
  if (!state.unsafeScenarioActive) return <section className="unsafe-invite"><div><p className="overline">Safety is a feature</p><h2>A safe merge tool must also know when to stop.</h2><p>Try the fixture’s intentionally incompatible route branch after the successful result.</p></div><button onClick={() => update({ unsafeScenarioActive: true })}>Try an unsafe combination</button></section>;
  return <section className="unsafe-panel"><header><span>Optional safety challenge · separately tested fixture</span><button onClick={() => update({ unsafeScenarioActive: false, refusalVisible: false })}>Close</button></header><div className="contract-comparison"><div><small>Focus Mode preview</small><strong>{refusalEvidence.leftContract}</strong></div><b>≠</b><div><small>Incompatible route preview</small><strong>{refusalEvidence.rightContract}</strong></div></div>{!state.refusalVisible ? <button className="danger-action" onClick={() => update({ refusalVisible: true })}>Check compatibility</button> : <div className="refusal" role="alert"><span>Preview synchronization refused</span><h2>No candidate was attempted or created.</h2><p>{refusalEvidence.reason}</p><dl><div><dt>Affected route</dt><dd><code>{refusalEvidence.route}</code></dd></div><div><dt>Safe next step</dt><dd>{refusalEvidence.next}</dd></div></dl><details><summary>View refusal evidence</summary><code>{refusalEvidence.evidence}</code></details></div>}</section>;
}

function MergeLab({ exit }: { exit: () => void }) {
  const [state, setState] = useState<LabState>(() => normalizeLabState(history.state?.umsLab));
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusResultOnRender = useRef(false);
  const update = (patch: Partial<LabState>, replace = false) => {
    const next = normalizeLabState({ ...state, ...patch });
    history[replace ? 'replaceState' : 'pushState']({ ...(history.state ?? {}), umsLab: next }, '', labUrl);
    setState(next);
  };
  const restart = () => {
    history.replaceState({ ...(history.state ?? {}), umsLab: initialLab }, '', labUrl);
    setState(initialLab);
  };
  useEffect(() => {
    if (!history.state?.umsLab) history.replaceState({ ...(history.state ?? {}), umsLab: initialLab }, '', labUrl);
  }, []);
  useEffect(() => {
    const listener = (event: PopStateEvent) => {
      if (event.state?.umsLab) setState(normalizeLabState(event.state.umsLab));
    };
    addEventListener('popstate', listener);
    return () => removeEventListener('popstate', listener);
  }, []);
  useEffect(() => {
    if (state.candidateCreated && focusResultOnRender.current) {
      resultHeadingRef.current?.focus();
      focusResultOnRender.current = false;
    }
  }, [state.candidateCreated]);
  const activeFeature = state.activeVersion === 'branch-a' ? 'navigation' : state.activeVersion === 'branch-b' ? 'activity' : null;
  const selected = activeFeature === 'navigation' ? state.selectedFocusMode : activeFeature === 'activity' ? state.selectedActivityLens : false;
  const activateVersion = (id: Version) => update({ activeVersion: id, sourceEvidenceOpen: false });
  const selectActive = () => activeFeature === 'navigation'
    ? update({ selectedFocusMode: !state.selectedFocusMode, sourceEvidenceOpen: false })
    : activeFeature === 'activity'
      ? update({ selectedActivityLens: !state.selectedActivityLens, sourceEvidenceOpen: false })
      : undefined;
  const moveTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % versionOptions.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + versionOptions.length) % versionOptions.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = versionOptions.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = versionOptions[nextIndex][0];
    activateVersion(next);
    requestAnimationFrame(() => document.getElementById(`version-tab-${next}`)?.focus());
  };
  const buildResult = () => {
    focusResultOnRender.current = true;
    update({ candidateCreated: true, activeVersion: 'combined-result', combinedResultVisible: true });
  };
  const versionTitle = state.activeVersion === 'branch-a' ? concepts.navigation : state.activeVersion === 'branch-b' ? concepts.activity : null;
  const complete = state.selectedFocusMode && state.selectedActivityLens;
  return <main className="showcase merge-lab"><header className="lab-header"><button className="wordmark" onClick={exit}><span>UM</span>UI Merge Studio</button><div><small>Interactive replay</small><strong>Merge Lab</strong></div><button onClick={restart}>Restart lab</button></header>
    <section className="lab-intro"><div><p className="overline">Support Desk · verified run</p><h1>Build your preferred interface.</h1><p>Switch versions, choose one visible feature from each, then inspect exactly what enters the combined branch.</p></div><div className="lab-progress"><span className={state.selectedFocusMode ? 'done' : 'active'}>1. Focus Mode</span><span className={state.selectedActivityLens ? 'done' : state.selectedFocusMode ? 'active' : ''}>2. Activity Lens</span><span className={state.candidateCreated ? 'done' : complete ? 'active' : ''}>3. Combined result</span></div></section>
    {!state.candidateCreated && <section className="lab-workspace"><div className="preview-column"><div className="version-tabs" role="tablist" aria-label="Support Desk versions">{versionOptions.map(([id,label], index) => <button id={`version-tab-${id}`} role="tab" aria-selected={state.activeVersion === id} aria-controls="active-preview-panel" tabIndex={state.activeVersion === id ? 0 : -1} key={id} onClick={() => activateVersion(id)} onKeyDown={event => moveTab(event, index)}>{label}<small>{id === 'branch-a' ? 'Focus Mode' : id === 'branch-b' ? 'Activity Lens' : 'Shared starting point'}</small></button>)}</div><div id="active-preview-panel" role="tabpanel" aria-labelledby={`version-tab-${state.activeVersion}`}><Preview version={state.activeVersion} /></div></div>
      <aside className="decision-column">{versionTitle && activeFeature ? <><p className="version-label">{versionTitle.version}</p><h2>{versionTitle.publicName}</h2><h3>{versionTitle.title}</h3><p>{versionTitle.benefit}</p><button className={`feature-select ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={selectActive}>{selected ? `✓ Selected from ${versionTitle.version}` : `Select ${versionTitle.publicName}`}</button>{selected && <SourceTrace id={activeFeature} open={state.sourceEvidenceOpen} onOpenChange={open => update({ sourceEvidenceOpen: open })} />}</> : state.activeVersion === 'baseline' ? <div className="baseline-note"><p className="version-label">Shared baseline</p><h2>Same ticket. Same starting point.</h2><p>Both versions begin from this exact application and commit.</p><code>{showcaseManifest.repository.commonBaseCommit.slice(0, 12)}</code></div> : <div className="combined-note"><p className="version-label">Generated candidate</p><h2>One app. Both selected features.</h2><p>The real compiled candidate contains Focus Mode and Activity Lens without either unrelated branch edit.</p><button onClick={() => document.getElementById('combined-result')?.scrollIntoView({ behavior: 'smooth' })}>Inspect result below</button></div>}<CompositionTray state={state} onBuild={buildResult} /></aside>
    </section>}
    {state.candidateCreated && <IntegrationProof headingRef={resultHeadingRef} />}
    {state.combinedResultVisible && <><section className="combined-section" id="combined-result"><header><p className="overline">The payoff</p><h2>One app. Both selected features.</h2><p>Collapse the navigation and filter ticket activity inside the actual generated application.</p></header><Preview version="combined-result" /><p className="excluded-note">✓ Unrelated branch changes were excluded.</p></section><Verification open={state.verificationOpen} toggle={() => update({ verificationOpen: !state.verificationOpen })} /><section className="handoff"><header><p className="overline">Developer handoff</p><h2>Ready for the developer.</h2></header><div className="handoff-grid"><div><span>Branch</span><code>{showcaseManifest.repository.candidateBranch}</code></div><div><span>Included</span><strong>Focus Mode · Activity Lens · dependencies · tests</strong></div><div><span>Excluded</span><strong>Heading experiment · newest-first sorting</strong></div><div><span>Verified</span><strong>{showcaseManifest.verification.filter(gate => gate.result === 'passed').length} recorded gates passed</strong></div></div><div className="handoff-actions"><a {...external} href={artifactReplayUrl('combined-result')}>Open combined app</a><a {...external} href={showcaseManifest.links.report}>View integration report</a><a {...external} href={showcaseManifest.links.architecture}>Explore architecture</a><button onClick={restart}>Restart Merge Lab</button></div></section><UnsafeChallenge state={state} update={update} /></>}
    <section className="technical-section"><header><p className="overline">For senior engineers</p><h2>How UI Merge Studio works</h2></header><div className="architecture-flow">{['Launch isolated React previews','Synchronize supported fixture state','Map rendered UI to React source','Resolve static dependencies','Construct from the shared base','Reconcile selected changes','Run deterministic verification','Refuse unsafe combinations'].map((item,index) => <div key={item}><b>{index + 1}</b><span>{item}</span></div>)}</div><div className="truth-boundary"><article><h3>Deterministic source of truth</h3><p>Git history, shared-base analysis, runtime source metadata, ASTs, import graphs, compilation, tests, and generated evidence.</p></article><article><h3>Optional future assistance</h3><p>AI may explain evidence or suggest a manual path. It does not decide the deterministic candidate.</p></article></div><details><summary>Current limitations</summary><p>Bounded to conventional React + TypeScript + Vite repositories and supported static syntax. It is not a universal semantic merge engine, cloud Git service, or autonomous coding agent.</p><a {...external} href={showcaseManifest.links.limitations}>Read all documented limitations</a></details></section>
  </main>;
}

export function ShowcaseApp() {
  const routeIsLab = () => new URLSearchParams(location.search).get('view') === 'lab';
  const [labOpen, setLabOpen] = useState(routeIsLab);
  useEffect(() => {
    const listener = () => setLabOpen(routeIsLab());
    addEventListener('popstate', listener);
    return () => removeEventListener('popstate', listener);
  }, []);
  const openLab = useCallback(() => {
    history.pushState({ umsLab: initialLab }, '', labUrl);
    setLabOpen(true);
  }, []);
  const exit = useCallback(() => {
    history.pushState({}, '', '?mode=showcase');
    setLabOpen(false);
  }, []);
  return labOpen ? <MergeLab exit={exit} /> : <Landing openLab={openLab} />;
}
