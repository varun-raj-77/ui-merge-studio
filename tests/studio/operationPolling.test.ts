import { describe, expect, test, vi } from 'vitest';
import type { PreviewOperation } from '../../packages/preview-runtime/src/previewOperations';
import { pollPreviewOperation } from '../../apps/studio/src/operationPolling';

function operation(state: PreviewOperation['state']): PreviewOperation {
  return {
    operationId: 'operation-1',
    previewId: 'left',
    branch: 'branch-sidebar',
    state,
    requestedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    updatedAt: new Date().toISOString(),
    phases: [],
    result: null,
    error: null,
    supersededBy: null
  };
}
function response(value: unknown, status = 200) { return Promise.resolve(new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })); }

describe('preview operation polling', () => {
  test('uses one bounded non-overlapping request at a time and stops at ready', async () => {
    let concurrent = 0;
    let maximumConcurrent = 0;
    const states: PreviewOperation['state'][] = ['pending', 'running', 'ready'];
    const fetcher = vi.fn(async () => {
      concurrent++;
      maximumConcurrent = Math.max(maximumConcurrent, concurrent);
      await new Promise(resolve => setTimeout(resolve, 2));
      const value = operation(states.shift()!);
      concurrent--;
      return response(value);
    }) as unknown as typeof fetch;
    const updates: string[] = [];
    const result = await pollPreviewOperation('operation-1', { signal: new AbortController().signal, onUpdate: value => updates.push(value.state), fetcher, initialDelayMs: 1, maximumDelayMs: 2 });
    expect(result.state).toBe('ready');
    expect(updates).toEqual(['pending', 'running', 'ready']);
    expect(maximumConcurrent).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  test('aborts promptly without scheduling another request', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(() => response(operation('running'))) as unknown as typeof fetch;
    const promise = pollPreviewOperation('operation-1', {
      signal: controller.signal,
      onUpdate: () => controller.abort(),
      fetcher,
      initialDelayMs: 1
    });
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  test.each(['failed', 'cancelled', 'superseded'] as const)('stops on %s', async state => {
    const fetcher = vi.fn(() => response(operation(state))) as unknown as typeof fetch;
    expect((await pollPreviewOperation('operation-1', { signal: new AbortController().signal, onUpdate: () => undefined, fetcher })).state).toBe(state);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
