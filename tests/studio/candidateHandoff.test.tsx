// @vitest-environment jsdom
import '../setup';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { CandidateGenerationReport } from '../../packages/candidate-generation/src/types';
import { formatVerifiedCandidateHandoff } from '../../apps/studio/src/candidateHandoff';
import { ResultWorkspace } from '../../apps/studio/src/WorkspaceComponents';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function apiResponse(value: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }));
}
beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockImplementation(input =>
  apiResponse(String(input).includes('/visual-snapshots/')
    ? { status: 'ready', captures: { A: null, B: null } }
    : { status: 'pending', receipt: null })); });

function verifiedReport(): CandidateGenerationReport {
  const identity = 'plan-v2-fixture-verified';
  return {
    version: 1,
    generationId: 'f'.repeat(16),
    integrationPlan: { version: 2, identity },
    status: 'succeeded',
    stage: 'complete',
    message: 'Internal diagnostic SECRET-MESSAGE',
    repository: {
      baseCommit: '1'.repeat(40),
      candidateBranch: 'verified-combined-branch',
      candidateCommit: '2'.repeat(40),
      candidateTree: '3'.repeat(40),
      worktreePath: '/private/worktree/SECRET',
      provenance: { generationId: 'f'.repeat(16), planIdentity: identity, profile: 'phase0' }
    },
    sliceIds: ['slice-a', 'slice-b'],
    plan: {
      version: 1,
      status: 'ready',
      repository: { baseCommit: '1'.repeat(40), candidateBranch: 'verified-combined-branch', foundationRef: 'main' },
      sliceIds: ['slice-a', 'slice-b'],
      operations: [],
      conflicts: [],
      unresolved: []
    },
    appliedOperations: [], excludedSourceChanges: [], conflicts: [],
    verification: [
      { name: 'typecheck', command: 'echo SECRET-COMMAND', status: 'passed', exitCode: 0, outputTail: 'SECRET-LOG' },
      { name: 'production-build', command: 'echo SECRET-COMMAND-2', status: 'passed', exitCode: 0, outputTail: 'SECRET-LOG-2' }
    ],
    cleanup: { worktreeRemoved: true, processesStopped: true, detail: 'SECRET-CLEANUP' },
    relativePath: '/private/SECRET-REPORT.json'
  };
}

test('exports an allowlisted, deterministic local-only handoff with accurate Git and plan evidence', () => {
  const report = verifiedReport();
  const text = formatVerifiedCandidateHandoff(report);
  expect(text).not.toBeNull();
  expect(JSON.parse(text!)).toEqual({
    format: 'ui-merge-studio/verified-candidate-handoff/v1',
    scope: 'local-git-candidate',
    delivery: 'not-pushed-or-deployed',
    branch: 'verified-combined-branch',
    candidateCommit: '2'.repeat(40),
    candidateTree: '3'.repeat(40),
    baseCommit: '1'.repeat(40),
    planIdentity: 'plan-v2-fixture-verified',
    generationId: 'f'.repeat(16),
    profile: 'phase0',
    sourceSlices: 2,
    plannedOperations: 0,
    verification: [{ name: 'typecheck', status: 'passed' }, { name: 'production-build', status: 'passed' }],
    cleanup: { worktreeRemoved: true, processesStopped: true }
  });
  expect(formatVerifiedCandidateHandoff(report)).toBe(text);
  for (const secret of ['SECRET-MESSAGE', 'SECRET-COMMAND', 'SECRET-LOG', 'SECRET-CLEANUP', '/private/', 'worktreePath', 'relativePath']) {
    expect(text).not.toContain(secret);
  }
});

