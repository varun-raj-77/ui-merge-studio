import { useEffect, useState } from 'react';
import type { CandidateGenerationReport } from '../../../packages/candidate-generation/src/types';
import { transferredStylesheets } from './candidateVisualReview';
import type { VisualReviewDecision, VisualReviewSnapshot } from './visualReviewTypes';

export function VisualReviewPanel({ report, previewOpened, candidatePreviewReady }: { report: CandidateGenerationReport; previewOpened: boolean; candidatePreviewReady: boolean }) {
  const stylesheets = transferredStylesheets(report.plan);
  const [snapshot, setSnapshot] = useState<VisualReviewSnapshot | null>(null);
  const [decision, setDecision] = useState<VisualReviewDecision | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const url = '/api/candidate/visual-reviews/' + report.generationId;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(url, { signal: controller.signal })
      .then(async response => {
        const result = await response.json() as VisualReviewSnapshot & { error?: string };
        if (!response.ok) throw new Error(result.error ?? 'Visual review status is unavailable.');
        if (!controller.signal.aborted) setSnapshot(result);
      })
      .catch(cause => {
        if (!controller.signal.aborted && (cause as Error).name !== 'AbortError') setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => controller.abort();
  }, [url]);

  async function recordReview() {
    if (!previewOpened || !candidatePreviewReady || snapshot?.status !== 'pending' || saving || !decision || notes.trim().length < 8 || notes.trim().length > 400) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: notes.trim() })
      });
      const result = await response.json() as VisualReviewSnapshot & { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'The review could not be recorded.');
      setSnapshot(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  const recorded = snapshot?.status === 'recorded' && snapshot.receipt;
  const stale = snapshot?.status === 'stale';
  return <aside className={['result-visual-review', stylesheets.length ? 'has-style-transfer' : '', recorded ? 'review-recorded' : ''].filter(Boolean).join(' ')} aria-label="Visual review status">
    <strong>{recorded ? (recorded.decision === 'looks-as-intended' ? 'Visual review recorded: looks intended' : 'Visual review recorded: needs changes') : stale ? 'Visual review unavailable: stale candidate' : 'Visual review pending'}</strong>
    <p>{stylesheets.length
      ? <>The candidate transfers {stylesheets.length} stylesheet{stylesheets.length === 1 ? '' : 's'} (<code>{stylesheets.join(', ')}</code>). Configured checks passed, but effects on surrounding layout are not automatically accepted.</>
      : 'Configured checks passed, but they do not establish that the UI looks and behaves as intended.'} This is a local, self-attested review—not a screenshot comparison, automatic safety proof, or merge approval.</p>
    {recorded ? <p className="visual-review-receipt" role="status">Recorded for exact commit <code>{recorded.candidateCommit.slice(0, 12)}</code> · {recorded.decision === 'looks-as-intended' ? 'Looks as intended' : 'Needs changes'} · <span>{recorded.notes}</span></p>
      : stale ? <p role="alert">{snapshot?.reason ?? 'The branch no longer matches the verified candidate.'}</p>
        : snapshot?.status === 'pending' ? <form className="visual-review-form" onSubmit={event => { event.preventDefault(); void recordReview(); }}>
          <label>Review outcome<select aria-label="Visual review decision" value={decision} onChange={event => setDecision(event.target.value as VisualReviewDecision | '')}>
            <option value="">Choose outcome</option>
            <option value="looks-as-intended">Looks as intended</option>
            <option value="needs-changes">Needs changes</option>
          </select></label>
          <label>What did you observe?<input aria-label="Visual observations" value={notes} onChange={event => setNotes(event.target.value)} maxLength={400} placeholder="Describe the result (8–400 characters)" /></label>
          <button type="submit" disabled={!previewOpened || !candidatePreviewReady || !decision || notes.trim().length < 8 || saving}>{saving ? 'Recording…' : 'Record visual review'}</button>
          {!previewOpened && <small>Open combined preview before recording your observation.</small>}
          {previewOpened && !candidatePreviewReady && <small>The combined preview must be running at the exact verified commit before recording.</small>}
        </form> : <p>Checking the current candidate and any existing review record…</p>}
    {error && <p role="alert">{error}</p>}
  </aside>;
}
