import type { PublicCandidate } from '../../../packages/showcase-evidence/src/schema';

export const githubUrl = 'https://github.com/varun-raj-77/ui-merge-studio';
export const localSetupUrl = `${githubUrl}#run-locally`;

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><i /><i /></span>;
}

export function PublicNav({ open }: { open: () => void }) {
  return <nav className="public-nav" aria-label="Public navigation">
    <a href="#top" className="public-wordmark"><BrandMark /><strong>UI Merge Studio</strong></a>
    <div>
      <button onClick={open}>Interactive example</button>
      <a href="#how-it-works">How it works</a>
      <a href={githubUrl} target="_blank" rel="noreferrer noopener">GitHub</a>
    </div>
  </nav>;
}

function HeroProductDemo() {
  return <div className="hero-product-demo" aria-label="Illustration of two source versions converging into one verified result">
    <header>
      <span><i />Controlled proof</span>
      <code>foundation: main</code>
    </header>
    <div className="hero-demo-previews">
      <article>
        <div className="hero-demo-title"><span>A</span><div><small>Version A</small><strong>branch-sidebar</strong></div></div>
        <div className="hero-mini-app sidebar-app">
          <i className="mini-sidebar"><b /><b /><b /></i>
          <i className="mini-content"><b /><span><em /><em /></span></i>
          <label><span>Selected</span>Category sidebar</label>
        </div>
      </article>
      <article>
        <div className="hero-demo-title"><span>B</span><div><small>Version B</small><strong>branch-inspector</strong></div></div>
        <div className="hero-mini-app inspector-app">
          <i className="mini-content"><b /><span><em /><em /></span></i>
          <i className="mini-inspector"><b /><b /><b /></i>
          <label><span>Selected</span>Quick view</label>
        </div>
      </article>
    </div>
    <ol className="hero-causality" aria-label="Selected source becomes a verified candidate">
      {['Selected', 'Source', 'Slice', 'Candidate', 'Verified'].map((label, index) => <li key={label} className={index < 3 ? 'complete' : index === 3 ? 'active' : ''}>
        <i>{index < 3 ? '✓' : index + 1}</i><span>{label}</span>
      </li>)}
    </ol>
    <div className="hero-result-line">
      <span><i />A</span><span><i />B</span><b aria-hidden="true">→</b><strong><i />Combined result <em>Verified</em></strong>
    </div>
  </div>;
}

export function PublicHero({ open }: { open: () => void }) {
  return <>
    <PublicNav open={open} />
    <section className="public-hero" id="top">
      <div className="public-hero-copy">
        <p className="eyebrow">Visual integration for React</p>
        <h1><span>Compare two implementations.</span><span>Click the parts you prefer.</span><span>Create one verified branch.</span></h1>
        <p className="public-hero-summary">Run parallel React implementations, select preferred visible features, and let UI Merge trace the required source changes while excluding unrelated work.</p>
        <div className="public-hero-actions">
          <button onClick={open}>Try the interactive example <span aria-hidden="true">↘</span></button>
          <a href="#how-it-works">How it works</a>
          <a href={localSetupUrl} target="_blank" rel="noreferrer noopener">Run locally</a>
        </div>
        <div className="public-truth-line" role="note" aria-label="Hosted showcase boundary">
          <span><i />Controlled, recorded proof</span>
          <span>No repository access in the browser</span>
        </div>
      </div>
      <HeroProductDemo />
    </section>
  </>;
}