test.each([
  ['failed status', (r: CandidateGenerationReport) => { r.status = 'failed'; }],
  ['incomplete Git commit', (r: CandidateGenerationReport) => { r.repository.candidateCommit = undefined; }],
  ['missing tree', (r: CandidateGenerationReport) => { r.repository.candidateTree = undefined; }],
  ['plan identity mismatch', (r: CandidateGenerationReport) => { r.repository.provenance.planIdentity = 'not-the-plan'; }],
  ['generation mismatch', (r: CandidateGenerationReport) => { r.repository.provenance.generationId = 'not-this-generation'; }],
  ['wrong candidate branch', (r: CandidateGenerationReport) => { r.plan.repository.candidateBranch = 'different'; }],
  ['wrong base commit', (r: CandidateGenerationReport) => { r.plan.repository.baseCommit = 'a'.repeat(40); }],
  ['unresolved plan', (r: CandidateGenerationReport) => { r.plan.status = 'refused'; }],
  ['failed check', (r: CandidateGenerationReport) => { r.verification[0].status = 'failed'; }],
  ['nonzero exit code', (r: CandidateGenerationReport) => { r.verification[0].exitCode = 1; }],
  ['missing verification', (r: CandidateGenerationReport) => { r.verification = []; }],
  ['worktree not cleaned', (r: CandidateGenerationReport) => { r.cleanup.worktreeRemoved = false; }],
  ['process not stopped', (r: CandidateGenerationReport) => { r.cleanup.processesStopped = false; }]
])('refuses to export a purported verified handoff with %s', (_name, corrupt) => {
  const report = verifiedReport();
  corrupt(report);
  expect(formatVerifiedCandidateHandoff(report)).toBeNull();
});

const foundation = { repositoryId: 'test-repository', branchRef: 'main', commitSha: '1'.repeat(40), commonAncestorCommit: '1'.repeat(40), role: 'base' as const };

const liveComparisonProps = {
  onCompare: (_source: 'A' | 'B') => undefined,
  candidatePreviewReady: true,
  sourcePins: {
    A: { branch: 'branch-a', commit: '4'.repeat(40) },
    B: { branch: 'branch-b', commit: '5'.repeat(40) }
  },
  activeSource: 'A' as const,
  sourcePreviewReady: true,
  comparisonActive: false
};

function showResult(report = verifiedReport()) {
  render(<ResultWorkspace report={report} foundation={foundation} selections={[{ branch: 'branch-a', label: 'Sidebar' }]}
    {...liveComparisonProps} onOpen={() => undefined} onEvidence={() => undefined} onCopy={() => undefined} onReturn={() => undefined} />);
}

test('mounts independent snapshot and review panels without duplicate React sibling keys', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  showResult();
  expect(screen.getByRole('complementary', { name: 'Local visual snapshots' })).toBeInTheDocument();
  expect(screen.getByRole('complementary', { name: 'Visual review status' })).toBeInTheDocument();
  expect(consoleError.mock.calls.filter(args => String(args[0]).includes('same key'))).toEqual([]);
});

