// @vitest-environment jsdom
import '../setup';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { App } from '../../apps/studio/src/App';
import { bridgeVersion, type PreviewCapabilities, type PreviewIdentity } from '../../packages/shared/src/bridge';

const capabilities: PreviewCapabilities = { routeSync: { version: 1, contract: 'ticket-query-v1' }, fixtureContext: { version: 1, contract: 'support-ticket-ticket-query-v1', entityType: 'ticket' }, sourceSelection: { version: 1 } };
const session = (previewId: 'left' | 'right', branch: string, generation = 1) => ({ previewId, branch, generation, sessionId: `${previewId}-session-${generation}`, protocolVersion: bridgeVersion, url: `http://127.0.0.1:${previewId === 'left' ? 5001 : 5002}/tickets`, origin: `http://127.0.0.1:${previewId === 'left' ? 5001 : 5002}`, port: previewId === 'left' ? 5001 : 5002, worktreePath: `C:/temp/${previewId}`, status: 'running', failure: null });
function response(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })); }
function emit(frame: HTMLIFrameElement, preview: PreviewIdentity & { origin: string }, type: string, payload?: unknown) { window.dispatchEvent(new MessageEvent('message', { origin: preview.origin, source: frame.contentWindow, data: { version: bridgeVersion, preview, type, payload } })); }
async function launch(fetchMock: { mock: { calls: unknown[][] } }) {
  render(<App />);
  await screen.findByText('Ready');
  fireEvent.click(screen.getByRole('button', { name: 'Launch both previews' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  return { left: await screen.findByTitle('branch-sidebar preview') as HTMLIFrameElement, right: await screen.findByTitle('branch-inspector preview') as HTMLIFrameElement };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
  const identity = (preview: typeof left, componentName: string) => ({ boundaryId: `${componentName}-definition`, instanceId: `${componentName}-instance`, repositoryRelativePath: `src/${componentName}.tsx`, line: 4, column: 8, componentName, exportName: componentName, branch: preview.branch, previewId: preview.previewId, sessionId: preview.sessionId, generation: preview.generation, confidence: 'exact' });
  emit(frames.left, left, 'boundary-selected', { identity: identity(left, 'AppSidebar'), ancestors: [] }); emit(frames.right, right, 'boundary-selected', { identity: identity(right, 'ActivityFilters'), ancestors: [] });
  const summary = screen.getByRole('heading', { name: 'Combined selection summary' }).parentElement!;
  await waitFor(() => { expect(within(summary).getAllByText(/AppSidebar/).length).toBeGreaterThan(0); expect(within(summary).getAllByText(/ActivityFilters/).length).toBeGreaterThan(0); });
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
