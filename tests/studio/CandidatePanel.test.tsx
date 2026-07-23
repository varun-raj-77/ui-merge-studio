// @vitest-environment jsdom
import '../setup';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CandidatePanel } from '../../apps/studio/src/App';
import type { CandidateGenerationReport, CandidatePreflight } from '../../packages/candidate-generation/src/types';
import type { FeatureSliceArtifact } from '../../packages/source-analysis/src/types';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function response(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })); }
function artifact(id: string, branch: string, status: 'resolved' | 'partial' = 'resolved'): FeatureSliceArtifact { return { analysisId: id.repeat(16).slice(0, 16), relativePath: `.ums/analysis/${id}/feature-slice.json`, slice: { version: 2, repository: { baseRef: 'main', branchRef: branch, mergeBaseCommit: '1'.repeat(40), branchCommit: (branch === 'left' ? '2' : '3').repeat(40) }, selection: { boundaryId: id, instanceId: `${id}-instance`, repositoryRelativePath: `src/${id}.tsx`, line: 1, column: 0, componentName: id === 'a' ? 'AppSidebar' : 'ActivityFilters', exportName: id, branch, previewId: branch === 'left' ? 'left' : 'right', sessionId: `${id}-session`, generation: 1, confidence: 'exact' }, status, boundary: { original: id, analyzed: id === 'a' ? 'AppSidebar' : 'ActivityFilters', status: 'selected-boundary-sufficient', reason: 'ready' }, changedFiles: [], includedChanges: [], excludedChanges: [], unresolvedDependencies: [], testFileSlices: [], evidence: [] } }; }
const inputs = (status = 'resolved') => [{ artifact: artifact('a', 'left'), status, sessionId: 'left-session' }, { artifact: artifact('b', 'right'), status, sessionId: 'right-session' }];
function preflight(status: 'ready' | 'refused' = 'ready'): CandidatePreflight { return { generationId: 'f'.repeat(16), plan: { version: 1, repository: { baseCommit: '1'.repeat(40), candidateBranch: 'combined-result' }, sliceIds: ['a'.repeat(16), 'b'.repeat(16)], operations: status === 'ready' ? [{ id: 'op:1', kind: 'add-file', sliceIds: ['a'.repeat(16)], source: { branchCommit: '2'.repeat(40), path: 'src/Feature.tsx', region: null, contentHash: 'hash' }, target: { path: 'src/Feature.tsx', region: null, symbol: null }, evidenceEdgeIds: ['edge'], precondition: { baseContentHash: null, targetContentHash: null, description: 'absent' }, postcondition: { expectedContentHash: 'hash', description: 'present' }, detail: 'add' }] : [], conflicts: status === 'refused' ? [{ id: 'conflict:1', kind: 'overlap', path: 'src/App.tsx', symbol: 'App', sliceIds: ['a'.repeat(16), 'b'.repeat(16)], operationIds: ['one', 'two'], evidenceEdgeIds: ['edge'], reason: 'Both slices replace App differently.', manualResolution: 'Resolve manually.' }] : [], unresolved: [], status } }; }
function report(status: 'succeeded' | 'failed' = 'succeeded'): CandidateGenerationReport { return { version: 1, generationId: 'f'.repeat(16), status, stage: status === 'succeeded' ? 'complete' : 'verify', message: status === 'succeeded' ? 'Candidate registered.' : 'Verification failed.', repository: { baseCommit: '1'.repeat(40), candidateBranch: 'combined-result', candidateCommit: status === 'succeeded' ? '4'.repeat(40) : undefined, candidateTree: status === 'succeeded' ? '5'.repeat(40) : undefined, idempotent: true }, sliceIds: ['a'.repeat(16), 'b'.repeat(16)], plan: preflight().plan, appliedOperations: [], excludedSourceChanges: [], conflicts: [], verification: [{ name: 'typecheck', command: 'npm run typecheck', status: status === 'succeeded' ? 'passed' : 'failed', exitCode: status === 'succeeded' ? 0 : 1, outputTail: '' }], cleanup: { worktreeRemoved: true, processesStopped: true, detail: 'clean' }, relativePath: '.ums/generation/f/candidate-report.json' }; }

test('blocks the primary action until two current resolved slices exist', () => {
  render(<CandidatePanel inputs={[inputs()[0]]} onLaunch={() => undefined} />);
  expect(screen.getByRole('button', { name: 'Create combined branch' })).toBeDisabled();
  expect(screen.getByText(/Select one supported feature from each version/)).toBeVisible();
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
  render(<CandidatePanel inputs={inputs()} onLaunch={launch} />);
  const button = screen.getByRole('button', { name: 'Create combined branch' });
  await waitFor(() => expect(button).toBeEnabled());
  expect(screen.getByText(/Safety checks found no conflicts/)).toBeVisible();
  fireEvent.click(button);
  expect(await screen.findByRole('button', { name: 'Combined branch ready' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Open verified result' }));
  expect(launch).toHaveBeenCalledWith('combined-result');
  fireEvent.click(screen.getByText('Verification summary'));
  expect(screen.getByText('typecheck:')).toBeVisible();
  expect(screen.getByText(/Cleanup: clean/)).toBeVisible();
});

test('states a safety refusal without enabling combination', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => response(preflight('refused')));
  render(<CandidatePanel inputs={inputs()} onLaunch={() => undefined} />);
  await screen.findByText(/need review/);
  expect(screen.getByRole('button', { name: 'Create combined branch' })).toBeDisabled();
  expect(screen.getByText(/safety check found a conflict/i)).toBeVisible();
});
