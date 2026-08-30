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
import type { IntegrationFoundation } from '../../packages/integration-plan/src/integrationPlan';
import { ResizableComparison } from '../../apps/studio/src/WorkspaceComponents';

const capabilities: PreviewCapabilities = { routeSync: { version: 1, contract: 'catalogue-query-v1' }, fixtureContext: { version: 1, contract: 'product-catalogue-v1', entityType: 'product' }, sourceSelection: { version: 1 } };
const session = (previewId: 'left' | 'right', branch: string, generation = 1) => ({ previewId, branch, generation, sessionId: `${previewId}-session-${generation}`, protocolVersion: bridgeVersion, repositoryPath: 'C:/test/repository', commit: `${branch}-commit`, branchCommit: `${branch}-commit`, packageManager: 'npm' as const, url: `http://127.0.0.1:${previewId === 'left' ? 5001 : 5002}/catalogue`, origin: `http://127.0.0.1:${previewId === 'left' ? 5001 : 5002}`, port: previewId === 'left' ? 5001 : 5002, processId: previewId === 'left' ? 5001 : 5002, worktreePath: `C:/temp/${previewId}`, status: 'running' as const, failure: null });
function response(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })); }
function emit(frame: HTMLIFrameElement, preview: PreviewIdentity & { origin: string }, type: string, payload?: unknown) { window.dispatchEvent(new MessageEvent('message', { origin: preview.origin, source: frame.contentWindow, data: { version: bridgeVersion, preview, type, payload } })); }
function sourceIdentity(preview: ReturnType<typeof session>, componentName: string): SourceIdentity { return { boundaryId: `${componentName}-definition`, instanceId: `${componentName}-instance`, repositoryRelativePath: `src/${componentName}.tsx`, line: 4, column: 8, componentName, exportName: componentName, branch: preview.branch, previewId: preview.previewId, sessionId: preview.sessionId, generation: preview.generation, confidence: 'exact' }; }
const renderedReceipt = (previewId: 'left' | 'right') => `rendered-${previewId === 'left' ? 'a'.repeat(32) : 'b'.repeat(32)}`;
function artifact(selection: SourceIdentity, status: SliceStatus = 'resolved', analyzed = selection.componentName!): FeatureSliceArtifact {
  return { analysisId: `${selection.previewId === 'left' ? 'a' : 'b'}`.repeat(16), relativePath: '.ums/analysis/result/feature-slice.json', slice: { version: 2, repository: { baseRef: 'main', branchRef: selection.branch, mergeBaseCommit: '1'.repeat(40), branchCommit: '2'.repeat(40) }, selection, status, boundary: { original: selection.componentName!, analyzed, status: analyzed === selection.componentName ? 'selected-boundary-sufficient' : 'expanded-to-integration-boundary', reason: 'Supported integration evidence.' }, changedFiles: [], includedChanges: [{ path: selection.repositoryRelativePath, category: 'selected-definition', symbol: { name: selection.componentName!, kind: 'component', region: { startLine: 4, endLine: 8 } }, branchChangeId: `change-${selection.previewId}`, wholeFile: false, reason: 'Validated visual selection seed.', evidenceEdgeIds: ['edge-1'], confidence: 'exact' }], excludedChanges: [], unresolvedDependencies: [], testFileSlices: [], evidence: [] } };
}
const foundation: IntegrationFoundation = { repositoryId: 'test-repository', branchRef: 'main', commitSha: '1'.repeat(40), commonAncestorCommit: '1'.repeat(40), role: 'base' };
const discovery = {
  repositoryPath: 'C:/test/repository',
  git: { detected: true as const, root: 'C:/test/repository' },
  packageJsonPath: 'C:/test/repository/package.json',
  packageName: 'test-product-workspace',
  packageManager: { name: 'npm' as const, evidence: 'package-lock.json lockfile', lockFiles: ['package-lock.json'] },
  entryPoints: ['src/main.tsx'],
  sourceDirectories: ['src'],
  scripts: { dev: 'vite' },
  dependencies: { production: { react: '19.1.0' }, development: { typescript: '5.8.3', vite: '6.3.5' }, peer: {}, all: { react: '19.1.0', typescript: '5.8.3', vite: '6.3.5' } },
  framework: { kind: 'react-typescript-vite' as const, react: { detected: true as const, version: '19.1.0', evidence: ['react dependency'] }, typescript: { detected: true as const, version: '5.8.3', configFiles: ['tsconfig.json'], evidence: ['typescript dependency'] }, vite: { detected: true as const, version: '6.3.5', configFiles: ['vite.config.ts'], evidence: ['vite dependency'] } }
};
function analysisEvidence(value: FeatureSliceArtifact) { return { artifact: value, foundation, selection: { capabilityId: `analyzed-selection:${value.analysisId}`, capabilityKind: 'whole-feature', sourceBranch: value.slice.repository.branchRef, sourceCommitSha: value.slice.repository.branchCommit, route: '/catalogue', pageId: '/catalogue', targetIds: [value.slice.selection.boundaryId] } }; }
function readyOperation(previewId: 'left' | 'right', branch: string): PreviewOperation {
  const value = session(previewId, branch);
  return { operationId: `${previewId}-operation`, previewId, branch, state: 'ready', requestedAt: '2026-01-01T00:00:00.000Z', startedAt: '2026-01-01T00:00:00.001Z', completedAt: '2026-01-01T00:00:00.002Z', updatedAt: '2026-01-01T00:00:00.002Z', phases: [], result: value, error: null, refusal: null, supersededBy: null };
}
function appFetch(rightComponent = 'ProductQuickView') {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url === '/api/repository') return response({ repositoryId: foundation.repositoryId, discovery, foundation, branches: ['branch-a', 'branch-b', 'main'], clean: true, sessions: [] });
    if (url === '/api/previews/left' && init?.method === 'POST') return response({ operationId: 'left-operation', previewId: 'left', branch: 'branch-a', state: 'pending', requestedAt: '', coalesced: false }, 202);
    if (url === '/api/previews/right' && init?.method === 'POST') return response({ operationId: 'right-operation', previewId: 'right', branch: 'branch-b', state: 'pending', requestedAt: '', coalesced: false }, 202);
    if (url.endsWith('/left-operation')) return response(readyOperation('left', 'branch-a'));
    if (url.endsWith('/right-operation')) return response(readyOperation('right', 'branch-b'));
    if (url === '/api/previews/left/analysis') return response(analysisEvidence(artifact(sourceIdentity(session('left', 'branch-a'), 'CategorySidebar'))));
    if (url === '/api/previews/right/analysis') return response(analysisEvidence(artifact(sourceIdentity(session('right', 'branch-b'), rightComponent))));
    if (url === '/api/candidate/preflight') { const requested = JSON.parse(String(init?.body)) as { planIdentity: string }; return response({ generationId: 'f'.repeat(16), integrationPlan: { version: 2, identity: requested.planIdentity }, plan: { version: 1, repository: { baseCommit: '1'.repeat(40), candidateBranch: 'combined-result' }, sliceIds: ['a'.repeat(16), 'b'.repeat(16)], operations: [], conflicts: [], unresolved: [], status: 'ready' } }); }
    return response({ error: `Unexpected request: ${url}` }, 500);
  });
}
async function launch() {
  const launchButton = await screen.findByRole('button', { name: /Continue to comparison/i });
  await waitFor(() => expect(launchButton).toBeEnabled(), { timeout: 10_000 });
  fireEvent.click(launchButton);
  return {
    left: await screen.findByTitle('Source A · branch-a live application', {}, { timeout: 5_000 }) as HTMLIFrameElement,
    right: await screen.findByTitle('Source B · branch-b live application', {}, { timeout: 5_000 }) as HTMLIFrameElement
  };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('uses the precision-instrument tokens and preserves reduced-motion communication', () => {
  const css = readFileSync('apps/studio/src/studio.css', 'utf8');
  for (const token of ['--ink: #111315', '--ivory: #f5f2eb', '--white: #ffffff', '--stone: #d9d4ca', '--light-stone: #ece8df', '--graphite: #686c70', '--signal: #665cf6', '--signal-dark: #574cdb']) expect(css).toContain(token);
  expect(css).toContain('.studio-workspace { min-height: 100vh;');
  expect(css).toContain('.primary-action { color: var(--white); background: var(--ink)');
  expect(css).toContain('.selection-tray { position: sticky;');
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  expect(css).toContain('animation-iteration-count: 1 !important');
});

test('renders an explicit analysis refusal in technical evidence', () => {
  render(<SlicePanel artifact={null} status="refused" error="Branch commit mismatch: restart and select again." />);
  expect(screen.getByText('Analysis refused')).toBeVisible();
  expect(screen.getByText(/Branch commit mismatch/)).toBeVisible();
});

test('renders real discovered repository metadata before comparison', async () => {
  appFetch();
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'test-product-workspace' })).toBeVisible();
  expect(screen.getByText('C:/test/repository')).toBeVisible();
  expect(screen.getByText('Repository ready')).toBeVisible();
  expect(screen.getByText(/React/)).toBeVisible();
  expect(screen.getByText(/TypeScript/)).toBeVisible();
  expect(screen.getByText(/Vite/)).toBeVisible();
  expect(screen.getByRole('button', { name: /Continue to comparison/ })).toBeVisible();
  expect(screen.getByText(/npm run dev -- --repository/)).toBeInTheDocument();
  const text = document.body.textContent ?? '';
  for (const forbidden of ['Hovered boundary', 'Selected boundary', 'Eligible ancestors', 'Feature slice', 'Merge base', 'Runtime instance', 'Candidate preflight']) expect(text).not.toContain(forbidden);
});

