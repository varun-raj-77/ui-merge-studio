// @vitest-environment jsdom
import '../setup';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CandidatePanel } from '../../apps/studio/src/App';
import type { CandidateGenerationReport, CandidatePreflight } from '../../packages/candidate-generation/src/types';
import type { IntegrationFoundation } from '../../packages/integration-plan/src/integrationPlan';
import { localIntegrationPlanIdentity, type LocalIntegrationSelection } from '../../packages/integration-plan/src/localPlan';
import type { FeatureSliceArtifact } from '../../packages/source-analysis/src/types';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function response(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })); }
function artifact(id: string, branch: string, status: 'resolved' | 'partial' = 'resolved'): FeatureSliceArtifact { return { analysisId: id.repeat(16).slice(0, 16), relativePath: `.ums/analysis/${id}/feature-slice.json`, slice: { version: 2, repository: { baseRef: 'main', branchRef: branch, mergeBaseCommit: '1'.repeat(40), branchCommit: (branch === 'left' ? '2' : '3').repeat(40) }, selection: { boundaryId: id, instanceId: `${id}-instance`, repositoryRelativePath: `src/${id}.tsx`, line: 1, column: 0, componentName: id === 'a' ? 'AppSidebar' : 'ActivityFilters', exportName: id, branch, previewId: branch === 'left' ? 'left' : 'right', sessionId: `${id}-session`, generation: 1, confidence: 'exact' }, status, boundary: { original: id, analyzed: id === 'a' ? 'AppSidebar' : 'ActivityFilters', status: 'selected-boundary-sufficient', reason: 'ready' }, changedFiles: [], includedChanges: [], excludedChanges: [], unresolvedDependencies: [], testFileSlices: [], evidence: [] } }; }
const foundation: IntegrationFoundation = { repositoryId: 'test-repository', branchRef: 'main', commitSha: '1'.repeat(40), commonAncestorCommit: '1'.repeat(40), role: 'base' };
function planSelection(item: FeatureSliceArtifact): LocalIntegrationSelection { return { capabilityId: `analyzed-selection:${item.analysisId}`, capabilityKind: 'whole-feature', sourceBranch: item.slice.repository.branchRef, sourceCommitSha: item.slice.repository.branchCommit, route: '/catalogue', pageId: '/catalogue', targetIds: [item.slice.selection.boundaryId] }; }
const inputs = (status = 'resolved') => ['a', 'b'].map((id, index) => { const value = artifact(id, index === 0 ? 'left' : 'right'); return { artifact: value, selection: planSelection(value), status, sessionId: `${index === 0 ? 'left' : 'right'}-session` }; });
const identity = localIntegrationPlanIdentity({ version: 2, foundation, selections: inputs().map(item => item.selection) });
function preflight(status: 'ready' | 'refused' = 'ready'): CandidatePreflight { return { generationId: 'f'.repeat(16), integrationPlan: { version: 2, identity }, plan: { version: 1, repository: { baseCommit: '1'.repeat(40), candidateBranch: 'combined-result' }, sliceIds: ['a'.repeat(16), 'b'.repeat(16)], operations: status === 'ready' ? [{ id: 'op:1', kind: 'add-file', sliceIds: ['a'.repeat(16)], source: { branchCommit: '2'.repeat(40), path: 'src/Feature.tsx', region: null, contentHash: 'hash' }, target: { path: 'src/Feature.tsx', region: null, symbol: null }, evidenceEdgeIds: ['edge'], precondition: { baseContentHash: null, targetContentHash: null, description: 'absent' }, postcondition: { expectedContentHash: 'hash', description: 'present' }, ownership: 'conservative-file-transfer', detail: 'add' }] : [], conflicts: status === 'refused' ? [{ id: 'conflict:1', kind: 'overlap', path: 'src/App.tsx', symbol: 'App', sliceIds: ['a'.repeat(16), 'b'.repeat(16)], operationIds: ['one', 'two'], evidenceEdgeIds: ['edge'], reason: 'Both slices replace App differently.', manualResolution: 'Resolve manually.' }] : [], unresolved: [], status } }; }
function report(status: 'succeeded' | 'failed' = 'succeeded'): CandidateGenerationReport { return { version: 1, generationId: 'f'.repeat(16), integrationPlan: { version: 2, identity }, status, stage: status === 'succeeded' ? 'complete' : 'verify', message: status === 'succeeded' ? 'Candidate registered.' : 'Verification failed.', repository: { baseCommit: '1'.repeat(40), candidateBranch: 'combined-result', candidateCommit: status === 'succeeded' ? '4'.repeat(40) : undefined, candidateTree: status === 'succeeded' ? '5'.repeat(40) : undefined, idempotent: true, provenance: { planIdentity: identity, generationId: 'f'.repeat(16), profile: 'phase0' } }, sliceIds: ['a'.repeat(16), 'b'.repeat(16)], plan: preflight().plan, appliedOperations: [], excludedSourceChanges: [], conflicts: [], verification: [{ name: 'typecheck', command: 'npm run typecheck', status: status === 'succeeded' ? 'passed' : 'failed', exitCode: status === 'succeeded' ? 0 : 1, outputTail: '' }], cleanup: { worktreeRemoved: true, processesStopped: true, detail: 'clean' }, relativePath: '.ums/generation/f/candidate-report.json' }; }