function HowItWorks() {
  const steps = [
    ['01', 'Run', 'UI Merge starts supported React/Vite branches in isolated local worktrees.'],
    ['02', 'Select', 'Rendered React boundaries connect a visible click to server-owned source identity.'],
    ['03', 'Integrate', 'A dependency-aware plan includes required changes and refuses unsupported combinations.'],
    ['04', 'Verify', 'The candidate is typechecked, tested where available, built, and relaunched.']
  ];
  return <section className="public-how" id="how-it-works" aria-labelledby="how-title">
    <header><p className="eyebrow">How it works locally</p><h2 id="how-title">A visible decision with an evidence trail.</h2></header>
    <ol>{steps.map(([number, title, copy]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol>
  </section>;
}

function ProductClarity() {
  return <section className="public-clarity" aria-labelledby="clarity-title">
    <div><p className="eyebrow">Product boundary</p><h2 id="clarity-title">Visual decision and verification for parallel React implementations.</h2></div>
    <dl>
      <div><dt>UI Merge is</dt><dd>A precise way to select rendered features, trace their source requirements, and verify one combined branch.</dd></div>
      <div><dt>UI Merge is not</dt><dd>An IDE, Git client, AI coding agent, or universal semantic merge engine.</dd></div>
    </dl>
  </section>;
}

function LocalRunCTA() {
  return <section className="public-local-cta" aria-labelledby="local-title">
    <div>
      <p className="eyebrow">The real workspace stays local</p>
      <h2 id="local-title">Try it on your repository.</h2>
      <p>UI Merge Studio runs locally so your Git repositories, worktrees, preview processes, and generated branches stay on your machine.</p>
    </div>
    <div className="local-support">
      <span>Supported today</span>
      <p><b>React</b><b>TypeScript</b><b>Vite</b><b>Local Git</b></p>
    </div>
    <div className="local-actions">
      <a className="primary-action" href={localSetupUrl} target="_blank" rel="noreferrer noopener">Clone and run locally</a>
      <a href={githubUrl} target="_blank" rel="noreferrer noopener">View GitHub</a>
    </div>
  </section>;
}

export function PublicProductGuide() {
  return <div className="public-guide"><HowItWorks /><ProductClarity /><LocalRunCTA /><footer><span>UI Merge Studio</span><span>Open source · MIT</span></footer></div>;
}

export function PublicLanding({ open }: { open: () => void }) {
  return <main className="catalogue-site"><PublicHero open={open} /><PublicProductGuide /></main>;
}

type CausalityState = 'complete' | 'active' | 'idle' | 'refused';

export function ShowcaseCausalityStrip({ selectionCount, combined, refused }: { selectionCount: number; combined: boolean; refused: boolean }) {
  const hasSelection = selectionCount > 0;
  const state = (stage: string): CausalityState => {
    if (combined) return 'complete';
    if (stage === 'Selected') return hasSelection ? 'complete' : 'active';
    if (stage === 'Source' || stage === 'Slice') return hasSelection ? 'complete' : 'idle';
    if (refused) return 'refused';
    return hasSelection && stage === 'Candidate' ? 'active' : 'idle';
  };
  const stages = ['Selected', 'Source', 'Slice', 'Candidate', 'Verified'];
  return <section className="showcase-causality-panel" aria-label="Controlled integration evidence state">
    <div><span>{selectionCount} selected</span><small>{refused ? 'Combination refused safely' : combined ? 'Recorded result verified' : hasSelection ? 'Recorded evidence ready for review' : 'Choose a visible feature from either version'}</small></div>
    <ol>{stages.map((stage, index) => <li key={stage} data-state={state(stage)}><i>{state(stage) === 'complete' ? '✓' : state(stage) === 'refused' ? '!' : index + 1}</i><span>{stage}</span></li>)}</ol>
  </section>;
}

export function ShowcaseResultSummary({ candidate, selectionCount }: { candidate: PublicCandidate; selectionCount: number }) {
  const sidebarSelected = candidate.selection.sidebar;
  const quickViewCount = candidate.selection.quickViewProductIds.length;
  const gateLabel = (id: string) => ({
    'locked-dependencies': 'Locked dependencies',
    typecheck: 'TypeScript',
    'focused-feature-tests': 'Feature tests',
    'production-build': 'Production build'
  }[id] ?? id.replaceAll('-', ' '));
  return <section className="showcase-result-summary" aria-label="Recorded result convergence">
    <div className="result-source-list">
      <span>Source selections</span>
      {sidebarSelected && <article><i>✓</i><div><strong>Category sidebar</strong><code>branch-a · {candidate.sliceIds[0]?.slice(0, 8)}</code></div></article>}
      {quickViewCount > 0 && <article><i>✓</i><div><strong>Quick View · {quickViewCount} product{quickViewCount === 1 ? '' : 's'}</strong><code>branch-b · {candidate.sliceIds.at(-1)?.slice(0, 8)}</code></div></article>}
      {!sidebarSelected && quickViewCount === 0 && <article><i>✓</i><div><strong>Foundation only</strong><code>main</code></div></article>}
    </div>
    <div className="result-converge-arrow" aria-hidden="true"><span>╲</span><b>→</b><span>╱</span></div>
    <div className="result-record">
      <span>Recorded combined result</span>
      <strong>{candidate.candidateBranch}</strong>
      <code>{candidate.candidateCommit.slice(0, 12)}</code>
      <small>{selectionCount} explicit addition{selectionCount === 1 ? '' : 's'} · {candidate.excludedChanges.length} exclusions proven</small>
    </div>
    <div className="result-gates" aria-label="Recorded verification gates">
      {candidate.verification.map(gate => <span key={gate.id}><i>✓</i><b>{gateLabel(gate.id)}</b><small>Passed</small></span>)}
    </div>
  </section>;
}
