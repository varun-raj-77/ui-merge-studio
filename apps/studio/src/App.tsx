import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { PreviewOperation, PreviewOperationAcknowledgement } from '../../../packages/preview-runtime/src/previewOperations';
import { createStudioCommand, validatePreviewEvent, type ComparisonContext, type PreviewCapabilities, type PreviewMessage, type StudioCommandType } from '../../../packages/shared/src/bridge';
import type { RenderedBoundarySelection } from '../../../packages/shared/src/sourceIdentity';
import type { CandidateGenerationReport } from '../../../packages/candidate-generation/src/types';
import type { IntegrationFoundation } from '../../../packages/integration-plan/src/integrationPlan';
import type { LocalIntegrationSelection } from '../../../packages/integration-plan/src/localPlan';
import { CandidatePanel, type GenerationInput } from './CandidatePanel';
import { compareCapabilities, comparisonReducer, initialComparisonState, planContextSynchronization, viewportPresets, type PreviewSlotId } from './comparisonState';
import { featureLabel } from './demoScenario';
import { EvidenceDrawer, SlicePanel } from './EvidenceDrawer';
import { pollPreviewOperation } from './operationPolling';
import { BranchContextBar, CommandPalette, PreviewPane, ProjectContext, ResizableComparison, ResultWorkspace, projectName, type WorkspaceCommand } from './WorkspaceComponents';
import { emptyCandidateUiState, type CandidateUiState, type EvidenceTab, type RepositoryResponse } from './studioTypes';

const slots: PreviewSlotId[] = ['left', 'right'];
const terminalPreviewStates = new Set(['ready', 'failed', 'cancelled', 'superseded']);
function synchronizationId() { return globalThis.crypto?.randomUUID?.() ?? `sync-${Date.now()}-${Math.random()}`; }
function unique(values: string[]) { return [...new Set(values)]; }

