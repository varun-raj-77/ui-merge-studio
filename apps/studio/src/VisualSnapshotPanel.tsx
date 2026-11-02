import { useEffect, useState } from 'react';
import type { CandidateGenerationReport } from '../../../packages/candidate-generation/src/types';
import type { ComparisonSource } from './candidateLiveComparison';
import type { VisualSnapshotState } from './visualSnapshotTypes';
import { isSafeCaptureRoute } from './visualSnapshotRoutes';

export function VisualSnapshotPanel({ report, activeSource, activeRoute, comparisonActive, sourcePreviewReady, candidatePreviewReady }: {
  report: CandidateGenerationReport;
  activeSource: ComparisonSource;
  activeRoute: string;
  comparisonActive: boolean;
  sourcePreviewReady: boolean;
  candidatePreviewReady: boolean;
}) {
  const [state, setState] = useState<VisualSnapshotState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [route, setRoute] = useState(activeRoute);
  useEffect(() => { setRoute(activeRoute); }, [activeRoute]);
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
      || !isSafeCaptureRoute(route) || !comparisonActive || !sourcePreviewReady || !candidatePreviewReady) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: activeSource, route })
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
    <p>Capture is optional. Choose a relative route to open in both exact-commit previews at a fixed 1280 × 800 viewport. The first route captured for each source is immutable for that candidate. Images stay in the ignored local .ums folder and are checked against stored SHA-256 digests. Local checksums detect changed PNG bytes, but are neither signed proof nor visual approval.</p>
    <label className="visual-snapshot-route">Capture route
      <input aria-label="Local screenshot route" value={state?.captures?.[activeSource]?.route ?? route}
        onChange={event => setRoute(event.target.value)} disabled={busy || Boolean(state?.captures?.[activeSource])}
        maxLength={180} placeholder="/catalogue" />
    </label>
    {!isSafeCaptureRoute(route) && !state?.captures?.[activeSource] && <small role="alert">Enter a local pathname such as /catalogue or /products/item. No host, query, fragment or traversal.</small>}
    <button className="quiet-action" type="button" onClick={() => void capture()}
      disabled={busy || state?.status !== 'ready' || Boolean(state?.captures?.[activeSource]) || !isSafeCaptureRoute(route)
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
        <p><small>Captured {capture.capturedAt} · {capture.viewport.width} × {capture.viewport.height} · route <code>{capture.route}</code> · no pixel-diff verdict</small></p>
        {capture.sourceSha256 && capture.candidateSha256
          ? <p className="visual-snapshot-integrity">PNG SHA-256 matches local manifest · Source <code>{capture.sourceSha256.slice(0, 12)}</code> · Candidate <code>{capture.candidateSha256.slice(0, 12)}</code></p>
          : <p className="visual-snapshot-integrity">Screenshot digest metadata is missing; do not rely on this image pair.</p>}
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