test('launches through acknowledged operations and keeps both runtime identities isolated', async () => {
  appFetch();
  render(<App />);
  const frames = await launch();
  emit(frames.left, session('left', 'branch-a'), 'preview-ready', { capabilities, context: { route: '/catalogue', entity: null } });
  emit(frames.right, session('right', 'branch-b'), 'preview-ready', { capabilities, context: { route: '/catalogue', entity: null } });
  expect(await screen.findByText('Two running versions')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Choose the parts worth keeping.' })).toBeVisible();
  expect(screen.getByText('Foundation')).toBeVisible();
  expect(screen.getByText('Source versions')).toBeVisible();
  expect(screen.getAllByText('branch-a').length).toBeGreaterThan(0);
  expect(screen.getAllByText('branch-b').length).toBeGreaterThan(0);
  expect(screen.queryByRole('combobox', { name: /source/i })).not.toBeInTheDocument();
  expect(document.querySelector('.studio-workspace')).not.toHaveTextContent('Version A');
  expect(document.querySelector('.studio-workspace')).not.toHaveTextContent('Version B');
  expect(frames.left).toHaveAttribute('src', session('left', 'branch-a').url);
  expect(frames.right).toHaveAttribute('src', session('right', 'branch-b').url);
  fireEvent.change(screen.getByLabelText('Preview size'), { target: { value: 'mobile' } });
  expect(frames.left.parentElement).toHaveStyle({ maxWidth: '390px' });
  expect(frames.right.parentElement).toHaveStyle({ maxWidth: '390px' });
  expect(frames.left).not.toHaveAttribute('style');
  expect(frames.right).not.toHaveAttribute('style');
});

test('enters and exits selection mode with the real global control', async () => {
  appFetch();
  render(<App />);
  const frames = await launch();
  const left = session('left', 'branch-a');
  const right = session('right', 'branch-b');
  emit(frames.left, left, 'preview-ready', { capabilities, context: { route: '/catalogue', entity: null } });
  emit(frames.right, right, 'preview-ready', { capabilities, context: { route: '/catalogue', entity: null } });
  fireEvent.click(await screen.findByRole('button', { name: 'Select parts' }));
  emit(frames.left, left, 'selection-mode-enabled');
  emit(frames.right, right, 'selection-mode-enabled');
  expect(screen.getByRole('button', { name: /Selecting · Esc to finish/ })).toBeVisible();
  fireEvent.keyDown(window, { key: 'Escape' });
  emit(frames.left, left, 'selection-mode-disabled');
  emit(frames.right, right, 'selection-mode-disabled');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Select parts' })).toBeVisible());
});

test('updates comparison separator aria value after keyboard resizing without replacing previews', () => {
  render(<ResizableComparison layout="both" left={<iframe title="left preview" />} right={<iframe title="right preview" />} />);
  const separator = screen.getByRole('separator', { name: 'Resize source previews' });
  const leftFrame = screen.getByTitle('left preview');
  expect(separator).toHaveAttribute('aria-valuenow', '50');
  separator.focus();
  fireEvent.keyDown(separator, { key: 'ArrowRight' });
  expect(separator).toHaveAttribute('aria-valuenow', '53');
  expect(document.querySelector('.preview-comparison')).toHaveStyle({ '--left-pane': '53%' });
  expect(screen.getByTitle('left preview')).toBe(leftFrame);
});

test('automatically resolves visual selections into the tray and real combine action', async () => {
  const fetchMock = appFetch();
  render(<App />);
  const frames = await launch();
  const left = session('left', 'branch-a');
  const right = session('right', 'branch-b');
  emit(frames.left, left, 'preview-ready', { capabilities, context: { route: '/catalogue', entity: null } });
  emit(frames.right, right, 'preview-ready', { capabilities, context: { route: '/catalogue', entity: null } });
  emit(frames.left, left, 'boundary-selected', { selectionReceipt: renderedReceipt('left'), ancestorSelectionReceipts: [] });
  emit(frames.right, right, 'boundary-selected', { selectionReceipt: renderedReceipt('right'), ancestorSelectionReceipts: [] });
  expect((await screen.findAllByText('Category Sidebar')).length).toBeGreaterThanOrEqual(2);
  expect((await screen.findAllByText('Product Quick View')).length).toBeGreaterThanOrEqual(2);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create combined branch' })).toBeEnabled());
  expect(screen.getByText('2 selected')).toBeVisible();
  expect(screen.getByText('The selected source slices can be combined safely.')).toBeVisible();
  const causality = screen.getByRole('list', { name: 'Selection to verification progress' });
  for (const label of ['Selected', 'Source', 'Slice']) expect(within(causality).getByText(label).closest('li')).toHaveClass('causal-complete');
  expect(fetchMock.mock.calls.filter(call => String(call[0]).endsWith('/analysis'))).toHaveLength(2);
  for (const call of fetchMock.mock.calls.filter(call => String(call[0]).endsWith('/analysis'))) {
    const analysisBody = JSON.parse(String(call[1]?.body));
    expect(analysisBody).toEqual({ selectionReceipt: expect.stringMatching(/^rendered-[A-Za-z0-9_-]{32}$/) });
    expect(JSON.stringify(analysisBody)).not.toMatch(/repositoryRelativePath|componentName|SourceIdentity|\.tsx/);
  }
  const preflightBody = JSON.parse(String(fetchMock.mock.calls.find(call => String(call[0]) === '/api/candidate/preflight')?.[1]?.body));
  expect(preflightBody).toEqual({ plan: expect.objectContaining({ version: 2, foundation, selections: expect.any(Array) }), planIdentity: expect.stringMatching(/^plan-v2-/) });
  expect(preflightBody).not.toHaveProperty('artifacts');
});

test('opens exact evidence from a real selection and closes it with Escape', async () => {
  appFetch();
  render(<App />);
  const frames = await launch();
  const left = session('left', 'branch-a');
  emit(frames.left, left, 'preview-ready', { capabilities, context: { route: '/catalogue', entity: null } });
  emit(frames.left, left, 'boundary-selected', { selectionReceipt: renderedReceipt('left'), ancestorSelectionReceipts: [] });
  await screen.findAllByText('Category Sidebar');
  fireEvent.click(screen.getAllByRole('button', { name: 'Evidence' })[0]);
  const dialog = screen.getByRole('dialog', { name: 'Evidence' });
  expect(within(dialog).getByText('src/CategorySidebar.tsx:4:8')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Close evidence drawer' })).toHaveFocus();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('returns to project context without duplicating active previews and resumes predictably', async () => {
  const fetchMock = appFetch();
  render(<App />);
  await launch();
  fireEvent.click(await screen.findByRole('button', { name: 'Return to project context' }));
  expect(screen.getByRole('button', { name: /Continue to comparison/ })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Continue to comparison/ }));
  expect(await screen.findByRole('heading', { name: 'Choose the parts worth keeping.' })).toBeVisible();
  expect(fetchMock.mock.calls.filter(call => String(call[0]) === '/api/previews/left')).toHaveLength(1);
  expect(fetchMock.mock.calls.filter(call => String(call[0]) === '/api/previews/right')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Return to project context' }));
  expect(screen.getByRole('button', { name: /Continue to comparison/ })).toBeVisible();
});

test('does not use a fixture-specific component allowlist before engine preflight', async () => {
  const fetchMock = appFetch('InventorySummary');
  render(<App />);
  const frames = await launch();
  const left = session('left', 'branch-a');
  const right = session('right', 'branch-b');
  emit(frames.left, left, 'preview-ready', { capabilities, context: { route: '/catalogue', entity: null } });
  emit(frames.right, right, 'preview-ready', { capabilities, context: { route: '/catalogue', entity: null } });
  emit(frames.left, left, 'boundary-selected', { selectionReceipt: renderedReceipt('left'), ancestorSelectionReceipts: [] });
  emit(frames.right, right, 'boundary-selected', { selectionReceipt: renderedReceipt('right'), ancestorSelectionReceipts: [] });
  expect((await screen.findAllByText('Inventory Summary')).length).toBeGreaterThan(0);
  await waitFor(() => expect(fetchMock.mock.calls.filter(call => String(call[0]) === '/api/candidate/preflight')).toHaveLength(1));
});

test('opens a contextual real-action command menu with Ctrl+K', async () => {
  appFetch();
  render(<App />);
  await launch();
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  const dialog = screen.getByRole('dialog', { name: 'Command menu' });
  expect(within(dialog).getByRole('button', { name: /Select parts/ })).toBeVisible();
  expect(within(dialog).getByRole('button', { name: /Restart Source A preview/ })).toBeVisible();
  expect(within(dialog).queryByText(/checkout|commit history|open terminal/i)).not.toBeInTheDocument();
});