export function App() {
  const [state, dispatch] = useReducer(comparisonReducer, initialComparisonState);
  const [repository, setRepository] = useState<RepositoryResponse | null>(null);
  const [operations, setOperations] = useState<Record<PreviewSlotId, PreviewOperation | null>>({ left: null, right: null });
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceTab, setEvidenceTab] = useState<EvidenceTab>('selection');
  const [commandOpen, setCommandOpen] = useState(false);
  const [comparisonLayout, setComparisonLayout] = useState<'both' | PreviewSlotId>('both');
  const [selectionRequested, setSelectionRequested] = useState(false);
  const [candidateBranch, setCandidateBranch] = useState('combined-result');
  const [foundation, setFoundation] = useState<IntegrationFoundation | null>(null);
  const [planSelections, setPlanSelections] = useState<Record<PreviewSlotId, LocalIntegrationSelection | null>>({ left: null, right: null });
  const [candidateUi, setCandidateUi] = useState<CandidateUiState>(emptyCandidateUiState);
  const [resultReport, setResultReport] = useState<CandidateGenerationReport | null>(null);
  const [resultSources, setResultSources] = useState<{ branch: string; label: string }[]>([]);
  const frames = useRef<Record<PreviewSlotId, HTMLIFrameElement | null>>({ left: null, right: null });
  const operationControllers = useRef<Partial<Record<PreviewSlotId, AbortController>>>({});
  const activeOperationIds = useRef<Partial<Record<PreviewSlotId, string>>>({});

  const openEvidence = useCallback((tab: EvidenceTab = 'selection') => { setEvidenceTab(tab); setEvidenceOpen(true); }, []);
  const closeEvidence = useCallback(() => setEvidenceOpen(false), []);
  const closeCommands = useCallback(() => setCommandOpen(false), []);
  const updateCandidateUi = useCallback((next: CandidateUiState) => setCandidateUi(next), []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/repository', { signal: controller.signal })
      .then(async response => {
        const value = await response.json() as RepositoryResponse & { error?: string };
        if (!response.ok) throw new Error(value.error ?? response.statusText);
        const preferred = (value.preferredBranches ?? []).filter(branch => value.branches.includes(branch));
        const fixtureDefaults = ['branch-a', 'branch-b'].filter(branch => value.branches.includes(branch));
        const sources = value.branches.filter(branch => branch !== value.foundation.branchRef);
        const ordered = unique([...preferred, ...fixtureDefaults, ...sources, ...value.branches]);
        setRepository(value);
        setCandidateBranch(value.candidateBranch ?? 'combined-result');
        setFoundation(value.foundation);
        dispatch({ type: 'repository-loaded', branches: ordered, clean: value.clean });
      })
      .catch(error => { if ((error as Error).name !== 'AbortError') dispatch({ type: 'repository-failed', error: error instanceof Error ? error.message : String(error) }); });
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
    if (message.type === 'preview-state') dispatch({ type: 'sync-status', status: 'Route and product context match in both versions.', error: null });
    if (message.type === 'boundary-selected') {
      const selection = message.payload as RenderedBoundarySelection;
      send(previewId, 'disable-selection');
      if (slots.every(id => id === previewId || Boolean(state.previews[id].selected))) {
        setSelectionRequested(false);
        for (const slot of slots) send(slot, 'disable-selection');
      }
      void analyzeRenderedSelection(previewId, selection.selectionReceipt);
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
    setPlanSelections(current => ({ ...current, [previewId]: null }));
    try {
      const response = await fetch(`/api/previews/${previewId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch }), signal: controller.signal });
      const acknowledgement = await response.json() as PreviewOperationAcknowledgement | { error?: string };
      if (!response.ok) throw new Error('error' in acknowledgement && acknowledgement.error ? acknowledgement.error : response.statusText);
      const operationId = (acknowledgement as PreviewOperationAcknowledgement).operationId;
      activeOperationIds.current[previewId] = operationId;
      const operation = await pollPreviewOperation(operationId, { signal: controller.signal, onUpdate: value => {
        if (activeOperationIds.current[previewId] === operationId) setOperations(current => ({ ...current, [previewId]: value }));
      } });
      if (activeOperationIds.current[previewId] !== operationId) return;
      if (operation.state === 'ready' && operation.result) dispatch({ type: 'preview-started', previewId, session: operation.result });
      else if (terminalPreviewStates.has(operation.state)) dispatch({ type: 'preview-failed', previewId, error: operation.error ?? `The preview launch was ${operation.state}.` });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') dispatch({ type: 'preview-failed', previewId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  async function startBoth() { await Promise.all(slots.map(previewId => startPreview(previewId))); }

  function setSelectionMode(enabled: boolean) {
    setSelectionRequested(enabled);
    for (const previewId of slots) {
      const preview = state.previews[previewId];
      if (preview.status === 'ready') send(previewId, enabled ? 'enable-selection' : 'disable-selection');
    }
  }

  async function analyzeRenderedSelection(previewId: PreviewSlotId, selectionReceipt: string) {
    dispatch({ type: 'analysis-started', previewId });
    try {
      const response = await fetch(`/api/previews/${previewId}/analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selectionReceipt }) });
      const value = await response.json() as { artifact?: import('../../../packages/source-analysis/src/types').FeatureSliceArtifact; selection?: LocalIntegrationSelection; foundation?: IntegrationFoundation; error?: string };
      if (!response.ok) throw new Error(value.error ?? response.statusText);
      if (!value.artifact || !value.selection || !value.foundation) throw new Error('The server did not return canonical selection evidence.');
      dispatch({ type: 'analysis-finished', previewId, artifact: value.artifact });
      setPlanSelections(current => ({ ...current, [previewId]: value.selection! }));
      setFoundation(value.foundation);
    } catch (error) {
      dispatch({ type: 'analysis-failed', previewId, error: error instanceof Error ? error.message : String(error) });
    }
  }

  function setViewport(name: keyof typeof viewportPresets) {
    const viewport = viewportPresets[name];
    dispatch({ type: 'set-viewport', viewport });
    for (const previewId of slots) if (state.previews[previewId].session) send(previewId, 'sync-viewport', { operationId: synchronizationId(), viewport });
  }

  function reviseSelections() {
    for (const slot of slots) {
      send(slot, 'clear-selection');
      dispatch({ type: 'clear-selection', previewId: slot });
    }
    setPlanSelections({ left: null, right: null });
    setSelectionRequested(false);
  }

  function clearSelection(slot: PreviewSlotId) {
    send(slot, 'clear-selection');
    dispatch({ type: 'clear-selection', previewId: slot });
    setPlanSelections(current => ({ ...current, [slot]: null }));
  }

  function launchWorkspace() {
    setWorkspaceOpen(true);
    if (!slots.some(slot => state.previews[slot].session || ['starting', 'restarting', 'loading'].includes(state.previews[slot].status))) void startBoth();
  }

  async function stopWorkspace() {
    for (const controller of Object.values(operationControllers.current)) controller?.abort();
    activeOperationIds.current = {};
    await fetch('/api/preview', { method: 'DELETE' }).catch(() => undefined);
    setOperations({ left: null, right: null });
    setResultReport(null);
    setResultSources([]);
    setComparisonLayout('both');
    setPlanSelections({ left: null, right: null });
    setCandidateUi(emptyCandidateUiState);
    dispatch({ type: 'reset-previews' });
  }

  const sourceBranches: [string, string] = [state.branches[0] ?? '', state.branches.find(branch => branch !== state.branches[0]) ?? state.branches[0] ?? ''];
  const readyCount = slots.filter(id => state.previews[id].status === 'ready').length;
  const selectionMode = selectionRequested || slots.some(slot => state.previews[slot].selecting);
  const generationInputs: GenerationInput[] = useMemo(() => slots.map((id, index) => {
    const preview = state.previews[id];
    const active = Boolean(preview.selected);
    return {
      artifact: active ? preview.analysis.artifact : null,
      selection: active ? planSelections[id] : null,
      status: active ? preview.analysis.status : 'idle',
      sessionId: preview.session?.sessionId ?? null,
      visualSelected: active,
      branch: preview.branch,
      sourceLabel: `Source ${index === 0 ? 'A' : 'B'}`
    };
  }), [state.previews.left, state.previews.right, planSelections]);

  function handleCandidateLaunch(report: CandidateGenerationReport) {
    const sources = generationInputs.filter(input => input.visualSelected).map(input => ({ branch: input.branch ?? input.selection?.sourceBranch ?? 'source', label: featureLabel(input.artifact) }));
    setResultSources(sources);
    setResultReport(report);
    setCandidateUi(current => ({ ...current, report, progress: 'Combined branch created and verified.', stage: report.stage }));
    setSelectionRequested(false);
    setComparisonLayout('right');
    dispatch({ type: 'set-branch', previewId: 'right', branch: report.repository.candidateBranch });
    void startPreview('right', report.repository.candidateBranch);
  }

  function returnToComparison() {
    setResultReport(null);
    setResultSources([]);
    setCandidateUi(emptyCandidateUiState);
    setComparisonLayout('both');
    const branch = sourceBranches[1];
    dispatch({ type: 'set-branch', previewId: 'right', branch });
    void startPreview('right', branch);
  }

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); }
      if (event.key === 'Escape' && selectionMode && !commandOpen && !evidenceOpen) setSelectionMode(false);
    };
    addEventListener('keydown', shortcuts);
    return () => removeEventListener('keydown', shortcuts);
  }, [selectionMode, commandOpen, evidenceOpen, state]);

  if (!workspaceOpen) return <ProjectContext repository={repository} status={state.repositoryStatus} onContinue={launchWorkspace} />;

  const commands: WorkspaceCommand[] = resultReport ? [
    { id: 'result', label: 'Open combined preview', action: () => setComparisonLayout('right') },
    { id: 'verification', label: 'Inspect verification evidence', action: () => openEvidence('verification') },
    { id: 'compare', label: 'Return to comparison', action: returnToComparison }
  ] : [
    { id: 'select', label: selectionMode ? 'Exit selection mode' : 'Select parts', shortcut: 'Esc', action: () => setSelectionMode(!selectionMode) },
    { id: 'evidence', label: evidenceOpen ? 'Close evidence' : 'Toggle evidence', action: evidenceOpen ? closeEvidence : () => openEvidence('selection') },
    { id: 'restart-left', label: 'Restart Source A preview', action: () => void startPreview('left') },
    { id: 'restart-right', label: 'Restart Source B preview', action: () => void startPreview('right') },
    { id: 'side-by-side', label: 'Show both source versions', action: () => setComparisonLayout('both') },
    { id: 'project', label: 'Return to project context', action: () => setWorkspaceOpen(false) }
  ];

  const leftPane = <PreviewPane sourceLabel="Source A" preview={state.previews.left} operation={operations.left} viewportWidth={state.viewport.width} iframeRef={node => { frames.current.left = node; }} onRestart={() => void startPreview('left')} onEvidence={() => openEvidence('selection')} onClear={() => clearSelection('left')} />;
  const rightPane = <PreviewPane sourceLabel={resultReport ? 'Combined result' : 'Source B'} preview={state.previews.right} operation={operations.right} viewportWidth={state.viewport.width} iframeRef={node => { frames.current.right = node; }} result={Boolean(resultReport)} planIdentity={resultReport?.integrationPlan?.identity} onRestart={() => void startPreview('right')} onEvidence={() => openEvidence('selection')} onClear={() => clearSelection('right')} />;

  return <div className={`studio-workspace ${evidenceOpen ? 'with-evidence' : ''}`}>
    <header className="app-bar">
      <button className="app-identity" onClick={() => setWorkspaceOpen(false)} aria-label="Return to project context"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span><strong>UI Merge Studio</strong><small>{projectName(repository)}</small></span></button>
      <div className="workspace-phase"><span>{resultReport ? 'Result' : 'Compare'}</span><strong>{resultReport ? 'Verified combined branch' : readyCount === 2 ? 'Two running versions' : `${readyCount}/2 versions running`}</strong></div>
      <div className="app-actions">
        {!resultReport && <button className={`selection-mode-control ${selectionMode ? 'active' : ''}`} onClick={() => setSelectionMode(!selectionMode)} disabled={readyCount === 0}>{selectionMode ? <><i />Selecting · Esc to finish</> : 'Select parts'}</button>}
        <div className="layout-control" aria-label="Preview layout"><button className={comparisonLayout === 'both' ? 'active' : ''} onClick={() => setComparisonLayout('both')} aria-label="Show previews side by side">Both</button><button className={comparisonLayout === 'left' ? 'active' : ''} onClick={() => setComparisonLayout('left')} aria-label="Focus Source A">A</button><button className={comparisonLayout === 'right' ? 'active' : ''} onClick={() => setComparisonLayout('right')} aria-label={resultReport ? 'Focus combined result' : 'Focus Source B'}>{resultReport ? 'Result' : 'B'}</button></div>
        <label className="viewport-control"><span>Viewport</span><select aria-label="Preview size" value={state.viewport.preset} onChange={event => setViewport(event.target.value as keyof typeof viewportPresets)}><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select></label>
        <button className={`evidence-control ${evidenceOpen ? 'active' : ''}`} onClick={() => evidenceOpen ? closeEvidence() : openEvidence(resultReport ? 'verification' : 'selection')}>Evidence</button>
        <button className="command-control" onClick={() => setCommandOpen(true)} aria-label="Open command menu">⌘ K</button>
      </div>
    </header>
    <BranchContextBar foundation={foundation} left={state.previews.left} right={state.previews.right} sourceBranches={sourceBranches} />
    {resultReport ? <ResultWorkspace report={resultReport} foundation={foundation} selections={resultSources} onOpen={() => setComparisonLayout('right')} onEvidence={() => openEvidence('verification')} onCopy={() => void navigator.clipboard?.writeText(resultReport.repository.candidateBranch)} onReturn={returnToComparison} /> : <section className="workspace-heading"><div><p className="eyebrow">Compare running versions</p><h1>Choose the parts worth keeping.</h1></div><p>Interact normally, or enter Select parts to turn a rendered React boundary into verified integration intent.</p><span className={readyCount === 2 ? 'linked' : ''}><i aria-hidden="true" />{readyCount === 2 ? 'Routes linked' : 'Linking previews'}</span></section>}
    <ResizableComparison layout={comparisonLayout} left={leftPane} right={rightPane} />
    {!resultReport && <CandidatePanel inputs={generationInputs} foundation={foundation} candidateBranch={candidateBranch} onRevise={reviseSelections} onEvidence={openEvidence} onStateChange={updateCandidateUi} onLaunch={handleCandidateLaunch} />}
    <EvidenceDrawer open={evidenceOpen} requestedTab={evidenceTab} onClose={closeEvidence} state={state} operations={operations} candidate={candidateUi} onSelectAncestor={(slot, index) => send(slot, 'select-ancestor', { index })} onClear={clearSelection} />
    <CommandPalette open={commandOpen} commands={commands} onClose={closeCommands} />
    <button className="stop-runtime-action" onClick={() => { void stopWorkspace(); setWorkspaceOpen(false); }}>Stop previews</button>
  </div>;
}

export { CandidatePanel, SlicePanel };
export type { GenerationInput };
