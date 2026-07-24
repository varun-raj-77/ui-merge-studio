// @vitest-environment jsdom
import '../setup';
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { App, SlicePanel } from '../../apps/studio/src/App';
import { bridgeVersion, type PreviewCapabilities, type PreviewIdentity } from '../../packages/shared/src/bridge';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';
import type { FeatureSliceArtifact, SliceStatus } from '../../packages/source-analysis/src/types';
import type { PreviewOperation } from '../../packages/preview-runtime/src/previewOperations';

const capabilities: PreviewCapabilities = { routeSync: { version: 1, contract: 'ticket-query-v1' }, fixtureContext: { version: 1, contract: 'support-ticket-ticket-query-v1', entityType: 'ticket' }, sourceSelection: { version: 1 } };
const session = (previewId: 'left' | 'right', branch: string, generation = 1) => ({ previewId, branch, generation, sessionId: `${previewId}-session-${generation}`, protocolVersion: bridgeVersion, branchCommit: `${branch}-commit`, url: `http://127.0.0.1:${previewId === 'left' ? 5001 : 5002}/tickets`, origin: `http://127.0.0.1:${previewId === 'left' ? 5001 : 5002}`, port: previewId === 'left' ? 5001 : 5002, worktreePath: `C:/temp/${previewId}`, status: 'running' as const, failure: null });
function response(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })); }
function emit(frame: HTMLIFrameElement, preview: PreviewIdentity & { origin: string }, type: string, payload?: unknown) { window.dispatchEvent(new MessageEvent('message', { origin: preview.origin, source: frame.contentWindow, data: { version: bridgeVersion, preview, type, payload } })); }
function sourceIdentity(preview: ReturnType<typeof session>, componentName: string): SourceIdentity { return { boundaryId: `${componentName}-definition`, instanceId: `${componentName}-instance`, repositoryRelativePath: `src/${componentName}.tsx`, line: 4, column: 8, componentName, exportName: componentName, branch: preview.branch, previewId: preview.previewId, sessionId: preview.sessionId, generation: preview.generation, confidence: 'exact' }; }
function artifact(selection: SourceIdentity, status: SliceStatus = 'resolved', analyzed = selection.componentName!): FeatureSliceArtifact {
  return { analysisId: `${selection.previewId === 'left' ? 'a' : 'b'}`.repeat(16), relativePath: '.ums/analysis/result/feature-slice.json', slice: { version: 2, repository: { baseRef: 'main', branchRef: selection.branch, mergeBaseCommit: '1'.repeat(40), branchCommit: '2'.repeat(40) }, selection, status, boundary: { original: selection.componentName!, analyzed, status: analyzed === selection.componentName ? 'selected-boundary-sufficient' : 'expanded-to-integration-boundary', reason: 'Supported integration evidence.' }, changedFiles: [], includedChanges: [{ path: selection.repositoryRelativePath, category: 'selected-definition', symbol: { name: selection.componentName!, kind: 'component', region: { startLine: 4, endLine: 8 } }, branchChangeId: `change-${selection.previewId}`, wholeFile: false, reason: 'Validated visual selection seed.', evidenceEdgeIds: ['edge-1'], confidence: 'exact' }], excludedChanges: [], unresolvedDependencies: [], testFileSlices: [], evidence: [] } };
}
function readyOperation(previewId: 'left' | 'right', branch: string): PreviewOperation {
  const value = session(previewId, branch);
  return { operationId: `${previewId}-operation`, previewId, branch, state: 'ready', requestedAt: '2026-01-01T00:00:00.000Z', startedAt: '2026-01-01T00:00:00.001Z', completedAt: '2026-01-01T00:00:00.002Z', updatedAt: '2026-01-01T00:00:00.002Z', phases: [], result: value, error: null, supersededBy: null };
}
function appFetch(rightComponent = 'ActivityFilters') {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url === '/api/repository') return response({ branches: ['branch-sidebar', 'branch-inspector', 'main'], clean: true, sessions: [] });
    if (url === '/api/previews/left' && init?.method === 'POST') return response({ operationId: 'left-operation', previewId: 'left', branch: 'branch-sidebar', state: 'pending', requestedAt: '', coalesced: false }, 202);
    if (url === '/api/previews/right' && init?.method === 'POST') return response({ operationId: 'right-operation', previewId: 'right', branch: 'branch-inspector', state: 'pending', requestedAt: '', coalesced: false }, 202);
    if (url.endsWith('/left-operation')) return response(readyOperation('left', 'branch-sidebar'));
    if (url.endsWith('/right-operation')) return response(readyOperation('right', 'branch-inspector'));
    if (url === '/api/previews/left/analysis') return response(artifact(sourceIdentity(session('left', 'branch-sidebar'), 'AppSidebar')));
    if (url === '/api/previews/right/analysis') return response(artifact(sourceIdentity(session('right', 'branch-inspector'), rightComponent)));
    if (url === '/api/candidate/preflight') return response({ generationId: 'f'.repeat(16), plan: { version: 1, repository: { baseCommit: '1'.repeat(40), candidateBranch: 'combined-result' }, sliceIds: ['a'.repeat(16), 'b'.repeat(16)], operations: [], conflicts: [], unresolved: [], status: 'ready' } });
    return response({ error: `Unexpected request: ${url}` }, 500);
  });
}
async function launch() {
  const launchButton = await screen.findByRole('button', { name: /Try sample demo/i });
  await waitFor(() => expect(launchButton).toBeEnabled(), { timeout: 10_000 });
  fireEvent.click(launchButton);
  return {
    left: await screen.findByTitle('Navigation experiment live application', {}, { timeout: 5_000 }) as HTMLIFrameElement,
    right: await screen.findByTitle('Activity-filter experiment live application', {}, { timeout: 5_000 }) as HTMLIFrameElement
  };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('shares the homepage ink, ivory, stone, and signal-orange token system with Guided Mode', () => {
  const css = readFileSync('apps/studio/src/studio.css', 'utf8');
  for (const token of ['--ink: #111315', '--ivory: #f5f2eb', '--white: #ffffff', '--stone: #d9d4ca', '--light-stone: #ece8df', '--graphite: #686c70', '--signal: #ff6b3d', '--signal-dark: #e9562f']) expect(css).toContain(token);
  expect(css).toContain('.studio { min-height: 100vh; padding: 0 18px 20px; color: var(--ink); background: var(--ivory); }');
  expect(css).toContain('.primary-action { color: var(--ink); background: var(--signal)');
  expect(css).toContain('.combine-tray, .result-actions { position: sticky;');
  expect(css).not.toContain('.combine-tray, .result-actions { position: fixed;');
});

test('renders an explicit analysis refusal in technical evidence', () => {
  render(<SlicePanel artifact={null} status="refused" error="Branch commit mismatch: restart and select again." />);
  expect(screen.getByText('Analysis refused:')).toBeVisible();
  expect(screen.getByText(/Branch commit mismatch/)).toBeVisible();
});

test('explains the task and defaults to the intended named versions without technical jargon', async () => {
  appFetch();
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'UI Merge Studio' })).toBeVisible();
  expect(screen.getByText(/Combine the best UI changes from different React branches/)).toBeVisible();
  expect(screen.getByRole('button', { name: /Try sample demo/ })).toBeVisible();
  expect(screen.getByText(/arbitrary local repositories is the next validation milestone/)).toBeVisible();
  expect(screen.getByText(/Demo application · Fake ticket data/)).toBeVisible();
  expect(screen.getByText(/These are examples—not limits/)).toBeVisible();
  expect(screen.queryByTitle(/Variant preview/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'How it works' })).toBeVisible();
  const text = document.body.textContent ?? '';
  for (const forbidden of ['Hovered boundary', 'Selected boundary', 'Eligible ancestors', 'Feature slice', 'Merge base', 'Runtime instance', 'Candidate preflight']) expect(text).not.toContain(forbidden);
});

