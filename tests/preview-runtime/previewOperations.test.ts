import { describe, expect, test, vi } from 'vitest';
import { PreviewCancelledError, type PreviewController, type PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { PreviewOperationManager } from '../../packages/preview-runtime/src/previewOperations';
import { ExternalViteInstrumentationRefusal } from '../../packages/preview-runtime/src/viteInstrumentation';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, refuse) => { resolve = accept; reject = refuse; });
  return { promise, resolve, reject };
}

function session(previewId: string, branch: string): PreviewSession {
  return {
    previewId,
    branch,
    generation: 1,
    sessionId: `${previewId}-session`,
    protocolVersion: 2,
    repositoryPath: 'test-repository',
    commit: 'a'.repeat(40),
    branchCommit: 'a'.repeat(40),
    packageManager: 'npm',
    url: 'http://127.0.0.1:4400/catalogue',
    origin: 'http://127.0.0.1:4400',
    port: 4400,
    processId: 4400,
    worktreePath: 'prepared-worktree',
    status: 'running',
    failure: null
  };
}

async function eventually(check: () => void) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try { check(); return; } catch { await new Promise(resolve => setTimeout(resolve, 0)); }
  }
  check();
}

describe('preview operation manager', () => {
  test('acknowledges before launch completes and records truthful terminal state', async () => {
    const work = deferred<PreviewSession>();
    const start = vi.fn(() => work.promise);
    const manager = new PreviewOperationManager({ start, stop: vi.fn(), stopAll: vi.fn() } as unknown as PreviewController, () => '00000000-0000-0000-0000-000000000001');
    const acknowledgement = manager.launch('left', 'branch-a');
    expect(acknowledgement).toMatchObject({ state: 'pending', coalesced: false });
    expect(manager.get(acknowledgement.operationId)?.state).toBe('pending');
    await eventually(() => expect(start).toHaveBeenCalledOnce());
    expect(manager.get(acknowledgement.operationId)?.state).toBe('running');
    work.resolve(session('left', 'branch-a'));
    await eventually(() => expect(manager.get(acknowledgement.operationId)?.state).toBe('ready'));
  });

  test('coalesces an identical in-flight launch without starting duplicate work', async () => {
    const work = deferred<PreviewSession>();
    const start = vi.fn(() => work.promise);
    const manager = new PreviewOperationManager({ start, stop: vi.fn(), stopAll: vi.fn() } as unknown as PreviewController, () => '00000000-0000-0000-0000-000000000002');
    const first = manager.launch('left', 'branch-a');
    const duplicate = manager.launch('left', 'branch-a');
    expect(duplicate).toMatchObject({ operationId: first.operationId, coalesced: true });
    await eventually(() => expect(start).toHaveBeenCalledOnce());
    work.resolve(session('left', 'branch-a'));
  });

  test('supersedes different work for the same slot and isolates concurrent slots', async () => {
    const works = new Map<string, ReturnType<typeof deferred<PreviewSession>>>();
    const start = vi.fn((previewId: string, branch: string) => {
      const work = deferred<PreviewSession>();
      works.set(`${previewId}:${branch}`, work);
      return work.promise;
    });
    let id = 0;
    const manager = new PreviewOperationManager({ start, stop: vi.fn(), stopAll: vi.fn() } as unknown as PreviewController, () => `00000000-0000-0000-0000-${String(++id).padStart(12, '0')}`);
    const first = manager.launch('left', 'branch-a');
    await eventually(() => expect(start).toHaveBeenCalledOnce());
    const replacement = manager.launch('left', 'branch-b');
    const peer = manager.launch('right', 'branch-b');
    expect(manager.get(first.operationId)).toMatchObject({ state: 'superseded', supersededBy: replacement.operationId });
    expect(manager.get(peer.operationId)?.state).toBe('pending');
    works.get('left:branch-a')?.reject(new Error('cancelled'));
    await eventually(() => expect(start).toHaveBeenCalledTimes(3));
    works.get('left:branch-b')?.resolve(session('left', 'branch-b'));
    works.get('right:branch-b')?.resolve(session('right', 'branch-b'));
    await eventually(() => expect(manager.get(replacement.operationId)?.state).toBe('ready'));
    await eventually(() => expect(manager.get(peer.operationId)?.state).toBe('ready'));
  });

  test('cancels active work idempotently and stops all controller resources', async () => {
    const work = deferred<PreviewSession>();
    const stopAll = vi.fn().mockResolvedValue(undefined);
    const manager = new PreviewOperationManager({ start: vi.fn(() => work.promise), stop: vi.fn(), stopAll } as unknown as PreviewController, () => '00000000-0000-0000-0000-000000000004');
    const launch = manager.launch('left', 'branch-a');
    await eventually(() => expect(manager.get(launch.operationId)?.state).toBe('running'));
    expect(manager.cancel(launch.operationId)?.state).toBe('cancelled');
    expect(manager.cancel(launch.operationId)?.state).toBe('cancelled');
    work.reject(new Error('cancelled'));
    await manager.stopAll();
    expect(stopAll).toHaveBeenCalledOnce();
  });

  test('waits for an in-flight slot operation before stopping its prepared resources', async () => {
    const work = deferred<PreviewSession>();
    const stop = vi.fn().mockResolvedValue(undefined);
    const manager = new PreviewOperationManager({ start: vi.fn(() => work.promise), stop, stopAll: vi.fn() } as unknown as PreviewController, () => '00000000-0000-0000-0000-000000000005');
    const launch = manager.launch('left', 'branch-a');
    await eventually(() => expect(manager.get(launch.operationId)?.state).toBe('running'));
    const stopping = manager.stop('left');
    expect(manager.get(launch.operationId)?.state).toBe('cancelled');
    work.reject(new PreviewCancelledError());
    await stopping;
    expect(stop).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledWith('left');
  });

  test('returns a structured refusal for unsupported external Vite composition', async () => {
    const manager = new PreviewOperationManager({
      start: vi.fn().mockRejectedValue(new ExternalViteInstrumentationRefusal('multiple native configs')),
      stop: vi.fn(),
      stopAll: vi.fn()
    } as unknown as PreviewController, () => '00000000-0000-0000-0000-000000000006');
    const launch = manager.launch('left', 'main');
    await eventually(() => expect(manager.get(launch.operationId)?.state).toBe('failed'));
    expect(manager.get(launch.operationId)?.refusal).toEqual({
      code: 'unsupported-vite-instrumentation',
      evidence: 'multiple native configs'
    });
  });
});
