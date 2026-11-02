import { useEffect, useState } from 'react';
import type { CandidateGenerationReport } from '../../../packages/candidate-generation/src/types';
import type { ComparisonSource } from './candidateLiveComparison';
import type { VisualSnapshotState } from './visualSnapshotTypes';

export function VisualSnapshotPanel({ report, activeSource, comparisonActive, sourcePreviewReady, candidatePreviewReady }: {
  report: CandidateGenerationReport;
  activeSource: ComparisonSource;
  comparisonActive: boolean;
  sourcePreviewReady: boolean;
  candidatePreviewReady: boolean;
}) {
  const [state, setState] = useState<VisualSnapshotState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const url = '/api/candidate/visual-snapshots/' + report.generationId;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(url, { signal: controller.signal })
      .then(async response => {
        const result = await response.json() as VisualSnapshotState & { error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Local visual snapshots are unavailable.');
        if (!controller.signal.aborted) setState(result);
      })
      .catch(cause => {
        if (!controller.signal.aborted && (cause as Error).name !== 'AbortError') {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });
    return () => controller.abort();
  }, [url]);

  async function capture() {
    if (busy || state?.status !== 'ready' || state.captures?.[activeSource]
      || !comparisonActive || !sourcePreviewReady || !candidatePreviewReady) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: activeSource })
      });
      const result = await response.json() as VisualSnapshotState & { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Local capture failed.');
      setState(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return <aside className="result-visual-snapshots" aria-label="Local visual snapshots">
    <strong>Local screenshot evidence</strong>
    <p>Capture is optional. Each pair shows the selected generation-pinned source and the exact verified candidate at a fixed 1280 × 800 viewport. Images stay in the ignored local .ums folder; they are neither pixel-diff proof nor visual approval.</p>
    <button className="quiet-action" type="button" onClick={() => void capture()}
      disabled={busy || state?.status !== 'ready' || Boolean(state?.captures?.[activeSource])
        || !comparisonActive || !sourcePreviewReady || !candidatePreviewReady}>
      {busy ? 'Capturing local screenshots…' : state?.captures?.[activeSource] ? 'Source ' + activeSource + ' captured' : 'Capture Source ' + activeSource + ' + result snapshots'}
    </button>
    {!comparisonActive && <small>Choose Compare Source A or B to show both exact-commit previews before capture.</small>}
    {comparisonActive && (!sourcePreviewReady || !candidatePreviewReady) && <small>Both pinned previews must be running at their original commits.</small>}
    {state?.status === 'stale' && <p>{state.reason ?? 'The candidate branch has moved; no new capture is allowed.'}</p>}
    {state?.status === 'unavailable' && <p>{state.reason}</p>}
    {(['A', 'B'] as const).map(source => {
      const capture = state?.captures?.[source];
      if (!capture) return null;
      return <div className="visual-snapshot-pair" key={source}>
        <strong>Source {source} · {capture.sourceBranch} @ {capture.sourceCommit.slice(0, 12)} versus result @ {capture.candidateCommit.slice(0, 12)}</strong>
        <p><small>Captured {capture.capturedAt} · {capture.viewport.width} × {capture.viewport.height} · one route, no pixel-diff verdict</small></p>
        <div className="visual-snapshot-images">
          <figure><img src={url + '/' + source + '/source.png'} alt={'Source ' + source + ' local screenshot at ' + capture.sourceCommit.slice(0, 12)} loading="lazy" /><figcaption>Source {source}</figcaption></figure>
          <figure><img src={url + '/' + source + '/candidate.png'} alt={'Candidate local screenshot at ' + capture.candidateCommit.slice(0, 12) + ' compared with Source ' + source} loading="lazy" /><figcaption>Combined candidate</figcaption></figure>
        </div>
      </div>;
    })}
    {error && <p role="alert">{error}</p>}
    {!state && !error && <p>Checking for existing local screenshot evidence…</p>}
  </aside>;
}
