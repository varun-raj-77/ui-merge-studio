import { useEffect, useState } from 'react';

type Feature = 'navigation' | 'activity';
type View = 'base' | 'navigation' | 'activity' | 'combined';
const checks = ['Dependencies', 'TypeScript', 'Full tests', 'Feature tests', 'Production build'];

function SampleApp({ view, target, selected, onSelect }: { view: View; target?: Feature; selected?: boolean; onSelect?: () => void }) {
  const navigation = view === 'navigation' || view === 'combined';
  const activity = view === 'activity' || view === 'combined';
  return <div className="sample-app">
    <aside className="sample-side"><b>S</b><nav><span className="active">⌂ Tickets</span><span>◫ Customers</span><span>↗ Reports</span></nav>{navigation && <button className={`${target === 'navigation' ? 'target' : ''} ${selected ? 'picked' : ''}`} onClick={onSelect}>‹ Collapse</button>}</aside>
    <section className="sample-content"><header><div><small>Sample Support Desk</small><strong>Ticket activity</strong></div><i>RK</i></header><div className="sample-title"><b>Open tickets</b><button>+ New ticket</button></div>
      <main><div className="ticket-list">{['Login issue on mobile', 'Update billing address', 'Export is taking too long'].map((x, i) => <p className={i ? '' : 'active'} key={x}><i>{i ? 'JL' : 'AM'}</i><span><b>{x}</b><small>{i + 2} min ago</small></span></p>)}</div>
        <article><header><div><small>#1042 · Priority</small><b>Login issue on mobile</b></div><em>Open</em></header>{activity && <button className={`filters ${target === 'activity' ? 'target' : ''} ${selected ? 'picked' : ''}`} onClick={onSelect}><b>All</b><span>Notes</span><span>Replies</span></button>}<p className="event"><i /><span><b>Rekha replied</b><small>Thanks — I can reproduce this on iOS.</small></span></p><p className="event"><i /><span><b>Internal note</b><small>Escalated to the identity team.</small></span></p></article>
      </main>
    </section>
  </div>;
}

function Landing({ launch }: { launch: () => void }) {
  return <main className="sc-landing"><nav className="sc-nav"><a href="#" className="sc-brand"><b>UM</b> UI Merge Studio</a><div><a href="#how">How it works</a><a href="https://github.com/varun-raj-77/ui-merge-studio" target="_blank" rel="noreferrer">GitHub ↗</a></div></nav>
    <section className="sc-hero"><div className="sc-copy"><p className="pill"><i /> Interactive product showcase</p><h1>Choose the best UI.<em>Keep the working code.</em></h1><p>Compare live React branches, select the features you want, and create one dependency-aware result that must pass verification.</p><div><button className="sc-primary" onClick={launch}>Launch Interactive Demo <span>→</span></button><a href="#how">See how it works</a></div><footer><span>✓ No setup required</span><span>✓ Real interactive UI</span><span>✓ Verified sample evidence</span></footer></div>
      <div className="hero-window"><header><span>● ● ●</span><b>Compare branches</b><small>SHOWCASE</small></header><nav><b>✓</b> Compare <i /> <b>2</b> Select <i /> <b>3</b> Combine <i /> <b>4</b> Verify</nav><main><div><strong>Navigation experiment</strong><SampleApp view="navigation" /></div><div><strong>Activity filter experiment</strong><SampleApp view="activity" /></div></main><footer><span><b>2 features</b> ready to combine</span><button>Generate candidate</button></footer><aside>✓ <span><b>All checks passed</b><small>Candidate verified</small></span></aside></div>
    </section>
    <section className="sc-features" id="how"><article><span>01</span><h2>Compare in context</h2><p>Run complete branches side by side, not isolated screenshots or code diffs.</p></article><article><span>02</span><h2>Select visually</h2><p>Click the rendered feature. Source mapping traces it back to its implementation.</p></article><article><span>03</span><h2>Verify before trust</h2><p>Only a candidate that passes configured checks becomes a combined branch.</p></article></section>
    <p className="sc-disclosure">The hosted showcase replays committed evidence from the controlled sample. Repository execution remains local.</p>
  </main>;
}

