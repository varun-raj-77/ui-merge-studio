import { useEffect, useRef, useState } from 'react';
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


/** Explain only the server-owned preflight plan, never an unverified candidate. */
export function IntegrationReadiness({ preflight }: { preflight: CandidatePreflight }) {
  const { plan } = preflight;
  const blocked = plan.status === 'refused';
  return <section className={blocked ? 'integration-readiness readiness-blocked' : 'integration-readiness'} aria-label="Integration readiness" role="region">
    <div className="readiness-header">
      <strong>{blocked ? 'Integration blocked' : 'Ready to generate'}</strong>
      <span>{plan.operations.length} planned {plan.operations.length === 1 ? 'operation' : 'operations'} · {plan.conflicts.length} {plan.conflicts.length === 1 ? 'conflict' : 'conflicts'} · {plan.unresolved.length} unresolved</span>
    </div>
    <p>{blocked
      ? 'The server refused this plan. Change selections or resolve the source issue; no candidate was generated.'
      : 'The server found no known plan conflicts. Candidate verification still has to run before a branch is accepted.'}</p>
    {blocked && <ul className="readiness-issues" aria-label="Integration blockers">
      {plan.conflicts.map(item => <li key={'conflict:' + item.id}>
        <strong>Conflict · <code>{item.path}</code>{item.symbol ? ' · ' + item.symbol : ''}</strong>
        <span>{item.reason}</span>
        <small>Next step: {item.manualResolution}</small>
      </li>)}
      {plan.unresolved.map((item, index) => <li key={'unresolved:' + index + ':' + item.path + ':' + (item.sliceId ?? '')}>
        <strong>Unresolved · <code>{item.path}</code></strong>
        <span>{item.reason}</span>
        <small>Next step: {item.manualResolution}</small>
      </li>)}
      {plan.conflicts.length === 0 && plan.unresolved.length === 0 && <li><strong>Plan refused</strong><span>No individual blocker was provided.</span><small>Inspect plan evidence before revising selections.</small></li>}
    </ul>}
  </section>;
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
  // Only the exact current plan can authorize generation or show completion.
  // A foundation/selection change can leave all individual input statuses intact.
  const latestPlanIdentity = useRef(planIdentity);
  latestPlanIdentity.current = planIdentity;
  const currentPreflight = preflight?.integrationPlan?.identity === planIdentity ? preflight : null;
  const currentReport = report?.integrationPlan?.identity === planIdentity ? report : null;
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
  }, [inputKey, ready, planIdentity]);

  useEffect(() => {
    if (!ready || !plan || !planIdentity) return;
    const controller = new AbortController();
    void fetch('/api/candidate/preflight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request()), signal: controller.signal })
      .then(async response => {
        const value = await response.json();
        if (!response.ok) throw new Error(value.error ?? response.statusText);
        const result = value as CandidatePreflight;
        if (controller.signal.aborted) return;
        if (result.integrationPlan?.identity !== planIdentity) throw new Error('The server returned evidence for a different integration plan.');
        setPreflight(result);
        setProgress(result.plan.status === 'ready' ? 'The selected source slices can be combined safely.' : 'These selections cannot be combined safely.');
      })
      .catch(value => {
        if (!controller.signal.aborted && (value as Error).name !== 'AbortError') {
          setError(value instanceof Error ? value.message : String(value));
          setProgress('The safety check could not finish.');
        }
      });
    return () => controller.abort();
  }, [inputKey, ready, planIdentity]);

  useEffect(() => {
    onStateChange?.({ preflight: currentPreflight, report: currentReport, busy, progress, stage, error, unknownOutcome });
  }, [currentPreflight, currentReport, busy, progress, stage, error, unknownOutcome, onStateChange]);

  function applyReport(result: CandidateGenerationReport) {
    if (result.integrationPlan?.identity !== planIdentity) throw new Error('The generated candidate does not refer to the submitted integration plan.');
    if (latestPlanIdentity.current !== planIdentity) return; // The user has moved to another plan.
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
    if (!currentPreflight || currentPreflight.plan.status !== 'ready' || !planIdentity || busy) return;
    const submittedIdentity = planIdentity;
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
      while (active && !progressController.signal.aborted && latestPlanIdentity.current === submittedIdentity) {
        try {
          const response = await fetch('/api/candidate/status', { signal: progressController.signal });
          const value = await response.json() as { status: string; stage: string | null; message: string; sliceId?: string; verification?: string };
          if (latestPlanIdentity.current !== submittedIdentity) break;
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
      if (latestPlanIdentity.current === submittedIdentity) applyReport(result);
    } catch (value) {
      if (latestPlanIdentity.current === submittedIdentity) {
        setError(value instanceof Error ? value.message : String(value));
        setUnknownOutcome(true);
        setProgress('UI Merge lost contact with the local Studio while generation was running.');
      }
    } finally {
      progressController.abort();
      await polling;
      setBusy(false);
    }
  }

  async function checkCurrentState() {
    if (!currentPreflight || !planIdentity) return;
    setCheckingOutcome(true);
    try {
      const statusResponse = await fetch('/api/candidate/status');
      const status = await statusResponse.json() as { status?: string; stage?: string | null; message?: string; planIdentity?: string };
      if (latestPlanIdentity.current !== planIdentity) return;
      if (!statusResponse.ok) throw new Error(status.message ?? statusResponse.statusText);
      if (status.planIdentity !== planIdentity) throw new Error('The Studio is reporting status for a different integration plan.');
      if (!status.status || ['running', 'idle'].includes(status.status)) {
        setStage(status.stage ?? null);
        setProgress(status.status === 'running' ? 'The local Studio still reports this generation as running.' : 'The local Studio does not yet have a completed generation report.');
        return;
      }
      const reportResponse = await fetch(`/api/candidate/reports/${currentPreflight.generationId}`);
      const result = await reportResponse.json() as CandidateGenerationReport;
      if (latestPlanIdentity.current !== planIdentity) return;
      if (!reportResponse.ok) throw new Error(result.message ?? reportResponse.statusText);
      applyReport(result);
    } catch (value) {
      if (latestPlanIdentity.current === planIdentity) {
        setError(value instanceof Error ? value.message : String(value));
        setProgress('Generation status is still unknown. The candidate may or may not have been created.');
      }
    } finally {
      setCheckingOutcome(false);
    }
  }

  const refused = currentPreflight?.plan.status === 'refused';
  const failed = Boolean(currentReport && currentReport.status !== 'succeeded');
  const durableCandidate = Boolean(currentReport?.repository.candidateCommit);
  const verified = Boolean(currentReport && currentReport.verification.length > 0 && currentReport.verification.every(item => item.status === 'passed'));
  const sourceResolved = selectedInputs.length > 0 && artifacts.length === selectedInputs.length;
  const sliceRefused = refused || selectedInputs.some(item => ['partial', 'refused', 'stale'].includes(item.status)) || Boolean(error && !unknownOutcome && !currentPreflight && ready);
  const states: Parameters<typeof CausalityStrip>[0]['states'] = {
    Selected: selectedInputs.length ? 'complete' : 'pending',
    Source: sourceResolved ? 'complete' : selectedInputs.length ? 'working' : 'pending',
    Slice: sliceRefused ? 'warning' : currentPreflight?.plan.status === 'ready' ? 'complete' : sourceResolved ? 'working' : 'pending',
    Candidate: durableCandidate ? 'complete' : failed || unknownOutcome ? 'warning' : busy ? 'working' : 'pending',
    Verified: verified ? 'complete' : failed || unknownOutcome ? 'warning' : busy && verificationStarted ? 'working' : 'pending'
  };
  const blocked = !ready || !plan || !currentPreflight || currentPreflight.plan.status !== 'ready' || busy;
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
      {currentPreflight && !currentReport && !unknownOutcome && !error && <IntegrationReadiness preflight={currentPreflight} />}
      {refused && <div className="protected-outcome"><strong>Cannot combine safely</strong><span>No candidate was created. No files were changed, and your source branches remain unchanged.</span></div>}
      {failed && !durableCandidate && <div className="protected-outcome"><strong>Cannot combine safely</strong><span>No candidate was created. Your source branches remain unchanged. {currentReport?.cleanup.worktreeRemoved && currentReport.cleanup.processesStopped ? 'Temporary cleanup completed.' : 'Temporary cleanup needs review.'}</span></div>}
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
