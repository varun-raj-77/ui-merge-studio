import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CandidateGenerationReport } from '../../../packages/candidate-generation/src/types';
import type { IntegrationFoundation } from '../../../packages/integration-plan/src/integrationPlan';
import type { PreviewOperation } from '../../../packages/preview-runtime/src/previewOperations';
import type { PreviewSlot } from './comparisonState';
import { featureLabel } from './demoScenario';
import type { RepositoryResponse } from './studioTypes';

function shortCommit(value: string | null | undefined) { return value ? value.slice(0, 7) : 'pending'; }
function projectName(repository: RepositoryResponse | null) {
  if (repository?.discovery.packageName) return repository.discovery.packageName;
  const path = repository?.discovery.repositoryPath;
  return path?.split(/[\\/]/).filter(Boolean).at(-1) ?? 'Local React project';
}

export function ProjectContext({ repository, status, onContinue }: { repository: RepositoryResponse | null; status: string; onContinue: () => void }) {
  const ready = Boolean(repository?.clean && repository.branches.length > 0);
  return <main className="project-onboarding">
    <header className="project-brand"><span className="brand-mark" aria-hidden="true"><i /><i /></span><strong>UI Merge Studio</strong><small>Local workspace</small></header>
    <section className="project-card" aria-busy={!repository}>
      <div className="project-heading"><p className="eyebrow">Project</p><h1>{repository ? projectName(repository) : 'Inspecting repository…'}</h1><p className="project-path">{repository?.discovery.repositoryPath ?? 'Reading the configured local Git repository.'}</p></div>
      {repository ? <>
        <div className="project-confidence" aria-label="Discovered project capabilities">
          <span>React <b>{repository.discovery.framework.react.version}</b></span>
          <span>TypeScript <b>{repository.discovery.framework.typescript.version}</b></span>
          <span>Vite <b>{repository.discovery.framework.vite.version}</b></span>
          <span>Package manager <b>{repository.discovery.packageManager.name}</b></span>
        </div>
        <div className={`repository-state ${repository.clean ? 'state-ready' : 'state-warning'}`} role="status"><i aria-hidden="true" /><span><strong>{repository.clean ? 'Repository ready' : 'Working tree has changes'}</strong><small>{repository.clean ? 'Git is clean. Preview worktrees can be created safely.' : 'Commit or stash local changes, then restart Studio.'}</small></span></div>
        <dl className="project-facts"><dt>Foundation</dt><dd><code>{repository.foundation.branchRef}</code> · <code>{shortCommit(repository.foundation.commitSha)}</code></dd><dt>Source versions</dt><dd>{repository.branches.filter(branch => branch !== repository.foundation.branchRef).length} local branches available</dd><dt>Entry point</dt><dd><code>{repository.discovery.entryPoints[0] ?? 'Detected by Vite'}</code></dd></dl>
        <div className="project-actions"><button className="primary-action" onClick={onContinue} disabled={!ready}>Continue to comparison <span aria-hidden="true">→</span></button><details><summary>Change project</summary><p>Repository switching requires restarting the local Studio with the supported command:</p><code>npm run dev -- --repository &lt;path&gt;</code></details></div>
      </> : <div className="repository-state"><i aria-hidden="true" /><span><strong>Inspecting project</strong><small>{status}</small></span></div>}
      {!repository && status !== 'Inspecting repository…' && <div className="onboarding-refusal" role="alert"><strong>This project is not supported yet.</strong><span>{status}</span><small>UI Merge Studio currently requires a local Git repository root containing React, TypeScript, and Vite.</small></div>}
    </section>
    <footer className="onboarding-sequence" aria-label="Product workflow"><span>Compare versions</span><i>→</i><span>Select parts</span><i>→</i><span>Combine</span><i>→</i><span>Verify</span></footer>
  </main>;
}

export function BranchContextBar({ foundation, left, right, sourceBranches }: { foundation: IntegrationFoundation | null; left: PreviewSlot; right: PreviewSlot; sourceBranches: [string, string] }) {
  return <section className="branch-context" aria-label="Foundation and source versions">
    <div className="foundation-context"><span>Foundation</span><strong><code>{foundation?.branchRef ?? 'main'}</code><small>{shortCommit(foundation?.commitSha)}</small></strong><p>The version the result is built on</p></div>
    <div className="context-divider" aria-hidden="true">+</div>
    <div className="source-context"><span>Source versions</span><div><strong><i className={`runtime-dot status-${left.status}`} />Source A <code>{sourceBranches[0]}</code><small>{shortCommit(left.branch === sourceBranches[0] ? left.session?.branchCommit : null)}</small></strong><strong><i className={`runtime-dot status-${right.status}`} />Source B <code>{sourceBranches[1]}</code><small>{shortCommit(right.branch === sourceBranches[1] ? right.session?.branchCommit : null)}</small></strong></div></div>
  </section>;
}