test('keeps the primary action blocked until server preflight accepts the resolved selection', () => {
  render(<CandidatePanel inputs={[inputs()[0]]} foundation={foundation} onLaunch={() => undefined} />);
  expect(screen.getByRole('button', { name: 'Create combined branch' })).toBeDisabled();
  expect(screen.getByText('1 selected')).toBeVisible();
});

test('accepts one current rendered feature when the other preview is the pinned base', async () => {
  const selected = inputs()[1];
  const singleIdentity = localIntegrationPlanIdentity({ version: 2, foundation, selections: [selected.selection] });
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => response({ ...preflight(), integrationPlan: { version: 2, identity: singleIdentity }, plan: { ...preflight().plan, sliceIds: [selected.artifact!.analysisId] } }));
  render(<CandidatePanel inputs={[{ artifact: null, selection: null, status: 'awaiting-confirmation', sessionId: 'base-session' }, selected]} foundation={foundation} onLaunch={() => undefined} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create combined branch' })).toBeEnabled());
});

test('runs safety checking automatically, creates the candidate, and exposes verification', async () => {
  const launch = vi.fn();
  vi.spyOn(globalThis, 'fetch').mockImplementation(input => {
    const url = String(input);
    if (url === '/api/candidate/preflight') return response(preflight());
    if (url === '/api/candidate/status') return response({ status: 'running', stage: 'verify', message: 'Candidate generation is running: verify.' });
    if (url === '/api/candidate/generate') return response(report());
    return response({ error: 'unexpected' }, 500);
  });
  render(<CandidatePanel inputs={inputs()} foundation={foundation} onLaunch={launch} />);
  const button = screen.getByRole('button', { name: 'Create combined branch' });
  await waitFor(() => expect(button).toBeEnabled());
  expect(screen.getByText(/selected source slices can be combined safely/)).toBeVisible();
  fireEvent.click(button);
  await waitFor(() => expect(launch).toHaveBeenCalledWith(expect.objectContaining({ repository: expect.objectContaining({ candidateBranch: 'combined-result' }) })));
  const causality = screen.getByRole('list', { name: 'Selection to verification progress' });
  expect(causality.querySelector('.causal-complete')).toBeTruthy();
  expect(screen.getByText('Candidate').closest('li')).toHaveClass('causal-complete');
  expect(screen.getByText('Verified').closest('li')).toHaveClass('causal-complete');
});

test('keeps candidate progress evidence-backed and monotonic through verification and later writing stages', async () => {
  let statusCalls = 0;
  let finishGeneration: ((value: Response) => void) | undefined;
  vi.spyOn(globalThis, 'fetch').mockImplementation(input => {
    const url = String(input);
    if (url === '/api/candidate/preflight') return response(preflight());
    if (url === '/api/candidate/status') {
      statusCalls += 1;
      return response(statusCalls === 1
        ? { status: 'running', stage: 'verification', message: 'Running verification.', verification: 'typecheck' }
        : { status: 'running', stage: 'writing-tree', message: 'Writing the verified candidate tree.' });
    }
    if (url === '/api/candidate/generate') return new Promise<Response>(resolve => { finishGeneration = resolve; });
    return response({ error: 'unexpected' }, 500);
  });
  render(<CandidatePanel inputs={inputs()} foundation={foundation} onLaunch={() => undefined} />);
  const create = screen.getByRole('button', { name: 'Create combined branch' });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.click(create);
  await waitFor(() => {
    expect(screen.getByText('Candidate').closest('li')).toHaveClass('causal-working');
    expect(screen.getByText('Verified').closest('li')).toHaveClass('causal-working');
  });
  await waitFor(() => expect(statusCalls).toBeGreaterThan(1), { timeout: 1_500 });
  expect(screen.getByText('Candidate').closest('li')).toHaveClass('causal-working');
  expect(screen.getByText('Candidate').closest('li')).not.toHaveClass('causal-complete');
  expect(screen.getByText('Verified').closest('li')).toHaveClass('causal-working');
  finishGeneration?.(new Response(JSON.stringify(report()), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await waitFor(() => expect(screen.getByText('Candidate').closest('li')).toHaveClass('causal-complete'));
  expect(screen.getByText('Verified').closest('li')).toHaveClass('causal-complete');
});

test('shows a distinct uncertainty state when the generation request loses transport', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(input => {
    const url = String(input);
    if (url === '/api/candidate/preflight') return response(preflight());
    if (url === '/api/candidate/status') return response({ status: 'failed', stage: 'verify', message: 'Connection state unavailable.' });
    if (url === '/api/candidate/generate') return Promise.reject(new TypeError('fetch failed: ECONNRESET'));
    return response({ error: 'unexpected' }, 500);
  });
  render(<CandidatePanel inputs={inputs()} foundation={foundation} onLaunch={() => undefined} />);
  const create = screen.getByRole('button', { name: 'Create combined branch' });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.click(create);
  expect(await screen.findByText('Generation status unknown')).toBeVisible();
  expect(screen.getByText(/candidate may or may not have been created/i)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Check current state' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /Create combined branch|Creating branch/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/No candidate was created/)).not.toBeInTheDocument();
  expect(document.querySelector('.combine-tray')).toHaveClass('tray-uncertain');
  expect(document.querySelector('.combine-tray')).not.toHaveClass('tray-refused');
  expect(screen.getByText('Slice').closest('li')).toHaveClass('causal-complete');
  expect(screen.getByText('Candidate').closest('li')).not.toHaveClass('causal-complete');
  expect(screen.getByText('Verified').closest('li')).not.toHaveClass('causal-complete');
});

test('states a safety refusal without enabling combination', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => response(preflight('refused')));
  render(<CandidatePanel inputs={inputs()} foundation={foundation} onLaunch={() => undefined} />);
  await screen.findAllByText(/cannot be combined safely/);
  expect(screen.queryByRole('button', { name: 'Create combined branch' })).not.toBeInTheDocument();
  expect(screen.getAllByText(/cannot combine safely/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/No candidate was created/)).toBeVisible();
  expect(screen.getByText('Candidate').closest('li')).not.toHaveClass('causal-complete');
});

