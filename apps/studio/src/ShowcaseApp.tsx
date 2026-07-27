import { useEffect, useState } from 'react';

type Feature = 'navigation' | 'activity';
type View = 'base' | 'navigation' | 'activity' | 'combined';
type Phase = 'select' | 'verifying' | 'verified';

const repositoryUrl = 'https://github.com/varun-raj-77/ui-merge-studio';
const evidenceUrl = `${repositoryUrl}/blob/main/docs/evaluation.md#prompt-009-vercel-showcase-mode`;
const localUrl = `${repositoryUrl}#run-the-controlled-demo`;
const checks = ['Dependencies', 'TypeScript', 'Full tests', 'Feature tests', 'Production build'];
const emptySelections: Record<Feature, boolean> = { navigation: false, activity: false };

function SampleApp({
  view,
  target,
  selected,
  onSelect
}: {
  view: View;
  target?: Feature;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const navigation = view === 'navigation' || view === 'combined';
  const activity = view === 'activity' || view === 'combined';
  const selectionLabel = selected ? 'Remove' : 'Select';

  return <div className="sample-app" aria-label={`${view} sample application preview`}>
    <aside className="sample-side">
      <b>S</b>
      <nav aria-label="Illustrative sample navigation">
        <span className="active">⌂ Tickets</span><span>Customers</span><span>Reports</span>
      </nav>
      {navigation && (onSelect
        ? <button
            className={`${target === 'navigation' ? 'target' : ''} ${selected ? 'picked' : ''}`}
            aria-pressed={selected}
            aria-label={`${selectionLabel} collapsible navigation feature`}
            onClick={onSelect}
          >‹ Collapse</button>
        : <span className="sample-control" aria-label="Collapsed navigation shown in this preview">‹ Collapse</span>)}
    </aside>
    <section className="sample-content">
      <header><div><small>Sample Support Desk</small><strong>Ticket activity</strong></div><i>RK</i></header>
      <div className="sample-title"><b>Open tickets</b><span className="sample-action">+ New ticket</span></div>
      <main>
        <div className="ticket-list">{['Login issue on mobile', 'Update billing address', 'Export is taking too long'].map((item, index) =>
          <p className={index ? '' : 'active'} key={item}><i>{index ? 'JL' : 'AM'}</i><span><b>{item}</b><small>{index + 2} min ago</small></span></p>)}
        </div>
        <article>
          <header><div><small>#1042 · Priority</small><b>Login issue on mobile</b></div><em>Open</em></header>
          {activity && (onSelect
            ? <button
                className={`filters ${target === 'activity' ? 'target' : ''} ${selected ? 'picked' : ''}`}
                aria-pressed={selected}
                aria-label={`${selectionLabel} activity filters feature`}
                onClick={onSelect}
              ><b>All</b><span>Notes</span><span>Replies</span></button>
            : <div className="filters sample-control" aria-label="Activity filters shown in this preview"><b>All</b><span>Notes</span><span>Replies</span></div>)}
          <p className="event"><i /><span><b>Rekha replied</b><small>Thanks — I can reproduce this on iOS.</small></span></p>
          <p className="event"><i /><span><b>Internal note</b><small>Escalated to the identity team.</small></span></p>
        </article>
      </main>
    </section>
  </div>;
}

function Landing({ launch }: { launch: () => void }) {
  return <main className="sc-landing">
    <nav className="sc-nav" aria-label="Showcase navigation">
      <a href="/" className="sc-brand"><b>UM</b> UI Merge Studio</a>
      <div><a href="#how">How it works</a><a href={repositoryUrl} target="_blank" rel="noreferrer">GitHub ↗</a></div>
    </nav>
    <section className="sc-hero">
      <div className="sc-copy">
        <p className="pill"><i /> Interactive product showcase</p>
        <h1>Choose the best UI.<em>Keep the working code.</em></h1>
        <p>Compare live React branches, select the features you want, and create one dependency-aware result that must pass verification.</p>
        <div><button className="sc-primary" onClick={launch}>Launch Interactive Demo <span>→</span></button><a href="#how">See how it works</a></div>
        <footer><span>✓ No setup required</span><span>✓ Interactive sample UI</span><span>✓ Committed verification evidence</span></footer>
      </div>
      <div className="hero-window" aria-label="Illustration of the showcase workflow">
        <header><span>● ● ●</span><b>Compare branches</b><small>SHOWCASE</small></header>
        <nav><b>✓</b> Compare <i /> <b>2</b> Select <i /> <b>3</b> Combine <i /> <b>4</b> Verify</nav>
        <main><div><strong>Navigation experiment</strong><SampleApp view="navigation" /></div><div><strong>Activity filter experiment</strong><SampleApp view="activity" /></div></main>
        <footer><span><b>2 features</b> ready to combine</span><span className="sample-cta">Generate candidate</span></footer>
        <aside>✓ <span><b>All checks passed</b><small>Recorded candidate evidence</small></span></aside>
      </div>
    </section>
    <section className="sc-features" id="how">
      <article><span>01</span><h2>Compare in context</h2><p>Run complete branches side by side, not isolated screenshots or code diffs.</p></article>
      <article><span>02</span><h2>Select visually</h2><p>Click the rendered feature. Source mapping traces it back to its implementation.</p></article>
      <article><span>03</span><h2>Verify before trust</h2><p>Only a candidate that passes configured checks becomes a combined branch when the engine runs locally.</p></article>
    </section>
    <p className="sc-disclosure">The hosted showcase replays committed evidence from the controlled sample. It does not run Git or tests. Repository execution remains local.</p>
  </main>;
}

function EvidencePanel({ selected }: { selected: Record<Feature, boolean> }) {
  const selectedLabels = [
    selected.navigation && 'Collapsible navigation',
    selected.activity && 'Activity filters'
  ].filter(Boolean).join(', ');

  return <section className="evidence-panel" aria-labelledby="evidence-title">
    <header><div><small>COMMITTED CONTROLLED-RUN EVIDENCE</small><h2 id="evidence-title">What the hosted result proves</h2></div><span>✓ Passed</span></header>
    <dl>
      <div><dt>Selected features</dt><dd>{selectedLabels}</dd></div>
      <div><dt>Candidate branch</dt><dd><code>combined-result</code></dd></div>
      <div><dt>Verification gates</dt><dd>{checks.join(' · ')}</dd></div>
      <div><dt>Source and dependencies</dt><dd>The recorded source-mapping run traced the navigation and activity-filter selections to their implementation boundaries and included their supported dependencies before candidate verification.</dd></div>
    </dl>
    <p>This is a replay of repository evidence from a previously verified deterministic run. No branch, worktree, test process, or repository mutation is created for this visitor.</p>
    <a href={evidenceUrl} target="_blank" rel="noreferrer">Open repository evaluation evidence ↗</a>
  </section>;
}

export function ShowcaseApp() {
  const [launched, setLaunched] = useState(false);
  const [selected, setSelected] = useState<Record<Feature, boolean>>(emptySelections);
  const [phase, setPhase] = useState<Phase>('select');
  const [progress, setProgress] = useState(-1);
  const [view, setView] = useState<View>('combined');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const both = selected.navigation && selected.activity;

  useEffect(() => {
    if (phase !== 'verifying') return;
    const timer = window.setInterval(() => setProgress(value => {
      if (value === checks.length - 1) {
        clearInterval(timer);
        setPhase('verified');
        setView('combined');
        return value;
      }
      return value + 1;
    }), 120);
    return () => clearInterval(timer);
  }, [phase]);

  const restart = () => {
    setSelected(emptySelections);
    setPhase('select');
    setProgress(-1);
    setView('combined');
    setEvidenceOpen(false);
    setLaunched(false);
  };

  const backToSelections = () => {
    setPhase('select');
    setProgress(-1);
    setEvidenceOpen(false);
  };

  const toggleFeature = (feature: Feature) => {
    setSelected(current => ({ ...current, [feature]: !current[feature] }));
  };

  if (!launched) return <Landing launch={() => setLaunched(true)} />;

  const step = phase === 'verified' || phase === 'verifying' ? 4 : both ? 3 : 2;
  return <main className="sc-demo">
    <header className="demo-bar">
      <button className="sc-brand" onClick={restart} aria-label="UI Merge Studio home; clear current demo"><b>UM</b> UI Merge Studio</button>
      <nav aria-label="Showcase progress">{['Compare', 'Select', 'Combine', 'Verify'].map((label, index) =>
        <span className={index + 1 < step || phase === 'verified' ? 'done' : index + 1 === step ? 'current' : ''} key={label}>
          <b>{index + 1 < step || phase === 'verified' ? '✓' : index + 1}</b>{label}
        </span>)}
      </nav>
      <em>HOSTED EVIDENCE REPLAY</em>
    </header>
    <section className="demo-heading">
      <div><small>Built-in sample workspace</small><h1>{phase === 'verified' ? 'Inspect the combined result' : 'Compare two UI experiments'}</h1>
        <p>{phase === 'verified'
          ? 'Inspecting the preview tabs does not change your selected candidate.'
          : 'Select or remove the highlighted improvement from each branch. Both are required to generate.'}</p>
      </div>
      <button onClick={restart}>Exit demo</button>
    </section>

    {phase !== 'verified'
      ? <section className="compare-grid">{([
          ['navigation', 'Navigation experiment', 'branch-sidebar', 'Collapsible navigation'],
          ['activity', 'Activity filter experiment', 'branch-inspector', 'Activity filters']
        ] as const).map(([feature, title, branch, label]) =>
          <article className={selected[feature] ? 'chosen' : ''} key={feature}>
            <header><div><small>Experiment {feature === 'navigation' ? 'A' : 'B'}</small><h2>{title}</h2><code>{branch}</code></div><span>● Interactive sample</span></header>
            <div className="select-note"><span>{selected[feature] ? '✓ Selected — click again to remove' : 'Click the highlighted control to select'}</span><b>{label}</b></div>
            <SampleApp view={feature} target={feature} selected={selected[feature]} onSelect={() => toggleFeature(feature)} />
          </article>)}
        </section>
      : <>
          <section className="result-grid">
            <aside><small>✓ PREVIOUSLY VERIFIED CANDIDATE</small><h2>Both features.<br />One working result.</h2>
              <p>The committed controlled engine run created <code>combined-result</code> from the exact shared base. The hosted page is displaying that evidence; it is not creating a branch now.</p>
              <div>{checks.map(check => <span key={check}><b>✓</b>{check}<small>Passed</small></span>)}</div>
              <footer><b>Evidence replay, not cloud execution</b><p>Git operations and verification run only in local engine mode.</p></footer>
            </aside>
            <main>
              <div className="inspection-label"><b>Preview inspection</b><span>These tabs only change what you inspect. Candidate selections remain unchanged.</span></div>
              <nav aria-label="Inspect candidate variants">{(['base', 'navigation', 'activity', 'combined'] as View[]).map(item =>
                <button className={view === item ? 'active' : ''} aria-pressed={view === item} onClick={() => setView(item)} key={item}>
                  {item === 'activity' ? 'Activity source' : item === 'navigation' ? 'Navigation source' : item === 'combined' ? 'Combined result' : 'Base'}
                </button>)}
              </nav>
              <SampleApp view={view} />
            </main>
          </section>
          <nav className="result-actions" aria-label="Combined result actions">
            <button className="sc-primary" onClick={backToSelections}>Back to selections</button>
            <button onClick={restart}>Restart demo</button>
            <button aria-expanded={evidenceOpen} aria-controls="showcase-evidence" onClick={() => setEvidenceOpen(open => !open)}>View evidence</button>
            <a href={repositoryUrl} target="_blank" rel="noreferrer">View source on GitHub ↗</a>
            <a href={localUrl} target="_blank" rel="noreferrer">Run locally ↗</a>
          </nav>
          {evidenceOpen && <div id="showcase-evidence"><EvidencePanel selected={selected} /></div>}
        </>}

    {phase !== 'verified' && <aside className="action-tray" aria-label="Candidate selection summary">
      <div><small>Selected features</small><b>{selected.navigation ? 'Collapsible navigation' : 'Choose navigation'} + {selected.activity ? 'Activity filters' : 'Choose filters'}</b></div>
      {phase === 'verifying'
        ? <div className="progress" aria-live="polite"><i><span style={{ width: `${((progress + 1) / checks.length) * 100}%` }} /></i><b>{progress < 0 ? 'Loading recorded verification…' : `Replaying verified gate: ${checks[progress]}`}</b><small>No tests are running in this browser.</small></div>
        : <div><small>Selection set</small><b>{both ? '✓ Ready to replay candidate evidence' : 'Waiting for 2 selections'}</b></div>}
      <button className="sc-primary" disabled={!both || phase === 'verifying'} onClick={() => { setProgress(-1); setPhase('verifying'); }}>
        {phase === 'verifying' ? 'Replaying verification evidence…' : 'Generate candidate'} <span>→</span>
      </button>
    </aside>}
  </main>;
}
