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
function preflight(status: 'ready' | 'refused' = 'ready'): CandidatePreflight { return { generationId: 'f'.repeat(16), integrationPlan: { version: 2, identity }, plan: { version: 1, repository: { baseCommit: '1'.repeat(40), candidateBranch: 'combined-result' }, sliceIds: ['a'.repeat(16), 'b'.repeat(16)], operations: status === 'ready' ? [{ id: 'op:1', kind: 'add-file', sliceIds: ['a'.repeat(16)], source: { branchCommit: '2'.repeat(40), path: 'src/Feature.tsx', region: null, contentHash: 'hash' }, target: { path: 'src/Feature.tsx', region: null, symbol: null }, evidenceEdgeIds: ['edge'], precondition: { baseContentHash: null, targetContentHash: null, description: 'absent' }, postcondition: { expectedContentHash: 'hash', description: 'present' }, detail: 'add' }] : [], conflicts: status === 'refused' ? [{ id: 'conflict:1', kind: 'overlap', path: 'src/App.tsx', symbol: 'App', sliceIds: ['a'.repeat(16), 'b'.repeat(16)], operationIds: ['one', 'two'], evidenceEdgeIds: ['edge'], reason: 'Both slices replace App differently.', manualResolution: 'Resolve manually.' }] : [], unresolved: [], status } }; }
function report(status: 'succeeded' | 'failed' = 'succeeded'): CandidateGenerationReport { return { version: 1, generationId: 'f'.repeat(16), integrationPlan: { version: 2, identity }, status, stage: status === 'succeeded' ? 'complete' : 'verify', message: status === 'succeeded' ? 'Candidate registered.' : 'Verification failed.', repository: { baseCommit: '1'.repeat(40), candidateBranch: 'combined-result', candidateCommit: status === 'succeeded' ? '4'.repeat(40) : undefined, candidateTree: status === 'succeeded' ? '5'.repeat(40) : undefined, idempotent: true }, sliceIds: ['a'.repeat(16), 'b'.repeat(16)], plan: preflight().plan, appliedOperations: [], excludedSourceChanges: [], conflicts: [], verification: [{ name: 'typecheck', command: 'npm run typecheck', status: status === 'succeeded' ? 'passed' : 'failed', exitCode: status === 'succeeded' ? 0 : 1, outputTail: '' }], cleanup: { worktreeRemoved: true, processesStopped: true, detail: 'clean' }, relativePath: '.ums/generation/f/candidate-report.json' }; }

test('blocks the primary action until two current resolved slices exist', () => {
  render(<CandidatePanel inputs={[inputs()[0]]} foundation={foundation} onLaunch={() => undefined} />);
  expect(screen.getByRole('button', { name: 'Create verified branch' })).toBeDisabled();
  expect(screen.getAllByText(/Select one branch-specific change from each live app/).length).toBeGreaterThan(0);
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
  const button = screen.getByRole('button', { name: 'Create verified branch' });
  await waitFor(() => expect(button).toBeEnabled());
  expect(screen.getByText(/Both selections passed the compatibility check/)).toBeVisible();
  fireEvent.click(button);
  expect(await screen.findByText('Verified branch created')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'View combined app' }));
  expect(launch).toHaveBeenCalledWith(expect.objectContaining({ repository: expect.objectContaining({ candidateBranch: 'combined-result' }) }));
  fireEvent.click(screen.getByText('Verification summary'));
  expect(screen.getByText('Code checks:')).toBeVisible();
  expect(screen.getByText(/Cleanup: clean/)).toBeVisible();
});

test('states a safety refusal without enabling combination', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => response(preflight('refused')));
  render(<CandidatePanel inputs={inputs()} foundation={foundation} onLaunch={() => undefined} />);
  await screen.findAllByText(/cannot be combined safely/);
  expect(screen.getByRole('button', { name: 'Create verified branch' })).toBeDisabled();
  expect(screen.getAllByText(/cannot be combined safely/i).length).toBeGreaterThan(0);
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
  const create = screen.getByRole('button', { name: 'Create verified branch' });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.click(create);
  expect(await screen.findByText(/Code checks did not pass/)).toBeVisible();
  expect(screen.getByText(/No combined branch was created/)).toBeVisible();
  expect(screen.queryByRole('button', { name: /Create/ })).not.toBeInTheDocument();
  const change = screen.getByRole('button', { name: 'Change selected features' });
  fireEvent.click(change);
  expect(revise).toHaveBeenCalledOnce();
});
