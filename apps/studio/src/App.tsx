import { useEffect, useReducer, useRef } from 'react';
import type { PreviewSession } from '../../../packages/preview-runtime/src/previewController';
import { createStudioCommand, validatePreviewEvent, type ComparisonContext, type PreviewCapabilities, type PreviewMessage, type StudioCommandType } from '../../../packages/shared/src/bridge';
import type { SourceIdentity } from '../../../packages/shared/src/sourceIdentity';
import { compareCapabilities, comparisonReducer, initialComparisonState, planContextSynchronization, viewportPresets, type PreviewSlotId } from './comparisonState';

interface RepositoryResponse { branches: string[]; clean: boolean; sessions: PreviewSession[] }
const slots: PreviewSlotId[] = ['left', 'right'];
function operationId() { return globalThis.crypto?.randomUUID?.() ?? `sync-${Date.now()}-${Math.random()}`; }

function IdentityPanel({ identity, title }: { identity: SourceIdentity | null; title: string }) {
  return <section className="panel"><h2>{title}</h2>{identity ? <dl><dt>Component</dt><dd>{identity.componentName ?? 'Anonymous'}</dd><dt>Source</dt><dd><code>{identity.repositoryRelativePath}:{identity.line}:{identity.column}</code></dd><dt>Definition boundary</dt><dd><code>{identity.boundaryId}</code></dd><dt>Runtime instance</dt><dd><code>{identity.instanceId}</code></dd><dt>Preview session</dt><dd><code>{identity.previewId} / {identity.sessionId.slice(0, 8)} / g{identity.generation}</code></dd><dt>Branch</dt><dd>{identity.branch}</dd><dt>Mapping</dt><dd>{identity.confidence}</dd></dl> : <p className="muted">None</p>}</section>;
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

  async function startPreview(previewId: PreviewSlotId) {
    const branch = branchChoices.current[previewId] ?? branchControls.current[previewId]?.value ?? state.previews[previewId].branch;
    dispatch({ type: 'preview-starting', previewId });
    try {
      const response = await fetch(`/api/previews/${previewId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? response.statusText);
      dispatch({ type: 'preview-started', previewId, session: value as PreviewSession });
    } catch (error) { dispatch({ type: 'preview-failed', previewId, error: error instanceof Error ? error.message : String(error) }); }
  }
  async function startBoth() { await Promise.all(slots.map(startPreview)); }
  function toggleSelection(previewId: PreviewSlotId) { const preview = state.previews[previewId]; send(previewId, preview.selecting ? 'disable-selection' : 'enable-selection'); }
  function clearSelection(previewId: PreviewSlotId) { send(previewId, 'clear-selection'); dispatch({ type: 'clear-selection', previewId }); }
  function setViewport(name: keyof typeof viewportPresets) {
    const viewport = viewportPresets[name];
    dispatch({ type: 'set-viewport', viewport });
    for (const previewId of slots) if (state.previews[previewId].session) send(previewId, 'sync-viewport', { operationId: operationId(), viewport });
  }
  const ready = slots.filter(id => state.previews[id].status === 'ready').length;
  const workspaceStatus = ready === 2 ? 'Both previews ready' : ready === 1 ? 'Preview ready' : state.repositoryStatus;

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
          {preview.session && <div className="selection-controls"><button onClick={() => toggleSelection(previewId)}>{preview.selecting ? 'Exit selection mode' : 'Enter selection mode'}</button><button onClick={() => clearSelection(previewId)} disabled={!preview.selected && !preview.hovered}>Clear selection</button></div>}
          {preview.session && <div className="preview-details"><IdentityPanel title="Hovered boundary" identity={preview.hovered} /><IdentityPanel title="Selected boundary" identity={preview.selected?.identity ?? null} />{preview.selected && <section className="panel"><h2>Eligible ancestors</h2>{preview.selected.ancestors.length ? preview.selected.ancestors.map((identity, ancestorIndex) => <button className="ancestor" key={`${identity.instanceId}-${ancestorIndex}`} onClick={() => send(previewId, 'select-ancestor', { index: ancestorIndex + 1 })}>{identity.componentName ?? identity.repositoryRelativePath}</button>) : <p className="muted">No instrumented ancestor.</p>}</section>}</div>}
        </article>;
      })}
    </main>
    <section className="combined panel"><h2>Combined selection summary</h2><div>{slots.map(previewId => { const selected = state.previews[previewId].selected?.identity; return <article key={previewId}><strong>{state.previews[previewId].branch || previewId}</strong>{selected ? <p>{selected.componentName ?? 'Anonymous'} · <code>{selected.repositoryRelativePath}:{selected.line}:{selected.column}</code> · {selected.confidence}</p> : <p className="muted">No active selection.</p>}</article>; })}</div></section>
  </div>;
}
