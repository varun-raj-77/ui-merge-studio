import { randomUUID } from 'node:crypto';
import { PreviewCancelledError, PreviewController, type PreviewPhaseEvent, type PreviewSession } from './previewController';

export type PreviewOperationState = 'pending' | 'running' | 'ready' | 'failed' | 'cancelled' | 'superseded';

export interface PreviewOperation {
  operationId: string;
  previewId: string;
  branch: string;
  state: PreviewOperationState;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  phases: PreviewPhaseEvent[];
  result: PreviewSession | null;
  error: string | null;
  supersededBy: string | null;
}

export interface PreviewOperationAcknowledgement {
  operationId: string;
  previewId: string;
  branch: string;
  state: PreviewOperationState;
  requestedAt: string;
  coalesced: boolean;
}

function terminal(state: PreviewOperationState) {
  return state === 'ready' || state === 'failed' || state === 'cancelled' || state === 'superseded';
}

export class PreviewOperationManager {
  private operations = new Map<string, PreviewOperation>();
  private controllers = new Map<string, AbortController>();
  private activeByPreview = new Map<string, string>();
  private chains = new Map<string, Promise<void>>();

  constructor(private previews: PreviewController, private createId: () => string = randomUUID) {}

  launch(previewId: string, branch: string): PreviewOperationAcknowledgement {
    const activeId = this.activeByPreview.get(previewId);
    const active = activeId ? this.operations.get(activeId) : undefined;
    if (active && !terminal(active.state) && active.branch === branch) return this.acknowledgement(active, true);

    const now = new Date().toISOString();
    const operation: PreviewOperation = {
      operationId: this.createId(),
      previewId,
      branch,
      state: 'pending',
      requestedAt: now,
      startedAt: null,
      completedAt: null,
      updatedAt: now,
      phases: [{
        phase: 'request-received',
        startedAt: now,
        completedAt: now,
        durationMs: 0,
        detail: 'The launch request was validated and accepted.'
      }, {
        phase: 'queued',
        startedAt: now,
        completedAt: null,
        durationMs: null,
        detail: 'The preview launch is queued for asynchronous execution.'
      }],
      result: null,
      error: null,
      supersededBy: null
    };
    this.operations.set(operation.operationId, operation);

    if (active && !terminal(active.state)) {
      active.state = 'superseded';
      active.supersededBy = operation.operationId;
      active.completedAt = now;
      active.updatedAt = now;
      this.controllers.get(active.operationId)?.abort();
    }

    this.activeByPreview.set(previewId, operation.operationId);
    const controller = new AbortController();
    this.controllers.set(operation.operationId, controller);
    const previous = this.chains.get(previewId) ?? Promise.resolve();
    const runner = previous.catch(() => undefined).then(() => this.run(operation, controller));
    this.chains.set(previewId, runner);
    void runner.finally(() => {
      if (this.chains.get(previewId) === runner) this.chains.delete(previewId);
    });
    return this.acknowledgement(operation, false);
  }

  private acknowledgement(operation: PreviewOperation, coalesced: boolean): PreviewOperationAcknowledgement {
    const { operationId, previewId, branch, state, requestedAt } = operation;
    return { operationId, previewId, branch, state, requestedAt, coalesced };
  }

  private updatePhase(operation: PreviewOperation, event: PreviewPhaseEvent) {
    if (terminal(operation.state)) return;
    const index = operation.phases.findIndex(item => item.phase === event.phase);
    if (index >= 0) operation.phases[index] = event;
    else operation.phases.push(event);
    operation.updatedAt = new Date().toISOString();
  }

  private async run(operation: PreviewOperation, controller: AbortController) {
    const now = new Date().toISOString();
    operation.state = 'running';
    operation.startedAt = now;
    operation.updatedAt = now;
    const queued = operation.phases.find(item => item.phase === 'queued');
    if (queued) {
      queued.completedAt = now;
      queued.durationMs = Date.parse(now) - Date.parse(queued.startedAt);
    }
    try {
      const session = await this.previews.start(operation.previewId, operation.branch, {
        signal: controller.signal,
        onPhase: event => this.updatePhase(operation, event)
      });
      if (controller.signal.aborted || this.operations.get(operation.operationId)?.state === 'superseded') {
        await this.previews.stop(operation.previewId).catch(() => undefined);
        return;
      }
      operation.result = session;
      operation.state = 'ready';
      operation.completedAt = new Date().toISOString();
      operation.updatedAt = operation.completedAt;
    } catch (error) {
      if (this.operations.get(operation.operationId)?.state === 'superseded') return;
      operation.state = error instanceof PreviewCancelledError || controller.signal.aborted ? 'cancelled' : 'failed';
      operation.error = error instanceof Error ? error.message : String(error);
      operation.completedAt = new Date().toISOString();
      operation.updatedAt = operation.completedAt;
    } finally {
      this.controllers.delete(operation.operationId);
      if (this.activeByPreview.get(operation.previewId) === operation.operationId && terminal(operation.state)) this.activeByPreview.delete(operation.previewId);
    }
  }

  get(operationId: string) { return this.operations.get(operationId) ?? null; }

  cancel(operationId: string) {
    const operation = this.operations.get(operationId);
    if (!operation || terminal(operation.state)) return operation ?? null;
    operation.state = 'cancelled';
    operation.error = 'Preview launch was cancelled by the user.';
    operation.completedAt = new Date().toISOString();
    operation.updatedAt = operation.completedAt;
    this.controllers.get(operationId)?.abort();
    if (this.activeByPreview.get(operation.previewId) === operationId) this.activeByPreview.delete(operation.previewId);
    return operation;
  }

  async stopAll() {
    for (const operation of this.operations.values()) if (!terminal(operation.state)) this.cancel(operation.operationId);
    await Promise.allSettled(this.chains.values());
    await this.previews.stopAll();
  }
}