test('uses plain failure language and replaces branch creation with a revision action', async () => {
  const revise = vi.fn();
  vi.spyOn(globalThis, 'fetch').mockImplementation(input => {
    const url = String(input);
    if (url === '/api/candidate/preflight') return response(preflight());
    if (url === '/api/candidate/status') return response({ status: 'running', stage: 'verification', message: 'Verification command typecheck failed with exit code 2.', verification: 'typecheck' });
    if (url === '/api/candidate/generate') {
      const failed = report('failed');
      failed.message = 'Verification command typecheck failed with exit code 2.';
      failed.verification[0].exitCode = 2;
      return response(failed);
    }
    return response({ error: 'unexpected' }, 500);
  });
  render(<CandidatePanel inputs={inputs()} foundation={foundation} onLaunch={() => undefined} onRevise={revise} />);
  const create = screen.getByRole('button', { name: 'Create combined branch' });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.click(create);
  expect(await screen.findByText(/TypeScript did not pass/)).toBeVisible();
  expect(screen.getByText(/No combined branch was created/)).toBeVisible();
  expect(screen.queryByRole('button', { name: /Create combined/ })).not.toBeInTheDocument();
  const change = screen.getByRole('button', { name: 'Change selections' });
  fireEvent.click(change);
  expect(revise).toHaveBeenCalledOnce();
});

test('marks Candidate complete only when a failed report still proves a durable branch exists', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(input => {
    const url = String(input);
    if (url === '/api/candidate/preflight') return response(preflight());
    if (url === '/api/candidate/status') return response({ status: 'running', stage: 'commit', message: 'Registering candidate.' });
    if (url === '/api/candidate/generate') {
      const cleanupFailure = report('failed');
      cleanupFailure.repository.candidateCommit = '4'.repeat(40);
      cleanupFailure.repository.candidateTree = '5'.repeat(40);
      cleanupFailure.cleanup = { worktreeRemoved: false, processesStopped: true, detail: 'Temporary worktree cleanup failed.' };
      return response(cleanupFailure);
    }
    return response({ error: 'unexpected' }, 500);
  });
  render(<CandidatePanel inputs={inputs()} foundation={foundation} onLaunch={() => undefined} />);
  const create = screen.getByRole('button', { name: 'Create combined branch' });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.click(create);
  expect(await screen.findByText('Candidate needs attention')).toBeVisible();
  expect(screen.getByText(/candidate branch exists/i)).toBeVisible();
  expect(screen.queryByText(/No candidate was created/)).not.toBeInTheDocument();
  expect(screen.getByText('Candidate').closest('li')).toHaveClass('causal-complete');
});

test('resets candidate and verification completion for a new selection attempt', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(input => {
    const url = String(input);
    if (url === '/api/candidate/preflight') return response(preflight());
    if (url === '/api/candidate/status') return response({ status: 'running', stage: 'verify', message: 'Verifying.' });
    if (url === '/api/candidate/generate') return response(report());
    return response({ error: 'unexpected' }, 500);
  });
  const firstInputs = inputs();
  const view = render(<CandidatePanel inputs={firstInputs} foundation={foundation} onLaunch={() => undefined} />);
  const create = screen.getByRole('button', { name: 'Create combined branch' });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.click(create);
  await waitFor(() => expect(screen.getByText('Candidate').closest('li')).toHaveClass('causal-complete'));
  view.rerender(<CandidatePanel inputs={firstInputs.map(item => ({ ...item, sessionId: `${item.sessionId}-new` }))} foundation={foundation} onLaunch={() => undefined} />);
  await waitFor(() => expect(screen.getByText('Candidate').closest('li')).toHaveClass('causal-pending'));
  expect(screen.getByText('Verified').closest('li')).toHaveClass('causal-pending');
});
