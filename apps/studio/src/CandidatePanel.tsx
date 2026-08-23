import { useEffect, useState } from 'react';
import type { CandidateGenerationReport, CandidatePreflight } from '../../../packages/candidate-generation/src/types';
import type { IntegrationFoundation } from '../../../packages/integration-plan/src/integrationPlan';
import { canonicalizeLocalIntegrationPlan, localIntegrationPlanIdentity, type LocalIntegrationSelection } from '../../../packages/integration-plan/src/localPlan';
import type { FeatureSliceArtifact } from '../../../packages/source-analysis/src/types';
import { featureLabel } from './demoScenario';
import type { CandidateUiState, EvidenceTab } from './studioTypes';

export type GenerationInput = {
  artifact: FeatureSliceArtifact | null;
  selection: LocalIntegrationSelection | null;
  status: string;
  sessionId: string | null;
  visualSelected?: boolean;
  branch?: string;
  sourceLabel?: string;
};

type CausalState = 'pending' | 'working' | 'complete' | 'warning';

function verificationLabel(name: string) {
  return ({
    install: 'Dependencies',
    typecheck: 'TypeScript',
    tests: 'Tests',
    'focused-feature-tests': 'Feature tests',
    'production-build': 'Build'
  } as Record<string, string>)[name] ?? name;
}

export function failedCandidateMessage(report: CandidateGenerationReport) {
  if (report.repository.candidateCommit) return `Candidate branch ${report.repository.candidateBranch} was created, but generation did not finish cleanly. Inspect the report before using it.`;
  if (report.status === 'refused') return 'Generation was refused before a combined branch was registered. No candidate was created, and both source branches remain unchanged.';
  const failed = report.verification.find(item => item.status === 'failed');
  const gate = failed ? verificationLabel(failed.name) : 'A verification check';
  const cleanup = report.cleanup.worktreeRemoved && report.cleanup.processesStopped ? 'the temporary workspace was cleaned' : 'temporary cleanup needs review';
  return `${gate} did not pass. No combined branch was created, both source branches are unchanged, and ${cleanup}.`;
}

function stageLabel(state: CausalState) {
  if (state === 'complete') return 'Complete';
  if (state === 'working') return 'Working';
  if (state === 'warning') return 'Needs attention';
  return 'Not started';
}

export function CausalityStrip({ states }: { states: Record<'Selected' | 'Source' | 'Slice' | 'Candidate' | 'Verified', CausalState> }) {
  return <ol className="causality-strip" aria-label="Selection to verification progress">
    {Object.entries(states).map(([label, state]) => <li className={`causal-${state}`} key={label}>
      <span className="causal-node" aria-hidden="true">{state === 'complete' ? '✓' : state === 'warning' ? '!' : state === 'working' ? '·' : ''}</span>
      <span><strong>{label}</strong><small>{stageLabel(state)}</small></span>
    </li>)}
  </ol>;
}

