// @vitest-environment jsdom
import '../setup';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { App, SlicePanel } from '../../apps/studio/src/App';
import { bridgeVersion, type PreviewCapabilities, type PreviewIdentity } from '../../packages/shared/src/bridge';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';
import type { FeatureSliceArtifact, SliceStatus } from '../../packages/source-analysis/src/types';

const capabilities: PreviewCapabilities = { routeSync: { version: 1, contract: 'ticket-query-v1' }, fixtureContext: { version: 1, contract: 'support-ticket-ticket-query-v1', entityType: 'ticket' }, sourceSelection: { version: 1 } };
const session = (previewId: 'left' | 'right', branch: string, generation = 1) => ({ previewId, branch, generation, sessionId: `${previewId}-session-${generation}`, protocolVersion: bridgeVersion, branchCommit: `${branch}-commit`, url: `http://127.0.0.1:${previewId === 'left' ? 5001 : 5002}/tickets`, origin: `http://127.0.0.1:${previewId === 'left' ? 5001 : 5002}`, port: previewId === 'left' ? 5001 : 5002, worktreePath: `C:/temp/${previewId}`, status: 'running', failure: null });
function response(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })); }
function emit(frame: HTMLIFrameElement, preview: PreviewIdentity & { origin: string }, type: string, payload?: unknown) { window.dispatchEvent(new MessageEvent('message', { origin: preview.origin, source: frame.contentWindow, data: { version: bridgeVersion, preview, type, payload } })); }
function sourceIdentity(preview: ReturnType<typeof session>, componentName: string): SourceIdentity { return { boundaryId: `${componentName}-definition`, instanceId: `${componentName}-instance`, repositoryRelativePath: `src/${componentName}.tsx`, line: 4, column: 8, componentName, exportName: componentName, branch: preview.branch, previewId: preview.previewId, sessionId: preview.sessionId, generation: preview.generation, confidence: 'exact' }; }
function artifact(selection: SourceIdentity, status: SliceStatus, analyzed: string): FeatureSliceArtifact { return { analysisId: `${selection.previewId === 'left' ? 'a' : 'b'}`.repeat(16), relativePath: '.ums/analysis/result/feature-slice.json', slice: { version: 1, repository: { baseRef: 'main', branchRef: selection.branch, mergeBaseCommit: '1111111111111111111111111111111111111111', branchCommit: '2222222222222222222222222222222222222222' }, selection, status, boundary: { original: selection.componentName!, analyzed, status: analyzed === selection.componentName ? 'selected-boundary-sufficient' : 'expanded-to-integration-boundary', reason: analyzed === selection.componentName ? 'Selected boundary is sufficient.' : `Expanded to ${analyzed} through changed integration edges.` }, changedFiles: [], includedChanges: [{ path: selection.repositoryRelativePath, category: 'selected-definition', symbol: { name: selection.componentName!, kind: 'component', region: { startLine: 4, endLine: 8 } }, branchChangeId: `change-${selection.previewId}`, wholeFile: false, reason: 'Validated visual selection seed.', evidenceEdgeIds: ['edge-1'], confidence: 'exact' }], excludedChanges: [{ path: 'src/Unrelated.tsx', symbol: { name: 'Unrelated', kind: 'component', region: { startLine: 1, endLine: 2 } }, branchChangeId: `excluded-${selection.previewId}`, classification: 'proven-unrelated', proof: 'proven', reason: 'Outside the supported graph.' }], unresolvedDependencies: status === 'partial' ? [{ path: selection.repositoryRelativePath, symbol: null, reason: 'Dynamic import', edge: 'unresolved-static-analysis', manualNextStep: 'Choose a supported ancestor.', ancestorBoundaryMayHelp: true }] : [], evidence: [] } }; }
async function launch(fetchMock: { mock: { calls: unknown[][] } }) {
  render(<App />);
  await screen.findByText('Ready');
  fireEvent.click(screen.getByRole('button', { name: 'Launch both previews' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  return { left: await screen.findByTitle('branch-sidebar preview') as HTMLIFrameElement, right: await screen.findByTitle('branch-inspector preview') as HTMLIFrameElement };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('renders an explicit analysis refusal such as a branch commit mismatch', () => {
  render(<SlicePanel artifact={null} status="refused" error="Branch commit mismatch: restart and select again." />);
  expect(screen.getByText('Analysis refused:')).toBeVisible(); expect(screen.getByText(/Branch commit mismatch/)).toBeVisible();
});

test('displays two independently identified previews and synchronizes viewport presets', async () => {
  const left = session('left', 'branch-sidebar'); const right = session('right', 'branch-inspector');
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => { const url = String(input); if (url === '/api/repository') return response({ branches: ['branch-sidebar','branch-inspector','main'], clean: true, sessions: [] }); if (url.endsWith('/left')) return response(left); return response(right); });
  const frames = await launch(fetchMock);
  emit(frames.left, left, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } }); emit(frames.right, right, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } });
  await screen.findByText('Both previews ready');
  expect(screen.getByText(/preview left.*generation 1.*port 5001/)).toBeVisible(); expect(screen.getByText(/preview right.*generation 1.*port 5002/)).toBeVisible();
  fireEvent.change(screen.getByLabelText('Viewport preset'), { target: { value: 'mobile' } });
  expect(frames.left).toHaveStyle({ width: '390px', height: '720px' }); expect(frames.right).toHaveStyle({ width: '390px', height: '720px' });
});

