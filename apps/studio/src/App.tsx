import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { PreviewSession } from '../../../packages/preview-runtime/src/previewController';
import type { PreviewOperation, PreviewOperationAcknowledgement } from '../../../packages/preview-runtime/src/previewOperations';
import { createStudioCommand, validatePreviewEvent, type ComparisonContext, type PreviewCapabilities, type PreviewMessage, type StudioCommandType } from '../../../packages/shared/src/bridge';
import type { SourceIdentity } from '../../../packages/shared/src/sourceIdentity';
import type { FeatureSliceArtifact } from '../../../packages/source-analysis/src/types';
import type { CandidateGenerationReport, CandidatePreflight } from '../../../packages/candidate-generation/src/types';
import { compareCapabilities, comparisonReducer, initialComparisonState, planContextSynchronization, viewportPresets, type ComparisonState, type PreviewSlotId } from './comparisonState';
import { demoScenario, featureLabel } from './demoScenario';
import { pollPreviewOperation } from './operationPolling';

interface RepositoryResponse { branches: string[]; clean: boolean; sessions: PreviewSession[] }
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
export function CandidatePanel({ inputs, onLaunch }: { inputs: GenerationInput[]; onLaunch: (branch: string) => void }) {
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

  useEffect(() => { setPreflight(null); setReport(null); setError(null); setProgress(ready ? 'Checking that the selected features can be combined safely…' : 'Waiting for two selected features.'); }, [inputKey, ready]);
  useEffect(() => {
    if (!ready || !base) return;
    const controller = new AbortController();
    void fetch('/api/candidate/preflight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request()), signal: controller.signal })
      .then(async response => { const value = await response.json(); if (!response.ok) throw new Error(value.error ?? response.statusText); setPreflight(value as CandidatePreflight); setProgress((value as CandidatePreflight).plan.status === 'ready' ? 'Ready to combine. Safety checks found no conflicts.' : 'These features need review before they can be combined.'); })
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
      setProgress(result.status === 'succeeded' ? 'Combined branch created and verified.' : result.message);
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
      setProgress('Combined branch creation failed safely.');
    } finally {
      progressController.abort();
      await polling;
      setBusy(false);
    }
  }

  const blocked = !ready ? 'Select one supported feature from each version.' : !base ? 'The selected features do not share the same starting point.' : preflight?.plan.status === 'refused' ? 'The safety check found a conflict that needs review.' : null;
  return <section className="combine-tray" aria-label="Selected features and combine action">
    <div className="tray-features">{slots.map((slot, index) => <div key={slot}><span>{index === 0 ? 'Version A' : 'Version B'}</span><strong>{featureLabel(inputs[index]?.artifact)}</strong></div>)}</div>
    <div className="tray-status" role="status" aria-live="polite"><span className={`status-dot ${preflight?.plan.status === 'ready' ? 'is-ready' : ''}`} />{error ?? progress}</div>
    <button className="primary-action" onClick={generateCandidate} disabled={Boolean(blocked) || !preflight || preflight.plan.status !== 'ready' || busy}>{busy ? 'Creating combined branch…' : report?.status === 'succeeded' ? 'Combined branch ready' : 'Create combined branch'}</button>
    {report?.status === 'succeeded' && <button className="secondary-action" onClick={() => onLaunch(report.repository.candidateBranch)}>Open verified result</button>}
    {blocked && <span className="tray-guidance">{blocked}</span>}
    {report && <details className="generation-summary"><summary>Verification summary</summary><p>{report.message}</p><ul>{report.verification.map(item => <li key={item.name}>{item.name}: <strong>{item.status}</strong></li>)}</ul><p>Cleanup: {report.cleanup.detail}</p></details>}
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
  return <div className="drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><aside className="technical-drawer" role="dialog" aria-modal="true" aria-labelledby="technical-title"><header><div><p className="eyebrow">Evidence and diagnostics</p><h2 id="technical-title">Technical details</h2></div><button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close technical details">×</button></header>{slots.map(slot => { const preview = state.previews[slot]; const operation = operations[slot]; return <section className="drawer-version" key={slot}><h2>{slot === 'left' ? 'Version A' : 'Version B'} · {preview.branch}</h2>{operation && <details open><summary>Preview operation · {operation.state}</summary><ol className="phase-list">{operation.phases.map(item => <li key={item.phase}><strong>{item.phase}</strong><span>{item.detail}</span><code>{item.durationMs === null ? 'running' : `${item.durationMs} ms`}</code></li>)}</ol>{operation.error && <div className="error">{operation.error}</div>}</details>}<IdentityPanel title="Hovered boundary" identity={preview.hovered} /><IdentityPanel title="Selected boundary" identity={preview.selected?.identity ?? null} />{preview.selected && <section className="evidence-card"><h3>Eligible ancestors</h3>{preview.selected.ancestors.length ? preview.selected.ancestors.map((identity, index) => <button className="ancestor" key={identity.instanceId} onClick={() => onSelectAncestor(slot, index + 1)}>{identity.componentName ?? identity.repositoryRelativePath}</button>) : <p className="muted">No instrumented ancestor.</p>}<button className="text-action" onClick={() => onClear(slot)}>Clear selection</button></section>}<SlicePanel artifact={preview.analysis.artifact} status={preview.analysis.status} error={preview.analysis.error} /></section>; })}</aside></div>;
}

export function App() {
  const [state, dispatch] = useReducer(comparisonReducer, initialComparisonState);
  const [operations, setOperations] = useState<Record<PreviewSlotId, PreviewOperation | null>>({ left: null, right: null });
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const frames = useRef<Record<PreviewSlotId, HTMLIFrameElement | null>>({ left: null, right: null });
  const operationControllers = useRef<Partial<Record<PreviewSlotId, AbortController>>>({});
  const activeOperationIds = useRef<Partial<Record<PreviewSlotId, string>>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/repository', { signal: controller.signal }).then(response => response.json()).then((value: RepositoryResponse) => {
      const ordered = [demoScenario.versions.left.branch, demoScenario.versions.right.branch, ...value.branches.filter(branch => branch !== demoScenario.versions.left.branch && branch !== demoScenario.versions.right.branch)];
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
      dispatch({ type: 'analysis-finished', previewId, artifact: value as FeatureSliceArtifact });
    } catch (error) { dispatch({ type: 'analysis-failed', previewId, error: error instanceof Error ? error.message : String(error) }); }
  }
  function setViewport(name: keyof typeof viewportPresets) {
    const viewport = viewportPresets[name];
    dispatch({ type: 'set-viewport', viewport });
    for (const previewId of slots) if (state.previews[previewId].session) send(previewId, 'sync-viewport', { operationId: synchronizationId(), viewport });
  }

  const readyCount = slots.filter(id => state.previews[id].status === 'ready').length;
  const generationInputs = useMemo(() => slots.map(id => ({ artifact: state.previews[id].analysis.artifact, status: state.previews[id].analysis.status, sessionId: state.previews[id].session?.sessionId ?? null })), [state.previews.left.analysis, state.previews.right.analysis, state.previews.left.session, state.previews.right.session]);
  const workspaceStatus = readyCount === 2 ? 'Both versions are ready to compare' : readyCount === 1 ? 'One version is ready' : state.repositoryStatus;

  return <div className="studio">
    <header className="product-header"><div><p className="eyebrow">{demoScenario.sampleAppName}</p><h1>{demoScenario.productName}</h1><p className="lede">{demoScenario.task}</p></div><div className="header-actions"><label>Preview size<select aria-label="Preview size" value={state.viewport.preset} onChange={event => setViewport(event.target.value as keyof typeof viewportPresets)}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></label><button className="secondary-action" onClick={() => setTechnicalOpen(true)}>Technical details</button></div></header>
    <WorkflowStepper state={state} />
    <section className="onboarding" aria-label="Demo context"><div><strong>What you’re comparing</strong><span>{demoScenario.sampleAppDescription}</span></div><div><strong>What stays linked</strong><span>Ticket and route stay matched; local visual interactions remain independent.</span></div><button className="primary-action" onClick={startBoth} disabled={!state.repositoryClean || slots.some(id => !state.previews[id].branch)}>Load both versions</button><span role="status">{workspaceStatus}</span></section>
    <main className="comparison" aria-label="Version comparison">
      {slots.map(previewId => {
        const preview = state.previews[previewId];
        const presentation = demoScenario.versions[previewId];
        const operation = operations[previewId];
        const selectedLabel = featureLabel(preview.analysis.artifact ?? preview.selected?.identity);
        return <article className="version-card" data-preview-id={previewId} key={previewId}>
          <header className="version-header"><div><p className="eyebrow">{presentation.eyebrow}</p><h2>{presentation.title}</h2><p>{presentation.description}</p></div><span className={`version-status status-${preview.status}`}>{preview.status === 'ready' ? 'Ready' : readablePhase(operation)}</span></header>
          <div className="version-toolbar"><label>Version source<select aria-label={`${presentation.eyebrow} source`} value={preview.branch} onChange={event => dispatch({ type: 'set-branch', previewId, branch: event.target.value })}>{state.branches.map(branch => <option key={branch}>{branch}</option>)}</select></label><button className="text-action" onClick={() => startPreview(previewId)} disabled={!preview.branch || !state.repositoryClean}>Restart</button><span>{preview.context?.entity?.id ? `Viewing ${preview.context.entity.id}` : 'Ticket list'}</span></div>
          {preview.errors.runtime && <div className="error" role="alert"><strong>This version could not load.</strong> {preview.errors.runtime}<button onClick={() => startPreview(previewId)}>Try again</button></div>}
          {preview.invalidation && <div className="warning-message"><strong>The previous choice was cleared.</strong><span>{preview.invalidation}</span></div>}
          {preview.errors.bridge && <div className="error" role="alert"><strong>A stale preview message was rejected.</strong> {preview.errors.bridge}</div>}
          {preview.errors.selection && <div className="error" role="alert"><strong>That area could not be selected.</strong> {preview.errors.selection.reason}</div>}
          <div className="frame-shell" style={{ maxWidth: state.viewport.width }}>
            {preview.session ? <iframe ref={node => { frames.current[previewId] = node; }} title={`${presentation.title} preview`} src={preview.session.url} style={{ width: state.viewport.width }} /> : <div className="placeholder"><span>{operation && !terminalPreviewStates.has(operation.state) ? readablePhase(operation) : 'Load both versions to begin.'}</span>{operation && !terminalPreviewStates.has(operation.state) && <progress aria-label={`${presentation.eyebrow} preparation progress`} />}</div>}
          </div>
          <div className="guided-selection">
            <div><span>{preview.analysis.status === 'loading' ? 'Understanding feature…' : preview.analysis.status === 'resolved' ? 'Selected feature' : 'Choose a feature'}</span><strong>{preview.analysis.status === 'loading' ? 'Checking the change and its supporting code' : selectedLabel}</strong>{preview.analysis.artifact && <small>{preview.analysis.artifact.slice.includedChanges.length} supported changes · {preview.analysis.artifact.slice.unresolvedDependencies.length ? 'review needed' : 'ready to combine'}</small>}</div>
            <button className={preview.selecting ? 'selection-active' : 'primary-action'} onClick={() => toggleSelection(previewId)} disabled={preview.status !== 'ready' || preview.analysis.status === 'loading'}>{preview.selecting ? 'Cancel choosing' : preview.selected ? 'Choose a different feature' : 'Choose a feature'}</button>
          </div>
          {preview.selecting && <div className="selection-instruction" role="status"><strong>Choose inside this version.</strong><span>Click or keyboard-activate the visible part you want to keep.</span></div>}
          {preview.analysis.status === 'partial' && <div className="warning-message"><strong>This feature needs review.</strong><span>Its supporting code could not be separated completely. Open Technical details for the exact evidence.</span></div>}
          {preview.analysis.status === 'refused' && <div className="error" role="alert"><strong>This feature is not safe to combine.</strong> {preview.analysis.error ?? 'Choose a larger visible area or another feature.'}</div>}
        </article>;
      })}
    </main>
    <section className="sync-summary" aria-label="Synchronization status"><span className={readyCount === 2 ? 'sync-ok' : ''}>↔</span><div><strong>{readyCount === 2 ? 'Versions linked' : 'Linking versions'}</strong><span>{state.synchronizationStatus}</span></div></section>
    <CandidatePanel inputs={generationInputs} onLaunch={branch => { dispatch({ type: 'set-branch', previewId: 'right', branch }); void startPreview('right', branch); }} />
    <TechnicalDrawer open={technicalOpen} onClose={() => setTechnicalOpen(false)} state={state} operations={operations} onSelectAncestor={(slot, index) => send(slot, 'select-ancestor', { index })} onClear={slot => { send(slot, 'clear-selection'); dispatch({ type: 'clear-selection', previewId: slot }); }} />
  </div>;
}
