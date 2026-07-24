import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { PreviewSession } from '../../../packages/preview-runtime/src/previewController';
import type { PreviewOperation, PreviewOperationAcknowledgement } from '../../../packages/preview-runtime/src/previewOperations';
import { createStudioCommand, validatePreviewEvent, type ComparisonContext, type PreviewCapabilities, type PreviewMessage, type StudioCommandType } from '../../../packages/shared/src/bridge';
import type { SourceIdentity } from '../../../packages/shared/src/sourceIdentity';
import type { FeatureSliceArtifact } from '../../../packages/source-analysis/src/types';
import type { CandidateGenerationReport, CandidatePreflight } from '../../../packages/candidate-generation/src/types';
import { compareCapabilities, comparisonReducer, initialComparisonState, planContextSynchronization, viewportPresets, type ComparisonState, type PreviewSlotId } from './comparisonState';
import { demoScenario, featureLabel, guidedSelectionDecision } from './demoScenario';
import { pollPreviewOperation } from './operationPolling';

interface RepositoryResponse { branches: string[]; preferredBranches?: string[]; clean: boolean; sessions: PreviewSession[] }
const slots: PreviewSlotId[] = ['left', 'right'];
const terminalPreviewStates = new Set(['ready', 'failed', 'cancelled', 'superseded']);
function synchronizationId() { return globalThis.crypto?.randomUUID?.() ?? `sync-${Date.now()}-${Math.random()}`; }
function readablePhase(operation: PreviewOperation | null) {
  if (!operation) return 'Waiting to start';
  if (operation.state === 'ready') return 'Runtime ready';
  if (operation.state === 'failed') return 'Preview could not start';
  if (operation.state === 'cancelled') return 'Launch cancelled';
  if (operation.state === 'superseded') return 'Replacing an older launch';
  const phase = [...operation.phases].reverse().find(item => !item.completedAt)?.phase ?? operation.phases.at(-1)?.phase;
  const labels: Record<string, string> = {
    'request-received': 'Request accepted',
    queued: 'Queued',
    'validating-ref': 'Checking version',
    'stopping-previous-runtime': 'Stopping previous preview',
    'preparing-worktree': 'Preparing isolated files',
    'preparing-dependencies': 'Preparing app packages',
    'allocating-port': 'Opening a local preview',
    'starting-runtime': 'Starting the app',
    'waiting-for-runtime': 'Waiting for the app',
    ready: 'Runtime ready'
  };
  return labels[phase ?? ''] ?? 'Preparing preview';
}

function IdentityPanel({ identity, title }: { identity: SourceIdentity | null; title: string }) {
  return <section className="evidence-card"><h3>{title}</h3>{identity ? <dl><dt>Component</dt><dd>{identity.componentName ?? 'Anonymous'}</dd><dt>Source</dt><dd><code>{identity.repositoryRelativePath}:{identity.line}:{identity.column}</code></dd><dt>Definition boundary</dt><dd><code>{identity.boundaryId}</code></dd><dt>Runtime instance</dt><dd><code>{identity.instanceId}</code></dd><dt>Preview session</dt><dd><code>{identity.previewId} / {identity.sessionId.slice(0, 8)} / g{identity.generation}</code></dd><dt>Branch</dt><dd>{identity.branch}</dd><dt>Mapping</dt><dd>{identity.confidence}</dd></dl> : <p className="muted">None</p>}</section>;
}