test('retains one validated source selection per preview', async () => {
  const left = session('left', 'branch-sidebar'); const right = session('right', 'branch-inspector');
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => String(input) === '/api/repository' ? response({ branches: ['branch-sidebar','branch-inspector'], clean: true, sessions: [] }) : String(input).endsWith('/left') ? response(left) : response(right));
  const frames = await launch(fetchMock);
  emit(frames.left, left, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } }); emit(frames.right, right, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } });
  emit(frames.left, left, 'boundary-selected', { identity: sourceIdentity(left, 'AppSidebar'), ancestors: [] }); emit(frames.right, right, 'boundary-selected', { identity: sourceIdentity(right, 'ActivityFilters'), ancestors: [] });
  const summary = screen.getByRole('heading', { name: 'Combined selection summary' }).parentElement!;
  await waitFor(() => { expect(within(summary).getAllByText(/AppSidebar/).length).toBeGreaterThan(0); expect(within(summary).getAllByText(/ActivityFilters/).length).toBeGreaterThan(0); });
});

test('starts analysis for the correct preview and renders independent resolved and partial evidence', async () => {
  const left = session('left', 'branch-sidebar'); const right = session('right', 'branch-inspector');
  let finishLeft!: (value: Response) => void;
  const leftResponse = new Promise<Response>(resolve => { finishLeft = resolve; });
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url === '/api/repository') return response({ branches: ['branch-sidebar','branch-inspector'], clean: true, sessions: [] });
    if (url.endsWith('/left') && !url.endsWith('/analysis')) return response(left);
    if (url.endsWith('/right') && !url.endsWith('/analysis')) return response(right);
    if (url === '/api/previews/left/analysis') return leftResponse;
    if (url === '/api/previews/right/analysis') return response(artifact(sourceIdentity(right, 'ActivityFilters'), 'partial', 'TicketInspector'));
    return response({ error: 'unexpected request' }, 500);
  });
  const frames = await launch(fetchMock);
  emit(frames.left, left, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } }); emit(frames.right, right, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } });
  const leftCard = screen.getByTitle('branch-sidebar preview').closest('.preview-card') as HTMLElement; const rightCard = screen.getByTitle('branch-inspector preview').closest('.preview-card') as HTMLElement;
  expect(within(leftCard).getByRole('button', { name: 'Analyze feature slice' })).toBeDisabled();
  emit(frames.left, left, 'boundary-selected', { identity: sourceIdentity(left, 'AppSidebar'), ancestors: [] }); emit(frames.right, right, 'boundary-selected', { identity: sourceIdentity(right, 'ActivityFilters'), ancestors: [] });
  await waitFor(() => expect(within(leftCard).getByRole('button', { name: 'Analyze feature slice' })).toBeEnabled());
  fireEvent.click(within(leftCard).getByRole('button', { name: 'Analyze feature slice' }));
  expect(await within(leftCard).findByText(/Analyzing Git and AST evidence/)).toBeVisible();
  expect(within(rightCard).getByText('Select a source-mapped boundary, then run analysis.')).toBeVisible();
  const analysisCall = fetchMock.mock.calls.find(call => String(call[0]) === '/api/previews/left/analysis')!;
  expect(JSON.parse(String((analysisCall[1] as RequestInit).body)).selection.previewId).toBe('left');
  finishLeft(new Response(JSON.stringify(artifact(sourceIdentity(left, 'AppSidebar'), 'resolved', 'AppSidebar')), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await within(leftCard).findByRole('heading', { name: 'Feature slice · resolved' });
  expect(within(leftCard).getByText('Validated visual selection seed.')).toBeVisible(); expect(within(leftCard).getByText('proven-unrelated · proven')).toBeVisible();
  fireEvent.click(within(rightCard).getByRole('button', { name: 'Analyze feature slice' }));
  await within(rightCard).findByRole('heading', { name: 'Feature slice · partial' });
  expect(within(rightCard).getAllByText('ActivityFilters').length).toBeGreaterThan(1); expect(within(rightCard).getByText('TicketInspector')).toBeVisible(); expect(within(rightCard).getByText('Choose a supported ancestor.')).toBeVisible();
  expect(within(leftCard).getByRole('heading', { name: 'Feature slice · resolved' })).toBeVisible();
});

