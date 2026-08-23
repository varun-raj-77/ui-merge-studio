import { useEffect, useRef, useState } from 'react';
import type { PreviewOperation } from '../../../packages/preview-runtime/src/previewOperations';
import type { RenderedBoundaryReference, SourceIdentity } from '../../../packages/shared/src/sourceIdentity';
import type { FeatureSliceArtifact } from '../../../packages/source-analysis/src/types';
import type { ComparisonState, PreviewSlotId } from './comparisonState';
import type { CandidateUiState, EvidenceTab } from './studioTypes';

const slots: PreviewSlotId[] = ['left', 'right'];

function IdentityPanel({ identity }: { identity: SourceIdentity | null }) {
  if (!identity) return <p className="evidence-empty">No source identity has been resolved for this version.</p>;
  return <dl className="evidence-definition">
    <dt>Component</dt><dd>{identity.componentName ?? 'Anonymous'}</dd>
    <dt>Source</dt><dd><code>{identity.repositoryRelativePath}:{identity.line}:{identity.column}</code></dd>
    <dt>Branch</dt><dd><code>{identity.branch}</code></dd>
    <dt>Boundary</dt><dd><code>{identity.boundaryId}</code></dd>
    <dt>Runtime instance</dt><dd><code>{identity.instanceId}</code></dd>
    <dt>Preview session</dt><dd><code>{identity.previewId} / {identity.sessionId.slice(0, 8)} / g{identity.generation}</code></dd>
    <dt>Mapping</dt><dd>{identity.confidence}</dd>
  </dl>;
}

function RenderedBoundaryPanel({ boundary }: { boundary: RenderedBoundaryReference | null }) {
  if (!boundary) return null;
  return <div className="receipt-line"><span>Opaque selection receipt</span><code>{boundary.selectionReceipt.slice(0, 20)}…</code></div>;
}

function TestSlices({ artifact }: { artifact: FeatureSliceArtifact }) {
  if (!artifact.slice.testFileSlices.length) return null;
  return <section className="evidence-group"><h4>Test slices</h4>{artifact.slice.testFileSlices.map(file => <article className="evidence-item" key={file.path}><code>{file.path}</code><span>{file.mode} · {file.includedUnits.length} included · {file.excludedUnits.length} excluded</span></article>)}</section>;
}

export function SlicePanel({ artifact, status, error }: { artifact: FeatureSliceArtifact | null; status: string; error: string | null }) {
  if (status === 'idle') return <section className="slice-panel"><p className="evidence-empty">No deterministic slice has been requested.</p></section>;
  if (status === 'loading') return <section className="slice-panel" aria-busy="true"><p>Resolving Git and source evidence…</p></section>;
  if (!artifact) return <section className="slice-panel"><div className="evidence-refusal"><strong>Analysis refused</strong><span>{error}</span></div></section>;
  const slice = artifact.slice;
  return <section className={`slice-panel slice-${status}`}>
    {status === 'stale' && <div className="evidence-refusal"><strong>Stale analysis</strong><span>{error}</span></div>}
    <dl className="evidence-definition compact">
      <dt>Original boundary</dt><dd>{slice.boundary.original}</dd>
      <dt>Analyzed boundary</dt><dd>{slice.boundary.analyzed}</dd>
      <dt>Expansion</dt><dd>{slice.boundary.reason}</dd>
      <dt>Merge base</dt><dd><code>{slice.repository.mergeBaseCommit.slice(0, 12)}</code></dd>
      <dt>Source commit</dt><dd><code>{slice.repository.branchCommit.slice(0, 12)}</code></dd>
    </dl>
    <TestSlices artifact={artifact} />
    <a className="artifact-link" href={`/api/analysis/${artifact.analysisId}`} download>Download deterministic JSON</a>
  </section>;
}

function SelectionEvidence({ state, operations, onSelectAncestor, onClear }: {
  state: ComparisonState;
  operations: Record<PreviewSlotId, PreviewOperation | null>;
  onSelectAncestor: (slot: PreviewSlotId, index: number) => void;
  onClear: (slot: PreviewSlotId) => void;
}) {
  return <div className="evidence-stack">{slots.map((slot, index) => {
    const preview = state.previews[slot];
    const operation = operations[slot];
    return <section className="evidence-section" key={slot}>
      <header><span>Source {index === 0 ? 'A' : 'B'}</span><strong>{preview.branch || 'Not configured'}</strong></header>
      {operation && <details><summary>Preview launch · {operation.state}</summary><ol className="phase-list">{operation.phases.map(item => <li key={item.phase}><strong>{item.phase}</strong><span>{item.detail}</span><code>{item.durationMs === null ? 'running' : `${item.durationMs} ms`}</code></li>)}</ol></details>}
      <RenderedBoundaryPanel boundary={preview.hovered} />
      <IdentityPanel identity={preview.analysis.artifact?.slice.selection ?? null} />
      {preview.selected && <div className="evidence-inline-actions">
        {preview.selected.ancestorSelectionReceipts.map((receipt, receiptIndex) => <button className="technical-button" key={receipt} onClick={() => onSelectAncestor(slot, receiptIndex + 1)}>Select parent boundary {receiptIndex + 1}</button>)}
        <button className="technical-button" onClick={() => onClear(slot)}>Clear selection</button>
      </div>}
      <SlicePanel artifact={preview.analysis.artifact} status={preview.analysis.status} error={preview.analysis.error} />
    </section>;
  })}</div>;
}