export type WorkspaceCommand = { id: string; label: string; shortcut?: string; action: () => void };

export function CommandPalette({ open, commands, onClose }: { open: boolean; commands: WorkspaceCommand[]; onClose: () => void }) {
  const firstRef = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    firstRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    addEventListener('keydown', escape);
    return () => { removeEventListener('keydown', escape); previousFocus.current?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="command-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="command-palette" role="dialog" aria-modal="true" aria-labelledby="command-title"><header><span className="eyebrow">Workspace actions</span><h2 id="command-title">Command menu</h2><kbd>Esc</kbd></header><div>{commands.map((command, index) => <button ref={index === 0 ? firstRef : undefined} key={command.id} onClick={() => { command.action(); onClose(); }}><span>{command.label}</span>{command.shortcut && <kbd>{command.shortcut}</kbd>}</button>)}</div></section></div>;
}

function operationLabel(operation: PreviewOperation | null, status: PreviewSlot['status']) {
  if (status === 'ready') return 'Running';
  if (status === 'failed') return 'Failed';
  if (!operation) return 'Not started';
  if (operation.state === 'cancelled') return 'Cancelled';
  if (operation.state === 'superseded') return 'Restarting';
  const phase = [...operation.phases].reverse().find(item => !item.completedAt)?.phase ?? operation.phases.at(-1)?.phase;
  return ({
    queued: 'Queued',
    'validating-ref': 'Checking branch',
    'preparing-worktree': 'Preparing files',
    'preparing-dependencies': 'Preparing packages',
    'starting-runtime': 'Starting app',
    'waiting-for-runtime': 'Waiting for app',
    ready: 'Running'
  } as Record<string, string>)[phase ?? ''] ?? 'Preparing preview';
}

export function PreviewPane({ sourceLabel, preview, operation, viewportWidth, iframeRef, result = false, planIdentity, onRestart, onEvidence, onClear }: {
  sourceLabel: string;
  preview: PreviewSlot;
  operation: PreviewOperation | null;
  viewportWidth: number;
  iframeRef: (node: HTMLIFrameElement | null) => void;
  result?: boolean;
  planIdentity?: string | null;
  onRestart: () => void;
  onEvidence: () => void;
  onClear: () => void;
}) {
  const selectedLabel = featureLabel(preview.analysis.artifact);
  const status = operationLabel(operation, preview.status);
  return <article className={`preview-pane ${preview.selecting ? 'is-selecting' : ''} ${result ? 'is-result' : ''}`} data-preview-id={preview.id} data-plan-identity={result ? planIdentity ?? undefined : undefined} data-candidate-preview={result ? 'generated-worktree' : undefined}>
    <header className="preview-toolbar">
      <div className="preview-identity"><span>{result ? 'Combined result' : sourceLabel}</span><strong>{preview.branch || 'No branch selected'}</strong><code>{shortCommit(preview.session?.branchCommit)}</code></div>
      <div className="preview-route"><span>Route</span><code>{preview.context?.route ?? (preview.session ? new URL(preview.session.url).pathname : '/')}</code></div>
      <div className="preview-status"><span className={`runtime-state status-${preview.status}`}><i aria-hidden="true" />{status}</span><button className="toolbar-action" onClick={onRestart} disabled={!preview.branch} aria-label={`Restart ${sourceLabel.toLowerCase()} preview`}>Restart</button></div>
    </header>
    {!result && preview.analysis.status === 'resolved' && <div className="attached-selection"><i aria-hidden="true" /><span><small>Selected from {preview.branch}</small><strong>{selectedLabel}</strong></span><b>Source resolved</b><button onClick={onEvidence}>Evidence</button><button onClick={onClear}>Clear</button></div>}
    {!result && preview.analysis.status === 'loading' && <div className="attached-selection is-working" role="status"><i aria-hidden="true" /><span><small>Selected from {preview.branch}</small><strong>Resolving source and required code…</strong></span><b>Working</b></div>}
    {preview.invalidation && !result && <div className="preview-notice warning-message"><strong>Selection cleared</strong><span>{preview.invalidation}</span></div>}
    {preview.errors.runtime && <div className="preview-notice preview-error" role="alert"><strong>This version could not start.</strong><span>{preview.errors.runtime}</span><button onClick={onRestart}>Try again</button></div>}
    {preview.errors.bridge && <div className="preview-notice preview-error" role="alert"><strong>A stale preview message was rejected.</strong><span>{preview.errors.bridge}</span></div>}
    {preview.errors.selection && <div className="preview-notice preview-error" role="alert"><strong>That area is not selectable.</strong><span>{preview.errors.selection.reason}</span></div>}
    {preview.analysis.status === 'partial' && <div className="preview-notice warning-message"><strong>This selection needs review.</strong><span>Its supporting code could not be separated completely.</span><button onClick={onEvidence}>Inspect evidence</button></div>}
    {preview.analysis.status === 'refused' && <div className="preview-notice preview-error" role="alert"><strong>This selection cannot be combined safely.</strong><span>{preview.analysis.error ?? 'Choose another project-owned React boundary.'}</span><button onClick={onEvidence}>Inspect evidence</button></div>}
    {preview.selecting && <div className="selection-mode-banner" role="status"><span className="selection-cursor" aria-hidden="true" />Click a project-owned React boundary in this running app.<kbd>Esc</kbd></div>}
    <div className="frame-shell" style={{ maxWidth: viewportWidth }}>
      {preview.session ? <iframe ref={iframeRef} title={`${sourceLabel} · ${preview.branch} live application`} src={preview.session.url} /> : <div className="preview-placeholder"><div className="preview-scan" aria-hidden="true" /><strong>{status}</strong><span>The isolated branch preview will appear here.</span></div>}
    </div>
  </article>;
}

export function ResizableComparison({ layout, left, right }: { layout: 'both' | 'left' | 'right'; left: ReactNode; right: ReactNode }) {
  const containerRef = useRef<HTMLElement | null>(null);
  const ratioRef = useRef(50);
  const [ratio, setRatio] = useState(50);
  function updateRatio(next: number, render = true) {
    ratioRef.current = Math.max(28, Math.min(72, next));
    containerRef.current?.style.setProperty('--left-pane', `${ratioRef.current}%`);
    if (render) setRatio(ratioRef.current);
  }
  function beginResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const move = (pointer: PointerEvent) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (bounds) updateRatio(((pointer.clientX - bounds.left) / bounds.width) * 100, false);
    };
    const stop = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', stop); removeEventListener('pointercancel', stop); setRatio(ratioRef.current); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', stop);
    addEventListener('pointercancel', stop);
  }
  return <main ref={containerRef} className={`preview-comparison layout-${layout}`} aria-label="Version comparison">
    <div className="preview-column left-column">{left}</div>
    {layout === 'both' && <div className="comparison-resizer" role="separator" tabIndex={0} aria-label="Resize source previews" aria-orientation="vertical" aria-valuemin={28} aria-valuemax={72} aria-valuenow={Math.round(ratio)} onPointerDown={beginResize} onKeyDown={event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); updateRatio(ratioRef.current - 3); }
      if (event.key === 'ArrowRight') { event.preventDefault(); updateRatio(ratioRef.current + 3); }
    }}><span /></div>}
    <div className="preview-column right-column">{right}</div>
  </main>;
}

