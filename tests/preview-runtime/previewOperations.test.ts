import { describe, expect, test, vi } from 'vitest';
import type { PreviewController, PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { PreviewOperationManager } from '../../packages/preview-runtime/src/previewOperations';

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
    branchCommit: 'a'.repeat(40),
    url: 'http://127.0.0.1:4400/tickets',
    origin: 'http://127.0.0.1:4400',
    port: 4400,
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
    const acknowledgement = manager.launch('left', 'branch-sidebar');
    expect(acknowledgement).toMatchObject({ state: 'pending', coalesced: false });
    expect(manager.get(acknowledgement.operationId)?.state).toBe('pending');
    await eventually(() => expect(start).toHaveBeenCalledOnce());
    expect(manager.get(acknowledgement.operationId)?.state).toBe('running');
    work.resolve(session('left', 'branch-sidebar'));
    await eventually(() => expect(manager.get(acknowledgement.operationId)?.state).toBe('ready'));
  });

  test('coalesces an identical in-flight launch without starting duplicate work', async () => {
    const work = deferred<PreviewSession>();
    const start = vi.fn(() => work.promise);
    const manager = new PreviewOperationManager({ start, stop: vi.fn(), stopAll: vi.fn() } as unknown as PreviewController, () => '00000000-0000-0000-0000-000000000002');
    const first = manager.launch('left', 'branch-sidebar');
    const duplicate = manager.launch('left', 'branch-sidebar');
    expect(duplicate).toMatchObject({ operationId: first.operationId, coalesced: true });
    await eventually(() => expect(start).toHaveBeenCalledOnce());
    work.resolve(session('left', 'branch-sidebar'));
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
    const first = manager.launch('left', 'branch-sidebar');
    await eventually(() => expect(start).toHaveBeenCalledOnce());
    const replacement = manager.launch('left', 'branch-inspector');
    const peer = manager.launch('right', 'branch-inspector');
    expect(manager.get(first.operationId)).toMatchObject({ state: 'superseded', supersededBy: replacement.operationId });
    expect(manager.get(peer.operationId)?.state).toBe('pending');
    works.get('left:branch-sidebar')?.reject(new Error('cancelled'));
    await eventually(() => expect(start).toHaveBeenCalledTimes(3));
    works.get('left:branch-inspector')?.resolve(session('left', 'branch-inspector'));
    works.get('right:branch-inspector')?.resolve(session('right', 'branch-inspector'));
    await eventually(() => expect(manager.get(replacement.operationId)?.state).toBe('ready'));
    await eventually(() => expect(manager.get(peer.operationId)?.state).toBe('ready'));
  });

  test('cancels active work idempotently and stops all controller resources', async () => {
    const work = deferred<PreviewSession>();
    const stopAll = vi.fn().mockResolvedValue(undefined);
    const manager = new PreviewOperationManager({ start: vi.fn(() => work.promise), stop: vi.fn(), stopAll } as unknown as PreviewController, () => '00000000-0000-0000-0000-000000000004');
    const launch = manager.launch('left', 'branch-sidebar');
    await eventually(() => expect(manager.get(launch.operationId)?.state).toBe('running'));
    expect(manager.cancel(launch.operationId)?.state).toBe('cancelled');
    expect(manager.cancel(launch.operationId)?.state).toBe('cancelled');
    work.reject(new Error('cancelled'));
    await manager.stopAll();
    expect(stopAll).toHaveBeenCalledOnce();
  });
});