export function ShowcaseApp() {
  const [launched, setLaunched] = useState(false);
  const [selected, setSelected] = useState<Record<Feature, boolean>>({ navigation: false, activity: false });
  const [phase, setPhase] = useState<'select' | 'ready' | 'verifying' | 'verified'>('select');
  const [progress, setProgress] = useState(-1);
  const [view, setView] = useState<View>('combined');
  const both = selected.navigation && selected.activity;
  useEffect(() => { if (both && phase === 'select') setPhase('ready'); }, [both, phase]);
  useEffect(() => { if (phase !== 'verifying') return; const timer = window.setInterval(() => setProgress(value => { if (value === checks.length - 1) { clearInterval(timer); setPhase('verified'); return value; } return value + 1; }), 380); return () => clearInterval(timer); }, [phase]);
  if (!launched) return <Landing launch={() => setLaunched(true)} />;
  const step = phase === 'verified' ? 4 : phase === 'verifying' ? 4 : both ? 3 : 2;
  return <main className="sc-demo"><header className="demo-bar"><button className="sc-brand" onClick={() => setLaunched(false)}><b>UM</b> UI Merge Studio</button><nav>{['Compare', 'Select', 'Combine', 'Verify'].map((x, i) => <span className={i + 1 < step || phase === 'verified' ? 'done' : i + 1 === step ? 'current' : ''} key={x}><b>{i + 1 < step || phase === 'verified' ? '✓' : i + 1}</b>{x}</span>)}</nav><em>HOSTED SHOWCASE</em></header>
    <section className="demo-heading"><div><small>Built-in sample workspace</small><h1>{phase === 'verified' ? 'Inspect the combined result' : 'Compare two UI experiments'}</h1><p>{phase === 'verified' ? 'Both selected features are present in the previously verified candidate.' : 'Select the highlighted improvement from each branch. Its traced dependencies come with it.'}</p></div><button onClick={() => setLaunched(false)}>Exit demo</button></section>
    {phase !== 'verified' ? <section className="compare-grid">{([['navigation', 'Navigation experiment', 'branch-sidebar', 'Collapsible navigation'], ['activity', 'Activity filter experiment', 'branch-inspector', 'Activity filters']] as const).map(([feature, title, branch, label]) => <article className={selected[feature] ? 'chosen' : ''} key={feature}><header><div><small>Experiment {feature === 'navigation' ? 'A' : 'B'}</small><h2>{title}</h2><code>{branch}</code></div><span>● Live sample</span></header><div className="select-note"><span>{selected[feature] ? '✓ Selected' : 'Click the highlighted control'}</span><b>{label}</b></div><SampleApp view={feature} target={feature} selected={selected[feature]} onSelect={() => setSelected(x => ({ ...x, [feature]: true }))} /></article>)}</section>
    : <section className="result-grid"><aside><small>✓ CANDIDATE VERIFIED</small><h2>Both features.<br />One working result.</h2><p>The controlled engine run created <code>combined-result</code> from the exact shared base. Source branches remained unchanged.</p><div>{checks.map(x => <span key={x}><b>✓</b>{x}<small>Passed</small></span>)}</div><footer><b>Evidence, not a browser simulation</b><p>This hosted step presents the committed report from a real deterministic generation run. Run locally to execute the engine against Git.</p></footer></aside><main><nav>{(['base', 'navigation', 'activity', 'combined'] as View[]).map(x => <button className={view === x ? 'active' : ''} onClick={() => setView(x)} key={x}>{x === 'activity' ? 'Activity filters' : x === 'combined' ? 'Combined result' : x[0].toUpperCase() + x.slice(1)}</button>)}</nav><SampleApp view={view} /></main></section>}
    {phase !== 'verified' && <aside className="action-tray"><div><small>Selected features</small><b>{selected.navigation ? 'Collapsible navigation' : 'Choose navigation'} + {selected.activity ? 'Activity filters' : 'Choose filters'}</b></div>{phase === 'verifying' ? <div className="progress"><i><span style={{ width: `${((progress + 1) / checks.length) * 100}%` }} /></i><b>{progress < 0 ? 'Preparing candidate…' : `Checking: ${checks[progress]}`}</b></div> : <div><small>Compatibility</small><b>{both ? '✓ Ready to combine' : 'Waiting for 2 selections'}</b></div>}<button className="sc-primary" disabled={!both || phase === 'verifying'} onClick={() => { setProgress(-1); setPhase('verifying'); }}>{phase === 'verifying' ? 'Verifying candidate…' : 'Generate verified candidate'} <span>→</span></button></aside>}
  </main>;
}
