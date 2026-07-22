import { useEffect, useReducer, useRef, useState } from 'react';
import type { PreviewSession } from '../../../packages/preview-runtime/src/previewController';
import { createStudioCommand, validatePreviewEvent, type ComparisonContext, type PreviewCapabilities, type PreviewMessage, type StudioCommandType } from '../../../packages/shared/src/bridge';
import type { SourceIdentity } from '../../../packages/shared/src/sourceIdentity';
import type { FeatureSliceArtifact } from '../../../packages/source-analysis/src/types';
import type { CandidateGenerationReport, CandidatePreflight } from '../../../packages/candidate-generation/src/types';
import { compareCapabilities, comparisonReducer, initialComparisonState, planContextSynchronization, viewportPresets, type PreviewSlotId } from './comparisonState';

interface RepositoryResponse { branches: string[]; clean: boolean; sessions: PreviewSession[] }
const slots: PreviewSlotId[] = ['left', 'right'];
function operationId() { return globalThis.crypto?.randomUUID?.() ?? `sync-${Date.now()}-${Math.random()}`; }

function IdentityPanel({ identity, title }: { identity: SourceIdentity | null; title: string }) {
  return <section className="panel"><h2>{title}</h2>{identity ? <dl><dt>Component</dt><dd>{identity.componentName ?? 'Anonymous'}</dd><dt>Source</dt><dd><code>{identity.repositoryRelativePath}:{identity.line}:{identity.column}</code></dd><dt>Definition boundary</dt><dd><code>{identity.boundaryId}</code></dd><dt>Runtime instance</dt><dd><code>{identity.instanceId}</code></dd><dt>Preview session</dt><dd><code>{identity.previewId} / {identity.sessionId.slice(0, 8)} / g{identity.generation}</code></dd><dt>Branch</dt><dd>{identity.branch}</dd><dt>Mapping</dt><dd>{identity.confidence}</dd></dl> : <p className="muted">None</p>}</section>;
}
function TestSlices({ artifact }: { artifact: FeatureSliceArtifact }) {
  if (!artifact.slice.testFileSlices.length) return null;
  return <section className="test-slices"><h3>Test-file slices</h3>{artifact.slice.testFileSlices.map(file => <article className={`test-slice test-slice-${file.mode}`} key={file.path}><h4><code>{file.path}</code></h4><p><strong>Mode:</strong> {file.mode}</p><h5>Included test units</h5>{file.includedUnits.length ? <ul>{file.includedUnits.map(unit => <li key={unit.id}><strong>{unit.title ?? unit.kind}</strong><code>{unit.kind} · lines {unit.region.startLine}-{unit.region.endLine}</code><span>{unit.reason}</span></li>)}</ul> : <p className="muted">None</p>}<h5>Excluded test units</h5>{file.excludedUnits.length ? <ul>{file.excludedUnits.map(unit => <li key={unit.id}><strong>{unit.title ?? unit.kind}</strong><code>{unit.kind} · lines {unit.region.startLine}-{unit.region.endLine}</code><span>{unit.reason}</span><small>{unit.proof}</small></li>)}</ul> : <p className="muted">None</p>}<h5>Required import specifiers</h5>{file.requiredImports.length ? <ul>{file.requiredImports.map(item => <li key={`${item.source}:${item.local}`}><code>{item.local} ← {item.source}#{item.imported}</code></li>)}</ul> : <p className="muted">None</p>}<h5>Excluded import specifiers</h5>{file.excludedImports.length ? <ul>{file.excludedImports.map(item => <li key={`${item.source}:${item.local}`}><code>{item.local} ← {item.source}#{item.imported}</code></li>)}</ul> : <p className="muted">None</p>}{file.requiredSupportDeclarations.length > 0 && <><h5>Required support declarations</h5><ul>{file.requiredSupportDeclarations.map(item => <li key={`${item.name}:${item.region.startLine}`}><strong>{item.name}</strong><span>{item.kind} · lines {item.region.startLine}-{item.region.endLine}</span></li>)}</ul></>}{file.unresolvedDependencies.length > 0 && <div className="warning"><strong>Partial test slicing:</strong><ul>{file.unresolvedDependencies.map(item => <li key={`${item.path}:${item.reason}`}>{item.reason}</li>)}</ul></div>}</article>)}</section>;
}
export function SlicePanel({ artifact, status, error }: { artifact: FeatureSliceArtifact | null; status: string; error: string | null }) {
  if (status === 'idle') return <section className="slice-panel panel"><h2>Feature slice</h2><p className="muted">Select a source-mapped boundary, then run analysis.</p></section>;
  if (status === 'loading') return <section className="slice-panel panel" aria-busy="true"><h2>Feature slice</h2><p>Analyzing Git and AST evidence…</p></section>;
  if (!artifact) return <section className="slice-panel panel"><h2>Feature slice</h2><div className="error"><strong>Analysis refused:</strong> {error}</div></section>;
  const slice = artifact.slice;
  return <section className={`slice-panel panel slice-${status}`}><h2>Feature slice · {slice.status}</h2>{status === 'stale' && <div className="notice"><strong>Stale analysis:</strong> {error}</div>}<dl className="slice-meta"><dt>Original boundary</dt><dd>{slice.boundary.original}</dd><dt>Analyzed boundary</dt><dd>{slice.boundary.analyzed}</dd><dt>Expansion</dt><dd>{slice.boundary.reason}</dd><dt>Merge base</dt><dd><code>{slice.repository.mergeBaseCommit.slice(0, 12)}</code></dd><dt>Branch commit</dt><dd><code>{slice.repository.branchCommit.slice(0, 12)}</code></dd></dl><h3>Included changes</h3>{slice.includedChanges.length ? <ul className="change-list included-list">{slice.includedChanges.map(item => <li key={item.branchChangeId}><strong>{item.symbol?.name ?? item.path}</strong><code>{item.path}{item.symbol ? `:${item.symbol.region.startLine}` : ''}</code><span>{item.reason}</span><small>{item.category} · {item.confidence} · {item.wholeFile ? 'whole file' : 'symbol/region'}</small></li>)}</ul> : <p className="muted">None</p>}<TestSlices artifact={artifact} /><h3>Excluded branch changes</h3>{slice.excludedChanges.length ? <ul className="change-list excluded-list">{slice.excludedChanges.map(item => <li key={item.branchChangeId}><strong>{item.symbol?.name ?? item.path}</strong><code>{item.path}</code><span>{item.reason}</span><small>{item.classification} · {item.proof}</small></li>)}</ul> : <p className="muted">None</p>}<h3>Unresolved dependencies</h3>{slice.unresolvedDependencies.length ? <ul className="change-list unresolved-list">{slice.unresolvedDependencies.map(item => <li key={`${item.path}:${item.reason}`}><code>{item.path}</code><span>{item.reason}</span><small>{item.manualNextStep}</small></li>)}</ul> : <p className="muted">None</p>}<a className="artifact-link" href={`/api/analysis/${artifact.analysisId}`} download>Download deterministic JSON</a></section>;
}

type GenerationInput = { artifact: FeatureSliceArtifact | null; status: string; sessionId: string | null };
export function CandidatePanel({ inputs, onLaunch }: { inputs: GenerationInput[]; onLaunch: (branch:string)=>void }) {
  const [preflight,setPreflight]=useState<CandidatePreflight|null>(null);const[report,setReport]=useState<CandidateGenerationReport|null>(null);const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);const candidateBranch='combined-result';
  const inputKey=inputs.map(item=>`${item.artifact?.analysisId??'none'}:${item.status}:${item.sessionId??'none'}`).join('|');
  useEffect(()=>{setPreflight(null);setReport(null);setBusy(false);setError(null);},[inputKey]);
  const artifacts=inputs.map(item=>item.artifact).filter((item):item is FeatureSliceArtifact=>Boolean(item));const ready=inputs.length===2&&artifacts.length===2&&inputs.every(item=>item.status==='resolved')&&artifacts.every(item=>item.slice.status==='resolved');const base=ready&&new Set(artifacts.map(item=>item.slice.repository.mergeBaseCommit)).size===1?artifacts[0].slice.repository.mergeBaseCommit:null;
  const request=()=>({expectedBaseCommit:base,candidateBranch,artifacts,analyzerSchemaVersion:artifacts[0]?.slice.version??0});
  async function preflightCandidate(){setBusy(true);setError(null);setReport(null);try{const response=await fetch('/api/candidate/preflight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request())});const value=await response.json();if(!response.ok)throw new Error(value.error??response.statusText);setPreflight(value as CandidatePreflight);}catch(value){setError(value instanceof Error?value.message:String(value));}finally{setBusy(false);}}
  async function generateCandidate(){setBusy(true);setError(null);setReport(null);try{const response=await fetch('/api/candidate/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request())});const value=await response.json();if(!response.ok)throw new Error(value.error??response.statusText);setReport(value as CandidateGenerationReport);}catch(value){setError(value instanceof Error?value.message:String(value));}finally{setBusy(false);}}
  const blocked=!ready?'Two current resolved slices are required.':!base?'Resolved slices must share one exact base commit.':null;
  return <section className="candidate panel"><h2>Candidate generation</h2><p><strong>Candidate branch:</strong> <code>{candidateBranch}</code></p><p><strong>Selected resolved slices:</strong> {artifacts.length?artifacts.map(item=>item.analysisId).join(', '):'none'}</p><p><strong>Base commit:</strong> <code>{base?.slice(0,12)??'unavailable'}</code></p>{blocked&&<div className="refusal"><strong>Generation blocked:</strong> {blocked}</div>}<div className="candidate-actions"><button onClick={preflightCandidate} disabled={!ready||!base||busy}>Prepare candidate plan</button><button onClick={generateCandidate} disabled={!preflight||preflight.plan.status!=='ready'||busy}>Generate candidate</button>{report?.status==='succeeded'&&<button onClick={()=>onLaunch(report.repository.candidateBranch)}>Launch candidate</button>}</div>{busy&&<div className="notice"><strong>Candidate generation in progress.</strong> Validate → plan → transform → verify → commit</div>}{error&&<div className="error"><strong>Candidate request failed:</strong> {error}</div>}{preflight&&<section className={preflight.plan.status==='ready'?'candidate-ready':'refusal'}><h3>Preflight: {preflight.plan.status}</h3><p>{preflight.plan.operations.length} operations across {new Set(preflight.plan.operations.map(item=>item.target.path)).size} files.</p>{preflight.plan.conflicts.map(item=><p key={item.id}><strong>{item.path}{item.symbol?`#${item.symbol}`:''}:</strong> {item.reason}</p>)}{preflight.plan.unresolved.map(item=><p key={`${item.path}:${item.reason}`}><strong>{item.path}:</strong> {item.reason}</p>)}</section>}{report&&<section className={`candidate-report candidate-${report.status}`}><h3>Generation {report.status}</h3><p>{report.message}</p><ol className="candidate-stages">{['validate','plan','transform','verify','commit'].map(stage=><li key={stage}>{stage}</li>)}</ol>{report.repository.candidateCommit&&<p><strong>Commit:</strong> <code>{report.repository.candidateCommit}</code><br/><strong>Tree:</strong> <code>{report.repository.candidateTree}</code>{report.repository.idempotent&&<> · idempotent</>}</p>}<p><strong>Worktree/process cleanup:</strong> {report.cleanup.detail}</p><h3>Changed-file audit</h3><ul>{[...new Set(report.appliedOperations.map(item=>item.path))].sort().map(path=><li key={path}><code>{path}</code></li>)}</ul><h3>Verification</h3><ul>{report.verification.map(item=><li key={item.name}>{item.name}: <strong>{item.status}</strong></li>)}</ul>{report.conflicts.map(item=><div className="refusal" key={item.id}><strong>{item.path}:</strong> {item.reason}</div>)}<a className="artifact-link" href={`/api/candidate/reports/${report.generationId}`} download>Download candidate report</a></section>}</section>;
}

export function App() {
  const [state, dispatch] = useReducer(comparisonReducer, initialComparisonState);
  const frames = useRef<Record<PreviewSlotId, HTMLIFrameElement | null>>({ left: null, right: null });
  const branchControls = useRef<Record<PreviewSlotId, HTMLSelectElement | null>>({ left: null, right: null });
  const branchChoices = useRef<Partial<Record<PreviewSlotId, string>>>({});

  useEffect(() => { fetch('/api/repository').then(response => response.json()).then((value: RepositoryResponse) => dispatch({ type: 'repository-loaded', branches: value.branches, clean: value.clean })).catch(error => dispatch({ type: 'repository-failed', error: String(error) })); }, []);
  useEffect(() => {
    const left = state.previews.left.capabilities; const right = state.previews.right.capabilities;
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
  function negotiatedCapabilities(previewId: PreviewSlotId, capabilities: PreviewCapabilities) {
    const otherId: PreviewSlotId = previewId === 'left' ? 'right' : 'left';
    const result = compareCapabilities(capabilities, state.previews[otherId].capabilities);
    dispatch({ type: 'sync-status', status: result.reason, error: result.compatible ? null : result.reason });
  }
  function handleMessage(previewId: PreviewSlotId, message: PreviewMessage) {
    dispatch({ type: 'preview-message', previewId, message });
    if (message.type === 'preview-ready') {
      const payload = message.payload as { capabilities: PreviewCapabilities; context: ComparisonContext };
      negotiatedCapabilities(previewId, payload.capabilities);
      const otherId: PreviewSlotId = previewId === 'left' ? 'right' : 'left';
      const compatibility = compareCapabilities(payload.capabilities, state.previews[otherId].capabilities);
      if (compatibility.compatible && state.previews[otherId].status === 'ready') {
        const id = operationId();
        send(previewId, 'sync-context', { operationId: id, sourcePreviewId: otherId, context: state.previews[otherId].context ?? payload.context });
      }
    }
    if (message.type === 'navigation-changed') {
      const payload = message.payload as { operationId: string | null; context: ComparisonContext };
      dispatch({ type: 'canonical-context', context: payload.context });
      const plan = planContextSynchronization(state, previewId, payload.context, payload.operationId, operationId());
      dispatch({ type: 'sync-status', status: plan.reason, error: plan.target ? null : plan.reason });
      if (plan.target) send(plan.target, 'sync-context', { operationId: plan.operationId, sourcePreviewId: previewId, context: plan.context });
    }
    if (message.type === 'preview-state') dispatch({ type: 'sync-status', status: 'Route and selected ticket synchronized; reflected acknowledgements are suppressed.', error: null });
  }

  async function startPreview(previewId: PreviewSlotId, overrideBranch?:string) {
    const branch = overrideBranch ?? branchChoices.current[previewId] ?? branchControls.current[previewId]?.value ?? state.previews[previewId].branch;
    dispatch({ type: 'preview-starting', previewId });
    try {
      const response = await fetch(`/api/previews/${previewId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? response.statusText);
      dispatch({ type: 'preview-started', previewId, session: value as PreviewSession });
    } catch (error) { dispatch({ type: 'preview-failed', previewId, error: error instanceof Error ? error.message : String(error) }); }
  }
  async function startBoth() { await Promise.all(slots.map(previewId=>startPreview(previewId))); }
  function toggleSelection(previewId: PreviewSlotId) { const preview = state.previews[previewId]; send(previewId, preview.selecting ? 'disable-selection' : 'enable-selection'); }
  function clearSelection(previewId: PreviewSlotId) { send(previewId, 'clear-selection'); dispatch({ type: 'clear-selection', previewId }); }
  async function analyzeSelection(previewId: PreviewSlotId) { const selection = state.previews[previewId].selected?.identity; if (!selection) return; dispatch({ type: 'analysis-started', previewId }); try { const response = await fetch(`/api/previews/${previewId}/analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selection }) }); const value = await response.json(); if (!response.ok) throw new Error(value.error ?? response.statusText); dispatch({ type: 'analysis-finished', previewId, artifact: value as FeatureSliceArtifact }); } catch (error) { dispatch({ type: 'analysis-failed', previewId, error: error instanceof Error ? error.message : String(error) }); } }
  function setViewport(name: keyof typeof viewportPresets) {
    const viewport = viewportPresets[name];
    dispatch({ type: 'set-viewport', viewport });
    for (const previewId of slots) if (state.previews[previewId].session) send(previewId, 'sync-viewport', { operationId: operationId(), viewport });
  }
  const ready = slots.filter(id => state.previews[id].status === 'ready').length;
  const workspaceStatus = ready === 2 ? 'Both previews ready' : ready === 1 ? 'Preview ready' : state.repositoryStatus;
  const generationInputs=slots.map(id=>({artifact:state.previews[id].analysis.artifact,status:state.previews[id].analysis.status,sessionId:state.previews[id].session?.sessionId??null}));

  return <div className="studio">
    <header><p className="eyebrow">Phase 0 comparison experiment</p><h1>Cross-branch React comparison</h1><p className="lede">Two isolated runtimes, one validated comparison context.</p></header>
    <section className="controls" aria-label="Comparison controls">
      <label>Viewport preset<select aria-label="Viewport preset" value={state.viewport.preset} onChange={event => setViewport(event.target.value as keyof typeof viewportPresets)}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></label>
      <button onClick={startBoth} disabled={!state.repositoryClean || slots.some(id => !state.previews[id].branch)}>Launch both previews</button>
      <span role="status">{workspaceStatus}</span>
    </section>
    <section className="sync-strip" aria-label="Synchronization status"><strong>Synchronization</strong><span>{state.synchronizationStatus}</span><small>Viewport: synchronized · Local sidebar state: independent</small></section>
    <main className="comparison">
      {slots.map((previewId, index) => {
        const preview = state.previews[previewId];
        const branchLabel = index === 0 ? 'Fixture branch' : 'Fixture branch B';
        const startLabel = index === 0 ? 'Start / restart preview' : 'Start / restart preview B';
        return <article className="preview-card" data-preview-id={previewId} key={previewId}>
          <div className="preview-toolbar"><label>{index === 0 ? 'Branch A' : 'Branch B'}<select ref={node => { branchControls.current[previewId] = node; }} aria-label={branchLabel} value={preview.branch} onChange={event => { branchChoices.current[previewId] = event.target.value; dispatch({ type: 'set-branch', previewId, branch: event.target.value }); }}>{state.branches.map(name => <option key={name}>{name}</option>)}</select></label><button onClick={() => startPreview(previewId)} disabled={!preview.branch || !state.repositoryClean}>{startLabel}</button><span className={`status status-${preview.status}`}>{preview.status}</span></div>
          {preview.session && <p className="session-line"><strong>{preview.branch}</strong> · preview {preview.session.previewId} · session {preview.session.sessionId.slice(0, 8)} · generation {preview.session.generation} · port {preview.session.port}</p>}
          {preview.context && <p className="context-line">Route: <code>{preview.context.route}</code> · Ticket context: <strong>{preview.context.entity?.id ?? 'none'}</strong></p>}
          {preview.invalidation && <div className="notice">{preview.invalidation}</div>}
          {preview.errors.runtime && <div className="error" role="alert"><strong>Preview runtime failure:</strong> {preview.errors.runtime}</div>}
          {preview.errors.bridge && <div className="error" role="alert"><strong>Bridge validation failure:</strong> {preview.errors.bridge}</div>}
          {preview.errors.synchronization && <div className="refusal"><strong>Synchronization refusal:</strong> {preview.errors.synchronization}</div>}
          {preview.errors.selection && <div className="error" role="alert"><strong>Selection refusal:</strong> {preview.errors.selection.reason}<br />{preview.errors.selection.evidence}</div>}
          <div className="frame-shell" style={{ maxWidth: state.viewport.width }}>
            {preview.session ? <iframe ref={node => { frames.current[previewId] = node; }} title={`${preview.branch} preview`} src={preview.session.url} style={{ width: state.viewport.width, height: state.viewport.height }} /> : <div className="placeholder">Start this branch preview.</div>}
          </div>
          {preview.session && <div className="selection-controls"><button onClick={() => toggleSelection(previewId)}>{preview.selecting ? 'Exit selection mode' : 'Enter selection mode'}</button><button onClick={() => clearSelection(previewId)} disabled={!preview.selected && !preview.hovered}>Clear selection</button><button onClick={() => analyzeSelection(previewId)} disabled={!preview.selected || preview.analysis.status === 'loading'}>{preview.analysis.status === 'loading' ? 'Analyzing feature…' : 'Analyze feature slice'}</button></div>}
          {preview.session && <div className="preview-details"><IdentityPanel title="Hovered boundary" identity={preview.hovered} /><IdentityPanel title="Selected boundary" identity={preview.selected?.identity ?? null} />{preview.selected && <section className="panel"><h2>Eligible ancestors</h2>{preview.selected.ancestors.length ? preview.selected.ancestors.map((identity, ancestorIndex) => <button className="ancestor" key={`${identity.instanceId}-${ancestorIndex}`} onClick={() => send(previewId, 'select-ancestor', { index: ancestorIndex + 1 })}>{identity.componentName ?? identity.repositoryRelativePath}</button>) : <p className="muted">No instrumented ancestor.</p>}</section>}</div>}
          {preview.session && <SlicePanel artifact={preview.analysis.artifact} status={preview.analysis.status} error={preview.analysis.error} />}
        </article>;
      })}
    </main>
    <section className="combined panel"><h2>Combined selection summary</h2><div>{slots.map(previewId => { const selected = state.previews[previewId].selected?.identity; return <article key={previewId}><strong>{state.previews[previewId].branch || previewId}</strong>{selected ? <p>{selected.componentName ?? 'Anonymous'} · <code>{selected.repositoryRelativePath}:{selected.line}:{selected.column}</code> · {selected.confidence}</p> : <p className="muted">No active selection.</p>}</article>; })}</div></section>
    <CandidatePanel inputs={generationInputs} onLaunch={branch=>{branchChoices.current.right=branch;dispatch({type:'set-branch',previewId:'right',branch});void startPreview('right',branch);}} />
  </div>;
}