test('copies only after clipboard permission succeeds and shows accessible feedback', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  showResult();
  fireEvent.click(screen.getByRole('button', { name: 'Copy verified handoff' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  expect(JSON.parse(writeText.mock.calls[0][0]).delivery).toBe('not-pushed-or-deployed');
  expect(await screen.findByRole('status')).toHaveTextContent('handoff copied');
});

test('reports a failed clipboard operation without claiming the handoff was copied', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  showResult();
  fireEvent.click(screen.getByRole('button', { name: 'Copy verified handoff' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Could not copy');
  expect(screen.queryByText(/handoff copied/i)).not.toBeInTheDocument();
});

test('does not offer copy action for an unverified result', () => {
  const incomplete = verifiedReport();
  incomplete.cleanup.worktreeRemoved = false;
  showResult(incomplete);
  expect(screen.getByRole('button', { name: 'Copy verified handoff' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('not fully verified');
});

test('separates a verified Git result from visual acceptance when no stylesheet is transferred', () => {
  showResult();
  const review = screen.getByRole('complementary', { name: 'Visual review status' });
  expect(review).toHaveTextContent('Visual review pending');
  expect(review).toHaveTextContent('do not establish that the UI looks and behaves as intended');
  expect(review).not.toHaveTextContent('transfers');
  expect(screen.getByRole('button', { name: 'Open combined preview' })).toBeEnabled();
});

test('flags actual stylesheet operations and keeps the combined-preview action available', () => {
  const report = verifiedReport();
  report.plan.operations = ['src/styles/theme.css', 'src/features/Pulse.module.css'].map((path, index) => ({
    id: `style-${index}`,
    kind: index === 0 ? 'replace-style-file' as const : 'add-style-file' as const,
    sliceIds: ['slice-a'],
    source: { branchCommit: 'a'.repeat(40), path, region: null, contentHash: 'source-hash' },
    target: { path, region: null, symbol: null },
    evidenceEdgeIds: [],
    precondition: { baseContentHash: null, targetContentHash: null, description: 'fixture' },
    postcondition: { expectedContentHash: 'target-hash', description: 'fixture' },
    ownership: 'conservative-file-transfer' as const,
    detail: 'fixture stylesheet operation'
  }));
  const open = vi.fn();
  render(<ResultWorkspace report={report} foundation={foundation} selections={[{ branch: 'branch-a', label: 'Sidebar' }]}
    {...liveComparisonProps} onOpen={open} onEvidence={() => undefined} onCopy={() => undefined} onReturn={() => undefined} />);
  const review = screen.getByRole('complementary', { name: 'Visual review status' });
  expect(review).toHaveTextContent('Visual review pending');
  expect(review).toHaveTextContent('transfers 2 stylesheets');
  expect(review).toHaveTextContent('src/features/Pulse.module.css, src/styles/theme.css');
  expect(review).toHaveTextContent('not automatically accepted');
  fireEvent.click(screen.getByRole('button', { name: 'Open combined preview' }));
  expect(open).toHaveBeenCalledOnce();
});

test('lets reviewers switch to the separately pinned Source B but never labels an in-flight source as compared', () => {
  const compare = vi.fn();
  render(<ResultWorkspace report={verifiedReport()} foundation={foundation} selections={[{ branch: 'branch-a', label: 'Sidebar' }]}
    {...liveComparisonProps} onCompare={compare} onOpen={() => undefined} onEvidence={() => undefined}
    onCopy={() => undefined} onReturn={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compare Source B with result' }));
  expect(compare).toHaveBeenCalledWith('B');
  cleanup();
  render(<ResultWorkspace report={verifiedReport()} foundation={foundation} selections={[{ branch: 'branch-a', label: 'Sidebar' }]}
    {...liveComparisonProps} activeSource="B" sourcePreviewReady={false} comparisonActive
    onCompare={compare} onOpen={() => undefined} onEvidence={() => undefined}
    onCopy={() => undefined} onReturn={() => undefined} />);
  expect(screen.getByRole('note', { name: 'Live comparison evidence' })).toHaveTextContent('Source B is loading or does not match');
  expect(screen.getByRole('button', { name: 'Compare Source B with result' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Compare Source A with result' })).toBeEnabled();
});

test('keeps a pending review disabled when the real candidate preview is not at the verified commit', async () => {
  const opened = vi.fn();
  render(<ResultWorkspace report={verifiedReport()} foundation={foundation} selections={[{ branch: 'branch-a', label: 'Sidebar' }]}
    {...liveComparisonProps} candidatePreviewReady={false} onOpen={opened} onEvidence={() => undefined}
    onCopy={() => undefined} onReturn={() => undefined} />);
  const record = await screen.findByRole('button', { name: 'Record visual review' });
  fireEvent.change(screen.getByLabelText('Visual review decision'), { target: { value: 'looks-as-intended' } });
  fireEvent.change(screen.getByLabelText('Visual observations'), { target: { value: 'The layout appears aligned.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Open combined preview' }));
  expect(opened).toHaveBeenCalledOnce();
  expect(record).toBeDisabled();
  expect(screen.getByText('The combined preview must be running at the exact verified commit before recording.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Compare Source A with result' })).toBeDisabled();
  expect(vi.mocked(globalThis.fetch).mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
});

test('records a self-attested review only after the combined preview was opened and notes were provided', async () => {
  const result = verifiedReport();
  const receipt = {
    version: 1, scope: 'local-self-attested-visual-review',
    generationId: result.generationId, planIdentity: result.integrationPlan!.identity,
    candidateBranch: result.repository.candidateBranch,
    candidateCommit: result.repository.candidateCommit, candidateTree: result.repository.candidateTree,
    decision: 'looks-as-intended', notes: 'Sidebar and header look aligned.', recordedAt: '2026-11-02T00:00:00.000Z'
  };
  const posted = vi.fn();
  vi.mocked(globalThis.fetch).mockImplementation((_input, init) => {
    if (init?.method === 'POST') {
      posted(JSON.parse(String(init.body)));
      return apiResponse({ status: 'recorded', receipt }, 201);
    }
    return apiResponse({ status: 'pending', receipt: null });
  });
  const open = vi.fn();
  render(<ResultWorkspace report={result} foundation={foundation} selections={[{ branch: 'branch-a', label: 'Sidebar' }]}
    {...liveComparisonProps} onOpen={open} onEvidence={() => undefined} onCopy={() => undefined} onReturn={() => undefined} />);
  const record = await screen.findByRole('button', { name: 'Record visual review' });
  expect(record).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Visual review decision'), { target: { value: 'looks-as-intended' } });
  fireEvent.change(screen.getByLabelText('Visual observations'), { target: { value: 'Sidebar and header look aligned.' } });
  expect(record).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Open combined preview' }));
  expect(open).toHaveBeenCalledOnce();
  expect(record).toBeEnabled();
  fireEvent.click(record);
  expect(await screen.findByText('Visual review recorded: looks intended')).toBeVisible();
  expect(screen.getByRole('complementary', { name: 'Visual review status' })).toHaveTextContent('Sidebar and header look aligned.');
  expect(posted).toHaveBeenCalledWith({ decision: 'looks-as-intended', notes: 'Sidebar and header look aligned.' });
  expect(screen.queryByRole('button', { name: 'Record visual review' })).not.toBeInTheDocument();
});

test('renders the exact persisted review and blocks another decision when the branch is stale', async () => {
  const result = verifiedReport();
  const receipt = {
    version: 1, scope: 'local-self-attested-visual-review',
    generationId: result.generationId, planIdentity: result.integrationPlan!.identity,
    candidateBranch: result.repository.candidateBranch,
    candidateCommit: result.repository.candidateCommit, candidateTree: result.repository.candidateTree,
    decision: 'needs-changes', notes: 'Footer spacing is incorrect.', recordedAt: '2026-11-02T00:00:00.000Z'
  };
  vi.mocked(globalThis.fetch).mockImplementation(() => apiResponse({ status: 'recorded', receipt }));
  showResult(result);
  expect(await screen.findByText('Visual review recorded: needs changes')).toBeVisible();
  expect(screen.getByRole('complementary', { name: 'Visual review status' })).toHaveTextContent('Footer spacing is incorrect.');
  cleanup();
  vi.mocked(globalThis.fetch).mockImplementation(() => apiResponse({
    status: 'stale', receipt, reason: 'The candidate branch no longer points to the verified commit and tree.'
  }));
  showResult(result);
  expect(await screen.findByRole('alert')).toHaveTextContent('no longer points');
  expect(screen.queryByRole('button', { name: 'Record visual review' })).not.toBeInTheDocument();
});

test('keeps screenshot capture opt-in and restricted to two running exact-commit previews', async () => {
  render(<ResultWorkspace report={verifiedReport()} foundation={foundation} selections={[{ branch: 'branch-a', label: 'Sidebar' }]}
    {...liveComparisonProps} onOpen={() => undefined} onEvidence={() => undefined} onCopy={() => undefined} onReturn={() => undefined} />);
  expect(await screen.findByRole('button', { name: 'Capture Source A + result snapshots' })).toBeDisabled();
  cleanup();
  const fetchSpy = vi.mocked(globalThis.fetch);
  fetchSpy.mockImplementation((input, init) => {
    if (String(input).includes('/visual-snapshots/') && init?.method === 'POST') {
      return apiResponse({ status: 'ready', captures: {
        A: { version: 3, route: '/catalogue', generationId: 'f'.repeat(16), source: 'A', planIdentity: 'plan-v2-fixture-verified',
          sourceSha256: 'a'.repeat(64), candidateSha256: 'b'.repeat(64),
          sourceBranch: 'branch-a', sourceCommit: '4'.repeat(40), candidateCommit: '2'.repeat(40), candidateTree: '3'.repeat(40),
          capturedAt: '2026-01-01T00:00:00Z', viewport: { width: 1280, height: 800 } },
        B: null
      } });
    }
    return apiResponse(String(input).includes('/visual-snapshots/')
      ? { status: 'ready', captures: { A: null, B: null } }
      : { status: 'pending', receipt: null });
  });
  render(<ResultWorkspace report={verifiedReport()} foundation={foundation} selections={[{ branch: 'branch-a', label: 'Sidebar' }]}
    {...liveComparisonProps} activeRoute="/catalogue" comparisonActive={true} onOpen={() => undefined} onEvidence={() => undefined}
    onCopy={() => undefined} onReturn={() => undefined} />);
  const capture = await screen.findByRole('button', { name: 'Capture Source A + result snapshots' });
  await waitFor(() => expect(capture).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Local screenshot route'), { target: { value: 'https://example.com' } });
  expect(capture).toBeDisabled();
  expect(screen.getByText(/Enter a local pathname/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Local screenshot route'), { target: { value: '/catalogue' } });
  expect(capture).toBeEnabled();
  fireEvent.click(capture);
  await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/candidate/visual-snapshots/' + 'f'.repeat(16), expect.objectContaining({
    method: 'POST', body: JSON.stringify({ source: 'A', route: '/catalogue' })
  })));
  expect(await screen.findByText('Source A', { selector: 'figcaption' })).toBeInTheDocument();
  expect(screen.getByAltText(/Source A local screenshot/)).toHaveAttribute('src', expect.stringContaining('/A/source.png'));
  expect(screen.getByRole('button', { name: 'Source A captured' })).toBeDisabled();
  expect(screen.getByText(/route/, { selector: 'small' })).toHaveTextContent('/catalogue');
  expect(screen.getByText(/PNG SHA-256 matches local manifest/)).toBeInTheDocument();
});


test('allows another route without replacing the original rendered screenshot pair', async () => {
  const first = {
    version: 3, route: '/catalogue', routeKey: 'a'.repeat(16), generationId: 'f'.repeat(16),
    source: 'A', planIdentity: 'plan-v2-fixture-verified',
    sourceSha256: 'a'.repeat(64), candidateSha256: 'b'.repeat(64),
    sourceBranch: 'branch-a', sourceCommit: '4'.repeat(40),
    candidateCommit: '2'.repeat(40), candidateTree: '3'.repeat(40),
    capturedAt: '2026-01-01T00:00:00Z', viewport: { width: 1280, height: 800 }
  };
  const second = { ...first, route: '/products/lamp', routeKey: 'b'.repeat(16), capturedAt: '2026-01-02T00:00:00Z' };
  const spy = vi.mocked(globalThis.fetch);
  spy.mockImplementation((input, init) => {
    const route = init?.method === 'POST' ? (JSON.parse(String(init.body)) as { route: string }).route : null;
    return apiResponse(String(input).includes('/visual-snapshots/')
      ? { status: 'ready', captures: { A: route ? first : null, B: null },
        additionalCaptures: { A: route === '/products/lamp' ? [second] : [], B: [] } }
      : { status: 'pending', receipt: null });
  });
  render(<ResultWorkspace report={verifiedReport()} foundation={foundation} selections={[{ branch: 'branch-a', label: 'Sidebar' }]}
    {...liveComparisonProps} activeRoute="/catalogue" comparisonActive={true} onOpen={() => undefined} onEvidence={() => undefined}
    onCopy={() => undefined} onReturn={() => undefined} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Capture Source A + result snapshots' }));
  await screen.findByRole('button', { name: 'Source A captured' });
  const firstImage = screen.getByAltText(/Source A local screenshot.*catalogue/);
  expect(firstImage).toHaveAttribute('src', expect.stringContaining('/A/source.png'));
  fireEvent.change(screen.getByLabelText('Local screenshot route'), { target: { value: '/products/lamp' } });
  const secondCapture = screen.getByRole('button', { name: 'Capture Source A + result snapshots' });
  expect(secondCapture).toBeEnabled();
  fireEvent.click(secondCapture);
  await waitFor(() => expect(spy).toHaveBeenCalledWith('/api/candidate/visual-snapshots/' + 'f'.repeat(16), expect.objectContaining({
    method: 'POST', body: JSON.stringify({ source: 'A', route: '/products/lamp' })
  })));
  expect(await screen.findByAltText(/Source A local screenshot.*products\/lamp/)).toHaveAttribute('src', expect.stringContaining('/A/' + 'b'.repeat(16) + '/source.png'));
  expect(firstImage).toHaveAttribute('src', expect.stringContaining('/A/source.png'));
  expect(screen.getAllByText(/PNG SHA-256 matches local manifest/)).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Source A captured' })).toBeDisabled();
});

test('follows the live route until the reviewer overrides the capture pathname', () => {
  const props = {
    report: verifiedReport(), foundation, selections: [{ branch: 'branch-a', label: 'Sidebar' }],
    ...liveComparisonProps, comparisonActive: true,
    onOpen: () => undefined, onEvidence: () => undefined, onCopy: () => undefined,
    onReturn: () => undefined
  };
  const { rerender } = render(<ResultWorkspace {...props} activeRoute="/catalogue" />);
  const input = screen.getByLabelText('Local screenshot route');
  expect(input).toHaveValue('/catalogue');
  rerender(<ResultWorkspace {...props} activeRoute="/products/desk-stand" />);
  expect(input).toHaveValue('/products/desk-stand');
  fireEvent.change(input, { target: { value: '/custom-review' } });
  rerender(<ResultWorkspace {...props} activeRoute="/products/another" />);
  expect(input).toHaveValue('/custom-review');
});