export function CandidatePanel({ inputs, foundation, onLaunch, onRevise, onEvidence, onStateChange }: {
  inputs: GenerationInput[];
  foundation: IntegrationFoundation | null;
  candidateBranch?: string;
  onLaunch: (report: CandidateGenerationReport) => void;
  onRevise?: () => void;
  onEvidence?: (tab: EvidenceTab) => void;
  onStateChange?: (state: CandidateUiState) => void;
}) {
  const [preflight, setPreflight] = useState<CandidatePreflight | null>(null);
  const [report, setReport] = useState<CandidateGenerationReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('Waiting for a visual selection.');
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unknownOutcome, setUnknownOutcome] = useState(false);
  const [checkingOutcome, setCheckingOutcome] = useState(false);
  const [verificationStarted, setVerificationStarted] = useState(false);
  const inputKey = inputs.map(item => `${item.artifact?.analysisId ?? 'none'}:${item.selection?.capabilityId ?? 'none'}:${item.status}:${item.sessionId ?? 'none'}:${item.visualSelected ? 'selected' : 'empty'}`).join('|');
  const selectedInputs = inputs.filter(item => item.visualSelected || item.artifact || item.selection);
  const artifacts = selectedInputs.map(item => item.artifact).filter((item): item is FeatureSliceArtifact => Boolean(item));
  const selections = selectedInputs.map(item => item.selection).filter((item): item is LocalIntegrationSelection => Boolean(item));
  const ready = selectedInputs.length >= 1 && selectedInputs.length <= 2 && artifacts.length === selectedInputs.length && selections.length === selectedInputs.length && Boolean(foundation) && selectedInputs.every(item => item.status === 'resolved' && item.artifact?.slice.status === 'resolved');
  const plan = ready && foundation ? canonicalizeLocalIntegrationPlan({ version: 2, foundation, selections }) : null;
  const planIdentity = plan ? localIntegrationPlanIdentity(plan) : null;
  const request = () => ({ plan, planIdentity });

  useEffect(() => {
    setPreflight(null);
    setReport(null);
    setError(null);
    setUnknownOutcome(false);
    setCheckingOutcome(false);
    setVerificationStarted(false);
    setStage(null);
    setProgress(selectedInputs.length ? (ready ? 'Checking required source and dependencies.' : 'Resolving the selected source boundary.') : 'Click Select parts, then choose something from either version.');
  }, [inputKey, ready]);

  useEffect(() => {
    if (!ready || !plan || !planIdentity) return;
    const controller = new AbortController();
    void fetch('/api/candidate/preflight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request()), signal: controller.signal })
      .then(async response => {
        const value = await response.json();
        if (!response.ok) throw new Error(value.error ?? response.statusText);
        const result = value as CandidatePreflight;
        if (result.integrationPlan?.identity !== planIdentity) throw new Error('The server returned evidence for a different integration plan.');
        setPreflight(result);
        setProgress(result.plan.status === 'ready' ? 'The selected source slices can be combined safely.' : 'These selections cannot be combined safely.');
      })
      .catch(value => {
        if ((value as Error).name !== 'AbortError') {
          setError(value instanceof Error ? value.message : String(value));
          setProgress('The safety check could not finish.');
        }
      });
    return () => controller.abort();
  }, [inputKey, ready, planIdentity]);

  useEffect(() => {
    onStateChange?.({ preflight, report, busy, progress, stage, error, unknownOutcome });
  }, [preflight, report, busy, progress, stage, error, unknownOutcome, onStateChange]);

  function applyReport(result: CandidateGenerationReport) {
    if (result.integrationPlan?.identity !== planIdentity) throw new Error('The generated candidate does not refer to the submitted integration plan.');
    setReport(result);
    setStage(result.stage);
    setUnknownOutcome(false);
    setError(null);
    if (result.verification.length > 0) setVerificationStarted(true);
    if (result.status === 'succeeded') {
      setProgress('Combined branch created and verified.');
      onLaunch(result);
    } else setProgress(failedCandidateMessage(result));
  }

  async function generateCandidate() {
    setBusy(true);
    setError(null);
    setUnknownOutcome(false);
    setVerificationStarted(false);
    setReport(null);
    setStage('validate');
    setProgress('Preparing an isolated candidate workspace.');
    const progressController = new AbortController();
    const poll = async () => {
      let active = true;
      while (active && !progressController.signal.aborted) {
        try {
          const response = await fetch('/api/candidate/status', { signal: progressController.signal });
          const value = await response.json() as { status: string; stage: string | null; message: string; sliceId?: string; verification?: string };
          if (value.status === 'running') {
            setStage(value.stage);
            if (value.stage === 'verification' || value.stage === 'verify') setVerificationStarted(true);
            if (value.stage === 'applying-feature' && value.sliceId) {
              const selected = artifacts.find(item => item.analysisId === value.sliceId);
              setProgress(`Applying ${featureLabel(selected)}.`);
            } else if (value.stage === 'verification' && value.verification) setProgress(`Running ${verificationLabel(value.verification)} verification.`);
            else setProgress(value.message);
          }
          active = value.status === 'running' || value.status === 'idle';
        } catch (value) {
          if ((value as Error).name !== 'AbortError') active = false;
        }
        if (active) await new Promise(resolve => setTimeout(resolve, 500));
      }
    };
    const polling = poll();
    try {
      const response = await fetch('/api/candidate/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request()) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error ?? response.statusText);
      const result = value as CandidateGenerationReport;
      applyReport(result);
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
      setUnknownOutcome(true);
      setProgress('UI Merge lost contact with the local Studio while generation was running.');
    } finally {
      progressController.abort();
      await polling;
      setBusy(false);
    }
  }

  async function checkCurrentState() {
    if (!preflight) return;
    setCheckingOutcome(true);
    try {
      const statusResponse = await fetch('/api/candidate/status');
      const status = await statusResponse.json() as { status?: string; stage?: string | null; message?: string; planIdentity?: string };
      if (!statusResponse.ok) throw new Error(status.message ?? statusResponse.statusText);
      if (status.planIdentity !== planIdentity) throw new Error('The Studio is reporting status for a different integration plan.');
      if (!status.status || ['running', 'idle'].includes(status.status)) {
        setStage(status.stage ?? null);
        setProgress(status.status === 'running' ? 'The local Studio still reports this generation as running.' : 'The local Studio does not yet have a completed generation report.');
        return;
      }
      const reportResponse = await fetch(`/api/candidate/reports/${preflight.generationId}`);
      const result = await reportResponse.json() as CandidateGenerationReport;
      if (!reportResponse.ok) throw new Error(result.message ?? reportResponse.statusText);
      applyReport(result);
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
      setProgress('Generation status is still unknown. The candidate may or may not have been created.');
    } finally {
      setCheckingOutcome(false);
    }
  }

  const refused = preflight?.plan.status === 'refused';
  const failed = Boolean(report && report.status !== 'succeeded');
  const durableCandidate = Boolean(report?.repository.candidateCommit);
  const verified = Boolean(report && report.verification.length > 0 && report.verification.every(item => item.status === 'passed'));
  const sourceResolved = selectedInputs.length > 0 && artifacts.length === selectedInputs.length;
  const sliceRefused = refused || selectedInputs.some(item => ['partial', 'refused', 'stale'].includes(item.status)) || Boolean(error && !unknownOutcome && !preflight && ready);
  const states: Parameters<typeof CausalityStrip>[0]['states'] = {
    Selected: selectedInputs.length ? 'complete' : 'pending',
    Source: sourceResolved ? 'complete' : selectedInputs.length ? 'working' : 'pending',
    Slice: sliceRefused ? 'warning' : preflight?.plan.status === 'ready' ? 'complete' : sourceResolved ? 'working' : 'pending',
    Candidate: durableCandidate ? 'complete' : failed || unknownOutcome ? 'warning' : busy ? 'working' : 'pending',
    Verified: verified ? 'complete' : failed || unknownOutcome ? 'warning' : busy && verificationStarted ? 'working' : 'pending'
  };
  const blocked = !ready || !plan || !preflight || preflight.plan.status !== 'ready' || busy;
  const knownProtectedOutcome = refused || failed;
  const preflightUnavailable = Boolean(error && !unknownOutcome && !report);

  return <section className={`selection-tray combine-tray ${knownProtectedOutcome ? 'tray-refused' : unknownOutcome ? 'tray-uncertain' : preflightUnavailable ? 'tray-unavailable' : ''}`} aria-label="Selections and combine action" data-plan-identity={planIdentity ?? undefined}>
    <div className="tray-selection-summary">
      <div className="tray-count"><strong>{selectedInputs.length} selected</strong><span>{selectedInputs.length ? 'Visual choices stay tied to their source versions.' : 'Click Select parts, then choose something from either version.'}</span></div>
      {selectedInputs.length > 0 && <div className="selection-rows">
        {selectedInputs.map((item, index) => <div className="selection-row" key={item.artifact?.analysisId ?? item.branch ?? index}>
          <i aria-hidden="true" />
          <span><small>{item.sourceLabel ?? `Source ${index + 1}`} · <code>{item.branch ?? item.selection?.sourceBranch}</code></small><strong>{item.status === 'loading' ? 'Resolving source…' : featureLabel(item.artifact)}</strong></span>
          <b>{item.status === 'resolved' ? 'Source resolved' : item.status === 'refused' ? 'Refused' : 'Selected'}</b>
        </div>)}
      </div>}
    </div>
    <CausalityStrip states={states} />
    <div className="tray-primary">
      <p className="tray-progress" role="status" aria-live="polite">{unknownOutcome ? progress : error ?? progress}</p>
      {refused && <div className="protected-outcome"><strong>Cannot combine safely</strong><span>No candidate was created. No files were changed, and your source branches remain unchanged.</span></div>}
      {failed && !durableCandidate && <div className="protected-outcome"><strong>Cannot combine safely</strong><span>No candidate was created. Your source branches remain unchanged. {report?.cleanup.worktreeRemoved && report.cleanup.processesStopped ? 'Temporary cleanup completed.' : 'Temporary cleanup needs review.'}</span></div>}
      {failed && durableCandidate && <div className="protected-outcome candidate-attention"><strong>Candidate needs attention</strong><span>The candidate branch exists, but the generation report did not finish successfully. Inspect evidence before using it.</span></div>}
      {unknownOutcome && <div className="uncertain-outcome"><strong>Generation status unknown</strong><span>The candidate may or may not have been created. Check the current Studio state before retrying.</span></div>}
      {preflightUnavailable && <div className="unavailable-outcome"><strong>Safety check unavailable</strong><span>The Studio could not confirm whether these selections are safe to combine.</span></div>}
      <div className="tray-actions">
        {!refused && !failed && !unknownOutcome && !preflightUnavailable && <button className="primary-action stateful-action" onClick={generateCandidate} disabled={blocked}>{busy ? (stage === 'verification' || stage === 'verify' ? 'Verifying result…' : 'Creating branch…') : 'Create combined branch'}</button>}
        {unknownOutcome && <button className="primary-action stateful-action check-state-action" onClick={checkCurrentState} disabled={checkingOutcome}>{checkingOutcome ? 'Checking state…' : 'Check current state'}</button>}
        {(refused || failed || preflightUnavailable || unknownOutcome) && <button className={unknownOutcome ? 'quiet-action' : 'primary-action revise-action'} onClick={onRevise}>Change selections</button>}
        {selectedInputs.length > 0 && <button className="quiet-action" onClick={() => onEvidence?.(refused || failed ? 'plan' : unknownOutcome ? 'verification' : 'selection')}>Inspect evidence</button>}
      </div>
    </div>
  </section>;
}