export function ResultWorkspace({ report, foundation, selections, onOpen, onEvidence, onCopy, onReturn }: {
  report: CandidateGenerationReport;
  foundation: IntegrationFoundation | null;
  selections: { branch: string; label: string }[];
  onOpen: () => void;
  onEvidence: () => void;
  onCopy: () => void;
  onReturn: () => void;
}) {
  return <section className="result-workspace" aria-labelledby="result-title">
    <div className="result-convergence" aria-label="Selected sources converge into the combined result"><div className="result-sources">{selections.map(selection => <span key={`${selection.branch}:${selection.label}`}><i>✓</i><small>{selection.branch}</small><strong>{selection.label}</strong></span>)}</div><div className="convergence-line" aria-hidden="true"><i /><b>→</b></div><div className="result-identity"><p className="eyebrow">Verified combined result</p><h1 id="result-title">{report.repository.candidateBranch}</h1><code>{shortCommit(report.repository.candidateCommit)}</code><span>Built from <code>{foundation?.branchRef}</code> · <code>{shortCommit(foundation?.commitSha)}</code></span></div></div>
    <div className="result-verification" aria-label="Verification results">{report.verification.map(item => <span className={`verification-${item.status}`} key={item.name}><i aria-hidden="true">{item.status === 'passed' ? '✓' : '!'}</i><small>{item.name}</small><strong>{item.status}</strong></span>)}<span><small>Operations</small><strong>{report.plan.operations.length}</strong></span></div>
    <div className="result-controls"><button className="primary-action" onClick={onOpen}>Open combined preview</button><button className="quiet-action" onClick={onEvidence}>Inspect evidence</button><button className="quiet-action" onClick={onCopy}>Copy branch name</button><button className="quiet-action" onClick={onReturn}>Return to comparison</button></div>
  </section>;
}

export { projectName, shortCommit };