function DependencyEvidence({ state }: { state: ComparisonState }) {
  const artifacts = slots.map(slot => state.previews[slot].analysis.artifact).filter((value): value is FeatureSliceArtifact => Boolean(value));
  if (!artifacts.length) return <p className="evidence-empty">Select a rendered feature to see its required and excluded changes.</p>;
  return <div className="evidence-stack">{artifacts.map(artifact => <section className="evidence-section" key={artifact.analysisId}>
    <header><span>{artifact.slice.repository.branchRef}</span><strong>{artifact.slice.boundary.analyzed}</strong></header>
    <div className="evidence-group"><h4>Required changes</h4>{artifact.slice.includedChanges.length ? artifact.slice.includedChanges.map(item => <article className="evidence-item" key={item.branchChangeId}><strong>{item.symbol?.name ?? item.path}</strong><code>{item.path}{item.symbol ? `:${item.symbol.region.startLine}` : ''}</code><span>{item.reason}</span></article>) : <p className="evidence-empty">None</p>}</div>
    <div className="evidence-group"><h4>Excluded branch changes</h4>{artifact.slice.excludedChanges.length ? artifact.slice.excludedChanges.map(item => <article className="evidence-item excluded" key={item.branchChangeId}><strong>{item.symbol?.name ?? item.path}</strong><code>{item.path}</code><span>{item.reason}</span><small>{item.proof}</small></article>) : <p className="evidence-empty">None</p>}</div>
    <div className="evidence-group"><h4>Unresolved dependencies</h4>{artifact.slice.unresolvedDependencies.length ? artifact.slice.unresolvedDependencies.map(item => <article className="evidence-item warning" key={`${item.path}:${item.reason}`}><code>{item.path}</code><span>{item.reason}</span><small>{item.manualNextStep}</small></article>) : <p className="evidence-empty">None</p>}</div>
  </section>)}</div>;
}

function PlanEvidence({ candidate }: { candidate: CandidateUiState }) {
  const plan = candidate.preflight?.plan;
  if (!plan) return <p className="evidence-empty">A canonical integration plan appears after the selected source slices resolve.</p>;
  return <div className="evidence-stack">
    <section className="evidence-section"><header><span>Integration plan</span><strong>{plan.status}</strong></header><dl className="evidence-definition compact"><dt>Base commit</dt><dd><code>{plan.repository.baseCommit.slice(0, 12)}</code></dd><dt>Candidate branch</dt><dd><code>{plan.repository.candidateBranch}</code></dd><dt>Slice count</dt><dd>{plan.sliceIds.length}</dd><dt>Operations</dt><dd>{plan.operations.length}</dd></dl></section>
    <section className="evidence-section"><header><span>Operations</span><strong>{plan.operations.length}</strong></header>{plan.operations.length ? plan.operations.map(operation => <article className="evidence-item" key={operation.id}><strong>{operation.kind}</strong><code>{operation.target.path}</code><span>{operation.detail}</span><small>{operation.ownership}</small></article>) : <p className="evidence-empty">No operations were authorized.</p>}</section>
    {(plan.conflicts.length > 0 || plan.unresolved.length > 0) && <section className="evidence-section refusal-evidence"><header><span>Protected outcome</span><strong>Cannot combine safely</strong></header>{plan.conflicts.map(conflict => <article className="evidence-item warning" key={conflict.id}><strong>{conflict.kind} · {conflict.path}</strong><span>{conflict.reason}</span><small>{conflict.manualResolution}</small></article>)}{plan.unresolved.map(item => <article className="evidence-item warning" key={`${item.path}:${item.sliceId ?? 'plan'}:${item.reason}`}><strong>{item.path}</strong><span>{item.reason}</span><small>{item.manualResolution}</small></article>)}<p>No candidate was created. Source branches remain unchanged.</p></section>}
  </div>;
}