function TestSlices({ artifact }: { artifact: FeatureSliceArtifact }) {
  if (!artifact.slice.testFileSlices.length) return null;
  return <section className="test-slices"><h3>Test-file slices</h3>{artifact.slice.testFileSlices.map(file => <article className={`test-slice test-slice-${file.mode}`} key={file.path}><h4><code>{file.path}</code></h4><p><strong>Mode:</strong> {file.mode}</p><h5>Included test units</h5>{file.includedUnits.length ? <ul>{file.includedUnits.map(unit => <li key={unit.id}><strong>{unit.title ?? unit.kind}</strong><code>{unit.kind} · lines {unit.region.startLine}-{unit.region.endLine}</code><span>{unit.reason}</span></li>)}</ul> : <p className="muted">None</p>}<h5>Excluded test units</h5>{file.excludedUnits.length ? <ul>{file.excludedUnits.map(unit => <li key={unit.id}><strong>{unit.title ?? unit.kind}</strong><code>{unit.kind} · lines {unit.region.startLine}-{unit.region.endLine}</code><span>{unit.reason}</span><small>{unit.proof}</small></li>)}</ul> : <p className="muted">None</p>}<h5>Required import specifiers</h5>{file.requiredImports.length ? <ul>{file.requiredImports.map(item => <li key={`${item.source}:${item.local}`}><code>{item.local} ← {item.source}#{item.imported}</code></li>)}</ul> : <p className="muted">None</p>}<h5>Excluded import specifiers</h5>{file.excludedImports.length ? <ul>{file.excludedImports.map(item => <li key={`${item.source}:${item.local}`}><code>{item.local} ← {item.source}#{item.imported}</code></li>)}</ul> : <p className="muted">None</p>}{file.requiredSupportDeclarations.length > 0 && <><h5>Required support declarations</h5><ul>{file.requiredSupportDeclarations.map(item => <li key={`${item.name}:${item.region.startLine}`}><strong>{item.name}</strong><span>{item.kind} · lines {item.region.startLine}-{item.region.endLine}</span></li>)}</ul></>}{file.unresolvedDependencies.length > 0 && <div className="warning"><strong>Partial test slicing:</strong><ul>{file.unresolvedDependencies.map(item => <li key={`${item.path}:${item.reason}`}>{item.reason}</li>)}</ul></div>}</article>)}</section>;
}

export function SlicePanel({ artifact, status, error }: { artifact: FeatureSliceArtifact | null; status: string; error: string | null }) {
  if (status === 'idle') return <section className="slice-panel evidence-card"><h3>Feature slice</h3><p className="muted">No evidence has been requested.</p></section>;
  if (status === 'loading') return <section className="slice-panel evidence-card" aria-busy="true"><h3>Feature slice</h3><p>Analyzing Git and AST evidence…</p></section>;
  if (!artifact) return <section className="slice-panel evidence-card"><h3>Feature slice</h3><div className="error"><strong>Analysis refused:</strong> {error}</div></section>;
  const slice = artifact.slice;
  return <section className={`slice-panel evidence-card slice-${status}`}><h3>Feature slice · {slice.status}</h3>{status === 'stale' && <div className="notice"><strong>Stale analysis:</strong> {error}</div>}<dl className="slice-meta"><dt>Original boundary</dt><dd>{slice.boundary.original}</dd><dt>Analyzed boundary</dt><dd>{slice.boundary.analyzed}</dd><dt>Expansion</dt><dd>{slice.boundary.reason}</dd><dt>Merge base</dt><dd><code>{slice.repository.mergeBaseCommit.slice(0, 12)}</code></dd><dt>Branch commit</dt><dd><code>{slice.repository.branchCommit.slice(0, 12)}</code></dd></dl><h4>Included changes</h4>{slice.includedChanges.length ? <ul className="change-list included-list">{slice.includedChanges.map(item => <li key={item.branchChangeId}><strong>{item.symbol?.name ?? item.path}</strong><code>{item.path}{item.symbol ? `:${item.symbol.region.startLine}` : ''}</code><span>{item.reason}</span><small>{item.category} · {item.confidence} · {item.wholeFile ? 'whole file' : 'symbol/region'}</small></li>)}</ul> : <p className="muted">None</p>}<TestSlices artifact={artifact} /><h4>Excluded branch changes</h4>{slice.excludedChanges.length ? <ul className="change-list excluded-list">{slice.excludedChanges.map(item => <li key={item.branchChangeId}><strong>{item.symbol?.name ?? item.path}</strong><code>{item.path}</code><span>{item.reason}</span><small>{item.classification} · {item.proof}</small></li>)}</ul> : <p className="muted">None</p>}<h4>Unresolved dependencies</h4>{slice.unresolvedDependencies.length ? <ul className="change-list unresolved-list">{slice.unresolvedDependencies.map(item => <li key={`${item.path}:${item.reason}`}><code>{item.path}</code><span>{item.reason}</span><small>{item.manualNextStep}</small></li>)}</ul> : <p className="muted">None</p>}<a className="artifact-link" href={`/api/analysis/${artifact.analysisId}`} download>Download deterministic JSON</a></section>;
}

type GenerationInput = { artifact: FeatureSliceArtifact | null; status: string; sessionId: string | null };
const verificationLabels: Record<string, string> = {
  install: 'Dependency installation',
  typecheck: 'Code checks',
  tests: 'Full tests',
  'focused-feature-tests': 'Feature tests',
  'production-build': 'Production build'
};
function failedCandidateMessage(report: CandidateGenerationReport) {
  const failed = report.verification.find(item => item.status === 'failed');
  const gate = failed ? verificationLabels[failed.name] ?? 'A verification check' : 'A verification check';
  return `${gate} did not pass, so UI Merge Studio discarded the proposed result. No combined branch was created, both source branches are unchanged, and the temporary workspace was cleaned.`;
}
export function CandidatePanel({ inputs, onLaunch, onRevise, onEvidence }: { inputs: GenerationInput[]; onLaunch: (branch: string) => void; onRevise?: () => void; onEvidence?: () => void }) {
  const [preflight, setPreflight] = useState<CandidatePreflight | null>(null);
  const [report, setReport] = useState<CandidateGenerationReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('Waiting for two selected features.');
  const [error, setError] = useState<string | null>(null);
  const candidateBranch = 'combined-result';
  const inputKey = inputs.map(item => `${item.artifact?.analysisId ?? 'none'}:${item.status}:${item.sessionId ?? 'none'}`).join('|');
  const artifacts = inputs.map(item => item.artifact).filter((item): item is FeatureSliceArtifact => Boolean(item));
  const ready = inputs.length === 2 && artifacts.length === 2 && inputs.every(item => item.status === 'resolved') && artifacts.every(item => item.slice.status === 'resolved');
  const base = ready && new Set(artifacts.map(item => item.slice.repository.mergeBaseCommit)).size === 1 ? artifacts[0].slice.repository.mergeBaseCommit : null;
  const request = () => ({ expectedBaseCommit: base, candidateBranch, artifacts, analyzerSchemaVersion: artifacts[0]?.slice.version ?? 0 });

  useEffect(() => { setPreflight(null); setReport(null); setError(null); setProgress(ready ? 'Checking source code and required dependencies.' : 'Select one branch-specific change from each live app.'); }, [inputKey, ready]);
  useEffect(() => {
    if (!ready || !base) return;
    const controller = new AbortController();
    void fetch('/api/candidate/preflight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request()), signal: controller.signal })
      .then(async response => { const value = await response.json(); if (!response.ok) throw new Error(value.error ?? response.statusText); setPreflight(value as CandidatePreflight); setProgress((value as CandidatePreflight).plan.status === 'ready' ? 'Both selections passed the compatibility check.' : 'This selection cannot be combined safely.'); })
      .catch(value => { if ((value as Error).name !== 'AbortError') { setError(value instanceof Error ? value.message : String(value)); setProgress('The safety check could not finish.'); } });
    return () => controller.abort();
  }, [inputKey, ready, base]);

  async function generateCandidate() {
    setBusy(true); setError(null); setReport(null); setProgress('Preparing an isolated workspace…');
    const progressController = new AbortController();
    const poll = async () => {
      let active = true;
      while (active && !progressController.signal.aborted) {
        try {
          const response = await fetch('/api/candidate/status', { signal: progressController.signal });
          const value = await response.json() as { status: string; stage: string | null; message: string; sliceId?: string; verification?: string };
          if (value.status === 'running') {
            if (value.stage === 'applying-feature' && value.sliceId) {
              const selected = artifacts.find(item => item.analysisId === value.sliceId);
              setProgress(`Applying ${featureLabel(selected)}…`);
            } else if (value.stage === 'verification' && value.verification) setProgress(`Running ${value.verification} verification…`);
            else setProgress(value.message);
          }
          active = value.status === 'running' || value.status === 'idle';
        } catch (value) { if ((value as Error).name !== 'AbortError') active = false; }
        if (active) await new Promise(resolve => setTimeout(resolve, 500));
      }
    };
    const polling = poll();
    try {
      const response = await fetch('/api/candidate/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request()) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? response.statusText);
      const result = value as CandidateGenerationReport;
      setReport(result);
      setProgress(result.status === 'succeeded' ? 'Combined branch created and verified.' : failedCandidateMessage(result));
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
      setProgress('Combined branch creation failed safely.');
    } finally {
      progressController.abort();
      await polling;
      setBusy(false);
    }
  }

  const failed = Boolean(report && report.status !== 'succeeded');
  const blocked = !ready ? 'Select one branch-specific change from each live app.' : !base ? 'The selected changes do not share the same starting point.' : preflight?.plan.status === 'refused' ? 'This selection cannot be combined safely.' : null;
  const safetyState = failed ? 'Review failure' : report?.status === 'succeeded' ? 'Verified branch created' : busy ? 'Creating and testing' : preflight?.plan.status === 'ready' ? 'Ready to combine' : 'Waiting for selections';
  return <section className="combine-tray" aria-label="Selected features and combine action">
    <div className="tray-features">
      {slots.map((slot, index) => <div key={slot}><span>{index === 0 ? 'Navigation branch' : 'Activity-filter branch'}</span><strong>{featureLabel(inputs[index]?.artifact)}</strong></div>)}
      <div className={`tray-safety ${failed ? 'is-failed' : preflight?.plan.status === 'ready' ? 'is-ready' : ''}`}><span>Safety check</span><strong><i className="status-dot" aria-hidden="true" />{safetyState}</strong></div>
    </div>
    <div className={`tray-status ${failed ? 'is-failed' : ''}`} role="status" aria-live="polite"><span>{error ?? progress}</span></div>
    {!failed && report?.status !== 'succeeded' && <button className="primary-action" onClick={generateCandidate} disabled={Boolean(blocked) || !preflight || preflight.plan.status !== 'ready' || busy}>{busy ? 'Creating and verifying…' : 'Create verified branch'}</button>}
    {failed && <button className="primary-action revise-action" onClick={onRevise}>Change selected features</button>}
    {report?.status === 'succeeded' && <button className="primary-action" onClick={() => onLaunch(report.repository.candidateBranch)}>View combined app</button>}
    {report?.status === 'succeeded' && <div className="tray-result-summary"><strong>Combined result</strong><code>combined-result</code></div>}
    {report && <button className="evidence-link" onClick={onEvidence}>{report.status === 'succeeded' ? 'View verification evidence' : 'View error details'}</button>}
    {report && <details className="generation-summary"><summary>Verification summary</summary><p>{report.message}</p><ul>{report.verification.map(item => <li key={item.name}>{verificationLabels[item.name] ?? item.name}: <strong>{item.status}</strong></li>)}</ul><p>Cleanup: {report.cleanup.detail}</p></details>}
  </section>;
}

function WorkflowStepper({ state }: { state: ComparisonState }) {
  const ready = slots.every(slot => state.previews[slot].status === 'ready');
  const selected = slots.every(slot => Boolean(state.previews[slot].selected));
  const analyzed = slots.every(slot => state.previews[slot].analysis.status === 'resolved');
  const steps = [
    { label: 'Compare', complete: ready },
    { label: 'Select', complete: selected },
    { label: 'Combine', complete: analyzed },
    { label: 'Verify', complete: false }
  ];
  const active = steps.findIndex(step => !step.complete);
  return <nav className="workflow" aria-label="Guided workflow">{steps.map((step, index) => <div className={step.complete ? 'complete' : index === active ? 'active' : ''} aria-current={index === active ? 'step' : undefined} key={step.label}><span>{step.complete ? '✓' : index + 1}</span>{step.label}</div>)}</nav>;
}

function IntroScreen({ ready, status, expanded, active, onToggleDetails, onStart, onStop }: { ready: boolean; status: string; expanded: boolean; active: boolean; onToggleDetails: () => void; onStart: () => void; onStop: () => void }) {
  return <main className="intro-screen">
    <header className="intro-nav"><div className="brand-mark" aria-hidden="true">UM</div><strong>UI Merge Studio</strong><span>Controlled local proof</span></header>
    <section className="intro-hero">
      <div className="intro-copy">
        <p className="intro-kicker">Visual decisions, verified in code</p>
        <h1>{demoScenario.productName}</h1>
        <p className="intro-promise"><strong>{demoScenario.promise}</strong></p>
        <p className="intro-description">{demoScenario.description}</p>
        <div className="intro-actions">
          <button className="primary-action hero-action" onClick={onStart} disabled={!ready}>{active ? 'Resume sample demo' : 'Try sample demo'} <span aria-hidden="true">→</span></button>
          <button className="secondary-action" onClick={onToggleDetails} aria-expanded={expanded}>How it works</button>
          {active && <button className="text-action stop-action" onClick={onStop}>Stop demo</button>}
        </div>
        <p className="repository-readiness" role="status">{ready ? 'This guided demo uses a small local React project. Support for selecting arbitrary local repositories is the next validation milestone.' : status}</p>
      </div>
      <aside className="demo-brief">
        <p className="eyebrow">This guided demo</p>
        <h2>{demoScenario.sampleAppName}</h2>
        <p>{demoScenario.sampleAppDescription}</p>
        <div className="demo-pair">
          <div><span>Navigation branch</span><strong>Collapsible navigation</strong></div>
          <span aria-hidden="true">+</span>
          <div><span>Activity branch</span><strong>Activity filters</strong></div>
        </div>
        <p className="demo-note">These are examples—not limits. The same workflow can evaluate many safely isolatable visible React features.</p>
      </aside>
    </section>
    <section className="branch-story" aria-label="Branch relationship">
      <div className="branch-base"><span>{demoScenario.branchRelationship.base.label}</span><code>{demoScenario.branchRelationship.base.ref}</code></div>
      <div className="branch-lines" aria-hidden="true"><i /><span /><span /></div>
      <div className="branch-experiments">{demoScenario.branchRelationship.experiments.map(item => <div key={item.ref}><span>{item.label}</span><code>{item.ref}</code></div>)}</div>
      <div className="branch-result"><span>Created only after every check passes</span><strong>{demoScenario.branchRelationship.result.label}</strong><code>{demoScenario.branchRelationship.result.ref}</code></div>
    </section>
    <section className="trust-grid">
      <article><span>01</span><strong>Original branches stay untouched</strong><p>Every preview and proposed result runs in an isolated Git worktree.</p></article>
      <article><span>02</span><strong>Supporting code comes with the feature</strong><p>Components, hooks, styles, types, and relevant tests travel together.</p></article>
      <article><span>03</span><strong>Unsafe results are discarded</strong><p>Unrelated changes are excluded; verification must pass before a branch exists.</p></article>
    </section>
    {expanded && <section className="how-it-works" aria-label="How UI Merge Studio works">
      <div><span>1</span><strong>Run</strong><p>Launch isolated versions of the same React application.</p></div>
      <div><span>2</span><strong>Choose</strong><p>Click the visible feature you want from each version.</p></div>
      <div><span>3</span><strong>Understand</strong><p>Trace each choice to its source and required dependencies.</p></div>
      <div><span>4</span><strong>Verify</strong><p>Create the result only after code checks, tests, and build pass.</p></div>
    </section>}
    <section className="feature-spectrum"><span>Also suited to</span>{demoScenario.examples.map(example => <strong key={example}>{example}</strong>)}</section>
  </main>;
}

function ComparisonHelp({ onClose }: { onClose: () => void }) {
  return <aside className="context-help" role="dialog" aria-label="What am I seeing?">
    <div><strong>What am I seeing?</strong><button className="icon-button" onClick={onClose} aria-label="Close comparison explanation">×</button></div>
    <p>Both panels are complete, interactive apps built from separate Git worktrees. UI Merge Studio keeps their route and sample data synchronized, highlights traceable branch changes, and maps your visual choice back to React source.</p>
  </aside>;
}

function ResultSummary({ activeView, onView }: { activeView: 'left' | 'right' | 'result'; onView: (view: 'left' | 'right' | 'result') => void }) {
  return <section className="result-workspace" aria-label="Verified combined result">
    <div className="result-heading"><div><p className="eyebrow">Verified combined result</p><h2>Both selected changes, together</h2><p><code>combined-result</code> passed every check. The source branches remain unchanged.</p></div><button className="primary-action" onClick={() => onView('result')}>Open combined result</button></div>
    <div className="result-facts">
      <div><span>Included</span><strong>Collapsible navigation · Activity filters</strong></div>
      <div><span>Excluded</span><strong>Unrelated heading change · unrelated sorting change</strong></div>
      <div><span>Verification</span><strong>TypeScript · feature tests · full tests · production build</strong></div>
      <div><span>Original branches changed</span><strong>No</strong></div>
    </div>
    <nav className="result-tabs" aria-label="Result comparison views">
      <button className={activeView === 'left' ? 'active' : ''} onClick={() => onView('left')}>Navigation source</button>
      <button className={activeView === 'right' ? 'active' : ''} onClick={() => onView('right')}>Activity-filter source</button>
      <button className={activeView === 'result' ? 'active' : ''} onClick={() => onView('result')}>Combined result</button>
    </nav>
  </section>;
}

function TechnicalDrawer({ open, onClose, state, operations, onSelectAncestor, onClear }: { open: boolean; onClose: () => void; state: ComparisonState; operations: Record<PreviewSlotId, PreviewOperation | null>; onSelectAncestor: (slot: PreviewSlotId, index: number) => void; onClear: (slot: PreviewSlotId) => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    addEventListener('keydown', escape);
    return () => removeEventListener('keydown', escape);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><aside className="technical-drawer" role="dialog" aria-modal="true" aria-labelledby="technical-title"><header><div><p className="eyebrow">Evidence and diagnostics</p><h2 id="technical-title">Technical details</h2></div><button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close technical details">×</button></header>{slots.map(slot => { const preview = state.previews[slot]; const operation = operations[slot]; return <section className="drawer-version" key={slot}><h2>{slot === 'left' ? 'Navigation experiment' : preview.branch === 'combined-result' ? 'Combined result' : 'Activity-filter experiment'} · {preview.branch}</h2>{operation && <details open><summary>Preview operation · {operation.state}</summary><ol className="phase-list">{operation.phases.map(item => <li key={item.phase}><strong>{item.phase}</strong><span>{item.detail}</span><code>{item.durationMs === null ? 'running' : `${item.durationMs} ms`}</code></li>)}</ol>{operation.error && <div className="error">{operation.error}</div>}</details>}<IdentityPanel title="Hovered boundary" identity={preview.hovered} /><IdentityPanel title="Selected boundary" identity={preview.selected?.identity ?? null} />{preview.selected && <section className="evidence-card"><h3>Eligible ancestors</h3>{preview.selected.ancestors.length ? preview.selected.ancestors.map((identity, index) => <button className="ancestor" key={identity.instanceId} onClick={() => onSelectAncestor(slot, index + 1)}>{identity.componentName ?? identity.repositoryRelativePath}</button>) : <p className="muted">No instrumented ancestor.</p>}<button className="text-action" onClick={() => onClear(slot)}>Clear selection</button></section>}<SlicePanel artifact={preview.analysis.artifact} status={preview.analysis.status} error={preview.analysis.error} /></section>; })}</aside></div>;
}

export function App() {
  const [state, dispatch] = useReducer(comparisonReducer, initialComparisonState);
  const [operations, setOperations] = useState<Record<PreviewSlotId, PreviewOperation | null>>({ left: null, right: null });
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [guidedStarted, setGuidedStarted] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [comparisonHelpOpen, setComparisonHelpOpen] = useState(false);
  const [comparisonLayout, setComparisonLayout] = useState<'both' | PreviewSlotId>('both');
  const [confirmedSelections, setConfirmedSelections] = useState<Record<PreviewSlotId, boolean>>({ left: false, right: false });
  const [resultBranch, setResultBranch] = useState<string | null>(null);
  const [resultView, setResultView] = useState<'left' | 'right' | 'result'>('result');
  const frames = useRef<Record<PreviewSlotId, HTMLIFrameElement | null>>({ left: null, right: null });
  const operationControllers = useRef<Partial<Record<PreviewSlotId, AbortController>>>({});
  const activeOperationIds = useRef<Partial<Record<PreviewSlotId, string>>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/repository', { signal: controller.signal }).then(response => response.json()).then((value: RepositoryResponse) => {
      const preferred = value.preferredBranches?.length ? value.preferredBranches : [demoScenario.versions.left.branch, demoScenario.versions.right.branch];
      const ordered = [...preferred, ...value.branches.filter(branch => !preferred.includes(branch))];
      dispatch({ type: 'repository-loaded', branches: ordered, clean: value.clean });
    }).catch(error => { if ((error as Error).name !== 'AbortError') dispatch({ type: 'repository-failed', error: String(error) }); });
    return () => controller.abort();
  }, []);

  useEffect(() => () => {
    for (const controller of Object.values(operationControllers.current)) controller?.abort();
  }, []);

  useEffect(() => {
    const left = state.previews.left.capabilities;
    const right = state.previews.right.capabilities;
    if (!left || !right) return;
    const result = compareCapabilities(left, right);
    if (state.synchronizationStatus !== result.reason) dispatch({ type: 'sync-status', status: result.reason, error: result.compatible ? null : result.reason });
  }, [state.previews.left.capabilities, state.previews.right.capabilities, state.synchronizationStatus]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const previewId = slots.find(id => frames.current[id]?.contentWindow === event.source);
      if (!previewId) return;
      const preview = state.previews[previewId];
      if (!preview.session) return;
      const validation = validatePreviewEvent(event, { origin: preview.session.origin, identity: preview.session });
      if (!validation.value) { dispatch({ type: 'bridge-error', previewId, error: validation.error ?? 'Bridge message rejected.' }); return; }
      handleMessage(previewId, validation.value);
    };
    addEventListener('message', listener);
    return () => removeEventListener('message', listener);
  }, [state]);

  function send(previewId: PreviewSlotId, type: StudioCommandType, payload?: unknown) {
    const session = state.previews[previewId].session;
    if (!session) return;
    frames.current[previewId]?.contentWindow?.postMessage(createStudioCommand(session, type, payload), session.origin);
  }

  function handleMessage(previewId: PreviewSlotId, message: PreviewMessage) {
    dispatch({ type: 'preview-message', previewId, message });
    if (message.type === 'preview-ready') {
      const payload = message.payload as { capabilities: PreviewCapabilities; context: ComparisonContext };
      const otherId: PreviewSlotId = previewId === 'left' ? 'right' : 'left';
      const compatibility = compareCapabilities(payload.capabilities, state.previews[otherId].capabilities);
      dispatch({ type: 'sync-status', status: compatibility.reason, error: compatibility.compatible ? null : compatibility.reason });
      if (compatibility.compatible && state.previews[otherId].status === 'ready') send(previewId, 'sync-context', { operationId: synchronizationId(), sourcePreviewId: otherId, context: state.previews[otherId].context ?? payload.context });
    }
    if (message.type === 'navigation-changed') {
      const payload = message.payload as { operationId: string | null; context: ComparisonContext };
      dispatch({ type: 'canonical-context', context: payload.context });
      const plan = planContextSynchronization(state, previewId, payload.context, payload.operationId, synchronizationId());
      dispatch({ type: 'sync-status', status: plan.reason, error: plan.target ? null : plan.reason });
      if (plan.target) send(plan.target, 'sync-context', { operationId: plan.operationId, sourcePreviewId: previewId, context: plan.context });
    }
    if (message.type === 'preview-state') dispatch({ type: 'sync-status', status: 'The ticket and route match in both versions.', error: null });
    if (message.type === 'boundary-selected') {
      const identity = (message.payload as { identity: SourceIdentity }).identity;
      send(previewId, 'disable-selection');
      void analyzeIdentity(previewId, identity);
    }
  }

  async function startPreview(previewId: PreviewSlotId, overrideBranch?: string) {
    const branch = overrideBranch ?? state.previews[previewId].branch;
    const oldOperationId = activeOperationIds.current[previewId];
    operationControllers.current[previewId]?.abort();
    if (oldOperationId) void fetch(`/api/preview-operations/${oldOperationId}`, { method: 'DELETE' }).catch(() => undefined);
    const controller = new AbortController();
    operationControllers.current[previewId] = controller;
    dispatch({ type: 'preview-starting', previewId });
    try {
      const response = await fetch(`/api/previews/${previewId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch }), signal: controller.signal });
      const acknowledgement = await response.json() as PreviewOperationAcknowledgement | { error?: string };
      if (!response.ok) throw new Error('error' in acknowledgement && acknowledgement.error ? acknowledgement.error : response.statusText);
      const operationId = (acknowledgement as PreviewOperationAcknowledgement).operationId;
      activeOperationIds.current[previewId] = operationId;
      const operation = await pollPreviewOperation(operationId, {
        signal: controller.signal,
        onUpdate: value => {
          if (activeOperationIds.current[previewId] !== operationId) return;
          setOperations(current => ({ ...current, [previewId]: value }));
        }
      });
      if (activeOperationIds.current[previewId] !== operationId) return;
      if (operation.state === 'ready' && operation.result) dispatch({ type: 'preview-started', previewId, session: operation.result });
      else if (operation.state === 'failed') dispatch({ type: 'preview-failed', previewId, error: operation.error ?? 'The preview could not start.' });
      else if (terminalPreviewStates.has(operation.state)) dispatch({ type: 'preview-failed', previewId, error: operation.error ?? `The preview launch was ${operation.state}.` });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') dispatch({ type: 'preview-failed', previewId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  async function startBoth() { await Promise.all(slots.map(previewId => startPreview(previewId))); }
  function toggleSelection(previewId: PreviewSlotId) { const preview = state.previews[previewId]; send(previewId, preview.selecting ? 'disable-selection' : 'enable-selection'); }
  async function analyzeIdentity(previewId: PreviewSlotId, selection: SourceIdentity) {
    dispatch({ type: 'analysis-started', previewId });
    try {
      const response = await fetch(`/api/previews/${previewId}/analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selection }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? response.statusText);
      const artifact = value as FeatureSliceArtifact;
      const decision = guidedSelectionDecision(previewId, artifact);
      if (decision.allowed) {
        dispatch({ type: 'analysis-finished', previewId, artifact });
        setConfirmedSelections(current => ({ ...current, [previewId]: false }));
      }
      else dispatch({ type: 'analysis-guidance-refused', previewId, artifact, error: decision.message });
    } catch (error) { dispatch({ type: 'analysis-failed', previewId, error: error instanceof Error ? error.message : String(error) }); }
  }
  function setViewport(name: keyof typeof viewportPresets) {
    const viewport = viewportPresets[name];
    dispatch({ type: 'set-viewport', viewport });
    for (const previewId of slots) if (state.previews[previewId].session) send(previewId, 'sync-viewport', { operationId: synchronizationId(), viewport });
  }

  const readyCount = slots.filter(id => state.previews[id].status === 'ready').length;
  const generationInputs = useMemo(() => slots.map(id => ({ artifact: state.previews[id].analysis.artifact, status: confirmedSelections[id] ? state.previews[id].analysis.status : 'awaiting-confirmation', sessionId: state.previews[id].session?.sessionId ?? null })), [state.previews.left.analysis, state.previews.right.analysis, state.previews.left.session, state.previews.right.session, confirmedSelections]);
  const workspaceStatus = readyCount === 2 ? 'Both live apps are ready to compare' : readyCount === 1 ? 'One live app is ready' : state.repositoryStatus;
  function reviseSelections() {
    for (const slot of slots) {
      send(slot, 'clear-selection');
      dispatch({ type: 'clear-selection', previewId: slot });
    }
    setConfirmedSelections({ left: false, right: false });
  }
  function startGuidedComparison() {
    setGuidedStarted(true);
    if (!slots.some(slot => state.previews[slot].session || state.previews[slot].status === 'starting' || state.previews[slot].status === 'restarting')) void startBoth();
  }
  async function stopDemo() {
    for (const controller of Object.values(operationControllers.current)) controller?.abort();
    activeOperationIds.current = {};
    await fetch('/api/preview', { method: 'DELETE' }).catch(() => undefined);
    setOperations({ left: null, right: null });
    setResultBranch(null);
    setComparisonLayout('both');
    setConfirmedSelections({ left: false, right: false });
    dispatch({ type: 'reset-previews' });
  }
  function switchResultView(view: 'left' | 'right' | 'result') {
    setResultView(view);
    if (view === 'left') {
      setComparisonLayout('left');
      if (state.previews.left.branch !== demoScenario.versions.left.branch) {
        dispatch({ type: 'set-branch', previewId: 'left', branch: demoScenario.versions.left.branch });
        void startPreview('left', demoScenario.versions.left.branch);
      }
      return;
    }
    const branch = view === 'result' ? resultBranch ?? demoScenario.branchRelationship.result.ref : demoScenario.versions.right.branch;
    setComparisonLayout('right');
    if (state.previews.right.branch !== branch) {
      dispatch({ type: 'set-branch', previewId: 'right', branch });
      void startPreview('right', branch);
    }
  }

  if (!guidedStarted) return <IntroScreen ready={state.repositoryClean && slots.every(id => Boolean(state.previews[id].branch))} status={state.repositoryStatus} expanded={howItWorksOpen} active={slots.some(slot => Boolean(state.previews[slot].session))} onToggleDetails={() => setHowItWorksOpen(value => !value)} onStart={startGuidedComparison} onStop={() => void stopDemo()} />;

  return <div className="studio workspace-studio">
    <header className="product-header">
      <div className="workspace-navigation"><button className="back-action" onClick={() => setGuidedStarted(false)}>← Back to overview</button><button className="product-name" onClick={() => setGuidedStarted(false)}><span className="brand-mark" aria-hidden="true">UM</span><span>{demoScenario.productName}</span></button></div>
      <WorkflowStepper state={state} />
      <div className="header-actions">
        <div className="header-control-group" aria-label="Preview controls">
          <div className="segmented-control header-layout" aria-label="Preview layout">
            <button className={comparisonLayout === 'both' ? 'active' : ''} onClick={() => setComparisonLayout('both')}>Side by side</button>
            <button className={comparisonLayout === 'left' ? 'active' : ''} onClick={() => setComparisonLayout('left')}>Focus navigation</button>
            <button className={comparisonLayout === 'right' ? 'active' : ''} onClick={() => setComparisonLayout('right')}>Focus {state.previews.right.branch === 'combined-result' ? 'result' : 'activity'}</button>
          </div>
          <label>Fit<select aria-label="Preview size" value={state.viewport.preset} onChange={event => setViewport(event.target.value as keyof typeof viewportPresets)}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></label>
        </div>
        <button className="help-action" onClick={() => setComparisonHelpOpen(value => !value)} aria-label="Comparison help">?</button>
      </div>
    </header>
    {resultBranch && <ResultSummary activeView={resultView} onView={switchResultView} />}
    <section className="comparison-controls" aria-label="Comparison layout">
      <div><h1>{resultBranch ? 'Inspect the verified result' : 'Compare branches'}</h1><strong>{resultBranch ? 'Switch between either source and the verified combined result.' : 'These are two live Git branches of the same React application. Select one branch-specific UI change from each.'}</strong><span><button className="evidence-link" onClick={() => setComparisonHelpOpen(true)}>What am I seeing?</button><button className="evidence-link" onClick={() => setTechnicalOpen(true)}>How are changes identified?</button></span></div>
    </section>
    <div className="workspace-meta"><span className="workspace-status" role="status">{workspaceStatus}</span></div>
    {comparisonHelpOpen && <ComparisonHelp onClose={() => setComparisonHelpOpen(false)} />}
    <main className={`comparison focus-${comparisonLayout}`} aria-label="Version comparison">
      {slots.map(previewId => {
        const preview = state.previews[previewId];
        const presentation = demoScenario.versions[previewId];
        const operation = operations[previewId];
        const combinedPreview = preview.branch === demoScenario.branchRelationship.result.ref;
        const panelTitle = combinedPreview ? 'Combined result' : presentation.title;
        const panelDescription = combinedPreview ? 'The verified output containing both selected UI changes.' : presentation.description;
        const guidedPolicyRefusal = preview.analysis.status === 'refused' && Boolean(preview.analysis.artifact);
        const selectedLabel = guidedPolicyRefusal ? 'Choose a narrower feature' : featureLabel(preview.analysis.artifact ?? preview.selected?.identity);
        return <article className="version-card" data-preview-id={previewId} key={previewId}>
          <header className="version-header"><div><h2>{panelTitle}</h2><code>{preview.branch}</code><p>{panelDescription}</p></div><div className="preview-health"><span className={`version-status status-${preview.status}`}>{preview.status === 'ready' ? 'Live and synchronized' : readablePhase(operation)}</span><button className="text-action" onClick={() => startPreview(previewId)} disabled={!preview.branch || !state.repositoryClean}>Restart live app</button></div></header>
          {preview.errors.runtime && <div className="error" role="alert"><strong>This live app could not load.</strong> {preview.errors.runtime}<button onClick={() => startPreview(previewId)}>Try again</button></div>}
          {!combinedPreview && preview.invalidation && <div className="warning-message"><strong>The previous choice was cleared.</strong><span>{preview.invalidation}</span></div>}
          {preview.errors.bridge && <div className="error" role="alert"><strong>A stale preview message was rejected.</strong> {preview.errors.bridge}</div>}
          {preview.errors.selection && <div className="error" role="alert"><strong>That area could not be selected.</strong> {preview.errors.selection.reason}</div>}
          {!combinedPreview && <div className="guided-selection">
            <div><span>{preview.analysis.status === 'resolved' ? 'Selected' : 'Select a branch-specific change'}</span><strong>{preview.analysis.status === 'loading' ? 'Finding its required source code…' : preview.analysis.status === 'resolved' ? selectedLabel : preview.analysis.status === 'refused' ? 'Choose a narrower feature' : presentation.selectionPrompt}</strong></div>
            <button className={preview.selecting ? 'selection-active' : 'primary-action'} onClick={() => toggleSelection(previewId)} disabled={preview.status !== 'ready' || preview.analysis.status === 'loading'}>{preview.selecting ? 'Cancel choosing' : preview.selected ? 'Change' : 'Choose feature'}</button>
          </div>}
          {!combinedPreview && preview.selecting && <div className="selection-instruction" role="status"><strong>Highlighted areas are branch-specific UI changes that UI Merge Studio can trace to source.</strong><span><b>Recommended change</b> uses the signal-orange outline. Changed but broader, unchanged, unsupported, or ambiguous areas are stopped or explained after analysis.</span></div>}
          {!combinedPreview && preview.analysis.status === 'resolved' && preview.analysis.artifact && <div className="selection-summary"><div><span>Selected</span><strong>{selectedLabel}</strong></div><div><button className={confirmedSelections[previewId] ? 'confirmed-action' : 'primary-action'} onClick={() => setConfirmedSelections(current => ({ ...current, [previewId]: true }))} disabled={confirmedSelections[previewId]}>{confirmedSelections[previewId] ? 'Selection confirmed' : 'Confirm selection'}</button><button className="text-action" onClick={() => toggleSelection(previewId)}>Change</button><button className="evidence-link" onClick={() => setTechnicalOpen(true)}>View source evidence</button></div></div>}
          {preview.analysis.status === 'partial' && <div className="warning-message"><strong>This feature needs review.</strong><span>Its supporting code could not be separated completely. Open Technical details for the exact evidence.</span></div>}
          {preview.analysis.status === 'refused' && <div className="error" role="alert"><strong>{guidedPolicyRefusal ? 'This selection was stopped before branch creation.' : 'This source selection could not be analyzed safely.'}</strong> {preview.analysis.error ?? (guidedPolicyRefusal ? 'Choose the focused example feature instead.' : 'Choose another visible area or inspect the technical evidence.')}<button onClick={() => toggleSelection(previewId)}>Choose again</button></div>}
          <div className="frame-shell" style={{ maxWidth: state.viewport.width }}>
            {preview.session ? <iframe ref={node => { frames.current[previewId] = node; }} title={`${panelTitle} live application`} src={preview.session.url} /> : <div className="placeholder"><span>{operation && !terminalPreviewStates.has(operation.state) ? readablePhase(operation) : 'Preparing this branch…'}</span>{operation && !terminalPreviewStates.has(operation.state) && <progress aria-label={`${panelTitle} preparation progress`} />}</div>}
          </div>
        </article>;
      })}
    </main>
    <section className="sync-summary" aria-label="Synchronization status"><span className={readyCount === 2 ? 'sync-ok' : ''}>↔</span><div><strong>{readyCount === 2 ? 'Live apps linked' : 'Linking live apps'}</strong><span>{state.synchronizationStatus}</span></div></section>
    {!resultBranch && <CandidatePanel inputs={generationInputs} onRevise={reviseSelections} onEvidence={() => setTechnicalOpen(true)} onLaunch={branch => { setResultBranch(branch); setResultView('result'); setComparisonLayout('right'); dispatch({ type: 'set-branch', previewId: 'right', branch }); void startPreview('right', branch); }} />}
    {resultBranch && <div className="result-actions"><button className="evidence-link" onClick={() => switchResultView('left')}>Compare sources</button><button className="evidence-link" onClick={() => setTechnicalOpen(true)}>View changed files and verification evidence</button><button className="evidence-link" onClick={() => void navigator.clipboard?.writeText(resultBranch)}>Copy branch name</button></div>}
    <TechnicalDrawer open={technicalOpen} onClose={() => setTechnicalOpen(false)} state={state} operations={operations} onSelectAncestor={(slot, index) => send(slot, 'select-ancestor', { index })} onClear={slot => { send(slot, 'clear-selection'); dispatch({ type: 'clear-selection', previewId: slot }); }} />
  </div>;
}