test('launches through acknowledged operations and keeps both runtime identities isolated', async () => {
  appFetch();
  render(<App />);
  const frames = await launch();
  emit(frames.left, session('left', 'branch-sidebar'), 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } });
  emit(frames.right, session('right', 'branch-inspector'), 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } });
  expect(await screen.findByText('Both live apps are ready to compare')).toBeVisible();
  expect(screen.getByText(/two live Git branches of the same React application/)).toBeVisible();
  expect(screen.getByText('Navigation experiment')).toBeVisible();
  expect(screen.getByText('Activity-filter experiment')).toBeVisible();
  expect(screen.getByText('branch-sidebar')).toBeVisible();
  expect(screen.getByText('branch-inspector')).toBeVisible();
  expect(screen.queryByRole('combobox', { name: /source/i })).not.toBeInTheDocument();
  expect(document.querySelector('.studio')).not.toHaveTextContent('Version A');
  expect(document.querySelector('.studio')).not.toHaveTextContent('Version B');
  expect(frames.left).toHaveAttribute('src', session('left', 'branch-sidebar').url);
  expect(frames.right).toHaveAttribute('src', session('right', 'branch-inspector').url);
  fireEvent.change(screen.getByLabelText('Preview size'), { target: { value: 'mobile' } });
  expect(frames.left.parentElement).toHaveStyle({ maxWidth: '390px' });
  expect(frames.right.parentElement).toHaveStyle({ maxWidth: '390px' });
  expect(frames.left).not.toHaveAttribute('style');
  expect(frames.right).not.toHaveAttribute('style');
});