function VerificationEvidence({ candidate }: { candidate: CandidateUiState }) {
  const report = candidate.report;
  if (!report) return <div className="evidence-stack">{candidate.unknownOutcome ? <section className="evidence-section uncertainty-evidence"><header><span>Generation request</span><strong>Status unknown</strong></header><p>The candidate may or may not have been created. Use Check current state in the comparison tray before retrying.</p>{candidate.error && <code>{candidate.error}</code>}</section> : <p className="evidence-empty">Verification evidence appears after candidate generation begins.</p>}{candidate.busy && <section className="evidence-section"><header><span>Current stage</span><strong>{candidate.stage ?? 'preparing'}</strong></header><p>{candidate.progress}</p></section>}</div>;
  return <div className="evidence-stack">
    <section className="evidence-section"><header><span>Generation</span><strong>{report.status}</strong></header><dl className="evidence-definition compact"><dt>Candidate branch</dt><dd><code>{report.repository.candidateBranch}</code></dd><dt>Commit</dt><dd><code>{report.repository.candidateCommit?.slice(0, 12) ?? 'not created'}</code></dd><dt>Tree</dt><dd><code>{report.repository.candidateTree?.slice(0, 12) ?? 'not created'}</code></dd><dt>Plan identity</dt><dd><code>{report.repository.provenance?.planIdentity ?? 'unavailable'}</code></dd><dt>Profile</dt><dd>{report.repository.provenance?.profile ?? 'unavailable'}</dd></dl></section>
    <section className="evidence-section"><header><span>Verification</span><strong>{report.verification.filter(item => item.status === 'passed').length}/{report.verification.length} passed</strong></header>{report.verification.map(item => <article className={`verification-row verification-${item.status}`} key={item.name}><span aria-hidden="true">{item.status === 'passed' ? '✓' : '!'}</span><div><strong>{item.name}</strong><code>{item.command}</code>{item.outputTail && <pre>{item.outputTail}</pre>}</div><b>{item.status}</b></article>)}</section>
    <section className="evidence-section"><header><span>Cleanup</span><strong>{report.cleanup.worktreeRemoved && report.cleanup.processesStopped ? 'Complete' : 'Review'}</strong></header><p>{report.cleanup.detail}</p>{report.status !== 'succeeded' && (report.repository.candidateCommit ? <div className="evidence-refusal candidate-attention"><strong>Candidate branch exists</strong><span>The report did not finish successfully. Review this evidence before using the candidate.</span></div> : <div className="evidence-refusal"><strong>No candidate was created</strong><span>Both source branches remain unchanged.</span></div>)}</section>
  </div>;
}

export function EvidenceDrawer({ open, requestedTab, onClose, state, operations, candidate, onSelectAncestor, onClear }: {
  open: boolean;
  requestedTab: EvidenceTab;
  onClose: () => void;
  state: ComparisonState;
  operations: Record<PreviewSlotId, PreviewOperation | null>;
  candidate: CandidateUiState;
  onSelectAncestor: (slot: PreviewSlotId, index: number) => void;
  onClear: (slot: PreviewSlotId) => void;
}) {
  const [tab, setTab] = useState<EvidenceTab>(requestedTab);
  const [width, setWidth] = useState(390);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => { if (open) setTab(requestedTab); }, [open, requestedTab]);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    addEventListener('keydown', escape);
    return () => { removeEventListener('keydown', escape); previousFocus.current?.focus(); };
  }, [open, onClose]);

  function beginResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const move = (pointer: PointerEvent) => setWidth(Math.max(320, Math.min(560, window.innerWidth - pointer.clientX)));
    const stop = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', stop); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', stop);
  }

  if (!open) return null;
  const tabs: { id: EvidenceTab; label: string }[] = [
    { id: 'selection', label: 'Selection' },
    { id: 'dependencies', label: 'Dependencies' },
    { id: 'plan', label: 'Plan' },
    { id: 'verification', label: 'Verification' }
  ];
  return <aside className="evidence-drawer" style={{ width }} role="dialog" aria-modal="false" aria-labelledby="evidence-title">
    <div className="drawer-resizer" role="separator" aria-label="Resize evidence drawer" aria-orientation="vertical" aria-valuemin={320} aria-valuemax={560} aria-valuenow={width} tabIndex={0} onPointerDown={beginResize} onKeyDown={event => {
      if (event.key === 'ArrowLeft') setWidth(value => Math.min(560, value + 16));
      if (event.key === 'ArrowRight') setWidth(value => Math.max(320, value - 16));
    }} />
    <header className="drawer-header"><div><p className="eyebrow">Exact technical evidence</p><h2 id="evidence-title">Evidence</h2></div><button ref={closeRef} className="drawer-close" onClick={onClose} aria-label="Close evidence drawer">×</button></header>
    <div className="evidence-tabs" role="tablist" aria-label="Evidence modes">{tabs.map(item => <button role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)} key={item.id}>{item.label}</button>)}</div>
    <div className="drawer-content" role="tabpanel">
      {tab === 'selection' && <SelectionEvidence state={state} operations={operations} onSelectAncestor={onSelectAncestor} onClear={onClear} />}
      {tab === 'dependencies' && <DependencyEvidence state={state} />}
      {tab === 'plan' && <PlanEvidence candidate={candidate} />}
      {tab === 'verification' && <VerificationEvidence candidate={candidate} />}
    </div>
  </aside>;
}