test('keeps one preview healthy when the other fails to start', async () => {
  const left = session('left', 'branch-sidebar');
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => String(input) === '/api/repository' ? response({ branches: ['branch-sidebar','branch-inspector'], clean: true, sessions: [] }) : String(input).endsWith('/left') ? response(left) : response({ error: 'Vite process exited' }, 500));
  render(<App />); await screen.findByText('Ready'); fireEvent.click(screen.getByRole('button', { name: 'Launch both previews' }));
  const frame = await screen.findByTitle('branch-sidebar preview'); emit(frame as HTMLIFrameElement, left, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } });
  await screen.findByText('Preview ready'); expect(screen.getByRole('alert')).toHaveTextContent('Preview runtime failure: Vite process exited'); expect(frame).toBeVisible();
});

test('shows an explicit incompatibility instead of forcing unlike route contracts', async () => {
  const left = session('left', 'branch-sidebar'); const right = session('right', 'branch-inspector');
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => String(input) === '/api/repository' ? response({ branches: ['branch-sidebar','branch-inspector'], clean: true, sessions: [] }) : String(input).endsWith('/left') ? response(left) : response(right));
  const frames = await launch(fetchMock);
  const incompatible: PreviewCapabilities = { routeSync: { version: 1, contract: 'ticket-path-v1' }, fixtureContext: { version: 1, contract: 'support-ticket-ticket-path-v1', entityType: 'ticket' }, sourceSelection: { version: 1 } };
  emit(frames.left, left, 'preview-ready', { capabilities, context: { route: '/tickets', entity: null } }); emit(frames.right, right, 'preview-ready', { capabilities: incompatible, context: { route: '/tickets', entity: null } });
  await waitFor(() => expect(screen.getByLabelText('Synchronization status')).toHaveTextContent('contracts differ'));
  expect(screen.getAllByText(/Synchronization refusal:/).length).toBe(2);
});
