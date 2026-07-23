import type { PreviewOperation } from '../../../packages/preview-runtime/src/previewOperations';

const terminalStates = new Set<PreviewOperation['state']>(['ready', 'failed', 'cancelled', 'superseded']);

export interface PollPreviewOperationOptions {
  signal: AbortSignal;
  onUpdate: (operation: PreviewOperation) => void;
  fetcher?: typeof fetch;
  initialDelayMs?: number;
  maximumDelayMs?: number;
  timeoutMs?: number;
}

export async function pollPreviewOperation(operationId: string, options: PollPreviewOperationOptions) {
  const fetcher = options.fetcher ?? fetch;
  const started = Date.now();
  let delayMs = options.initialDelayMs ?? 120;
  const maximumDelayMs = options.maximumDelayMs ?? 800;
  const timeoutMs = options.timeoutMs ?? 120_000;

  while (!options.signal.aborted) {
    if (Date.now() - started > timeoutMs) throw new Error('Preview preparation timed out before reaching a terminal state.');
    const response = await fetcher(`/api/preview-operations/${operationId}`, { signal: options.signal });
    const value = await response.json() as PreviewOperation | { error?: string };
    if (!response.ok) throw new Error('error' in value && value.error ? value.error : response.statusText);
    const operation = value as PreviewOperation;
    options.onUpdate(operation);
    if (terminalStates.has(operation.state)) return operation;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delayMs);
      options.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    });
    delayMs = Math.min(maximumDelayMs, Math.ceil(delayMs * 1.55));
  }
  throw new DOMException('Aborted', 'AbortError');
}