test('automatically understands two visual selections and prepares the single combine action', async () => {
  const fetchMock = appFetch();
  render(<App />);
  const frames = await launch();
  const left = session('left', 'branch-sidebar');
  const right = session('right', 'branch-inspector');
  emit(frames.left, left, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } });
  emit(frames.right, right, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } });
  emit(frames.left, left, 'boundary-selected', { identity: sourceIdentity(left, 'AppSidebar'), ancestors: [] });
  emit(frames.right, right, 'boundary-selected', { identity: sourceIdentity(right, 'ActivityFilters'), ancestors: [] });
  expect((await screen.findAllByText('Collapsible navigation')).length).toBeGreaterThanOrEqual(2);
  expect((await screen.findAllByText('Activity filters')).length).toBeGreaterThanOrEqual(2);
  for (const button of await screen.findAllByRole('button', { name: 'Confirm selection' })) fireEvent.click(button);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create verified branch' })).toBeEnabled());
  expect(screen.getByText('Both selections passed the compatibility check.')).toBeVisible();
  expect(fetchMock.mock.calls.filter(call => String(call[0]).endsWith('/analysis'))).toHaveLength(2);
});

test('keeps detailed evidence in a keyboard-dismissible technical drawer', async () => {
  appFetch();
  render(<App />);
  await launch();
  fireEvent.click(await screen.findByRole('button', { name: 'How are changes identified?' }));
  const dialog = screen.getByRole('dialog', { name: 'Technical details' });
  expect(within(dialog).getAllByText('Feature slice')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Close technical details' })).toHaveFocus();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('returns to the overview without duplicating active previews and resumes predictably', async () => {
  const fetchMock = appFetch();
  render(<App />);
  await launch();
  fireEvent.click(await screen.findByRole('button', { name: '← Back to overview' }));
  expect(screen.getByRole('button', { name: /Resume sample demo/ })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Resume sample demo/ }));
  expect(await screen.findByRole('heading', { name: 'Compare branches' })).toBeVisible();
  expect(fetchMock.mock.calls.filter(call => String(call[0]) === '/api/previews/left')).toHaveLength(1);
  expect(fetchMock.mock.calls.filter(call => String(call[0]) === '/api/previews/right')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: /UI Merge Studio/ }));
  expect(screen.getByRole('button', { name: /Resume sample demo/ })).toBeVisible();
});

test('blocks a broad sample selection before it can appear safe to combine', async () => {
  const fetchMock = appFetch('TicketActivityList');
  render(<App />);
  const frames = await launch();
  const left = session('left', 'branch-sidebar');
  const right = session('right', 'branch-inspector');
  emit(frames.left, left, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } });
  emit(frames.right, right, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } });
  emit(frames.left, left, 'boundary-selected', { identity: sourceIdentity(left, 'AppSidebar'), ancestors: [] });
  emit(frames.right, right, 'boundary-selected', { identity: sourceIdentity(right, 'TicketActivityList'), ancestors: [] });
  expect(await screen.findByText('This selection was stopped before branch creation.')).toBeVisible();
  expect(screen.getByText(/broader than this guided demo can verify safely/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Create verified branch' })).toBeDisabled();
  await waitFor(() => expect(fetchMock.mock.calls.filter(call => String(call[0]) === '/api/candidate/preflight')).toHaveLength(0));
});
