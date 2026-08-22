import { randomUUID } from 'node:crypto';
import { access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { RepositoryController } from '../../repository-controller/src/repositoryController';
import { discoverRepository } from '../../repository-controller/src/repositoryDiscovery';
import { bridgeVersion, type PreviewIdentity } from '../../shared/src/bridge';
import { detectFixtureCapabilities } from './fixtureAdapter';
import {
  isManagedProcessAlive,
  packageManagerProcessSpec,
  spawnManagedProcess,
  stopProcessTree,
  type ManagedProcessHandle
} from './processRuntime';
import {
  discoverRuntimeCommands,
  PreviewRuntimeCommandError,
  type RuntimeCommandInvocation,
  type SupportedPackageManager,
  withViteArguments
} from './runtimeCommands';

export type PreviewStatus = 'starting' | 'running' | 'failed' | 'stopped';
export type PreviewLaunchPhase =
  | 'request-received'
  | 'queued'
  | 'validating-ref'
  | 'stopping-previous-runtime'
  | 'preparing-worktree'
  | 'preparing-dependencies'
  | 'allocating-port'
  | 'starting-runtime'
  | 'waiting-for-runtime'
  | 'ready';

export interface PreviewPhaseEvent {
  phase: PreviewLaunchPhase;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  detail: string;
}

export interface PreviewSession extends PreviewIdentity {
  protocolVersion: typeof bridgeVersion;
  repositoryPath: string;
  commit: string;
  branchCommit: string;
  packageManager: SupportedPackageManager;
  url: string;
  origin: string;
  port: number;
  processId: number;
  worktreePath: string;
  status: PreviewStatus;
  failure: string | null;
}

export interface PreviewStartOptions {
  signal?: AbortSignal;
  onPhase?: (event: PreviewPhaseEvent) => void;
  startupTimeoutMs?: number;
}

interface PreparedPreview {
  branch: string;
  branchCommit: string;
  worktreePath: string;
}

interface ProcessOwnership {
  handle: ManagedProcessHandle;
  commandText: string;
}

export interface PreviewControllerDependencies {
  stopProcessTree?: (handle: ManagedProcessHandle) => Promise<void>;
}

export class PreviewCancelledError extends Error {
  constructor(message = 'Preview launch was cancelled.') {
    super(message);
    this.name = 'PreviewCancelledError';
  }
}

export function createPreviewIdentity(previewId: string, branch: string, generation: number, createId: () => string = randomUUID): PreviewIdentity {
  if (!previewId || !branch || !Number.isInteger(generation) || generation < 1) throw new Error('A valid preview identity requires preview ID, branch, and positive generation.');
  return { previewId, branch, generation, sessionId: createId() };
}

function throwIfCancelled(signal?: AbortSignal) { if (signal?.aborted) throw new PreviewCancelledError(); }

function previewFailure(commandText: string, reason: string) {
  return new PreviewRuntimeCommandError(commandText, reason.trim() || 'the preview command failed without diagnostics');
}

function portConflictReason(diagnostics: string) {
  return /EADDRINUSE|address already in use|port .* already in use/i.test(diagnostics)
    ? `port conflict${diagnostics ? `\n${diagnostics}` : ''}`
    : null;
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }

export async function allocatePort() {
  return await new Promise<number>((accept, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(error => error ? reject(error) : accept(port));
    });
  });
}

async function waitForReady(url: string, handle: ManagedProcessHandle, commandText: string, timeoutMs: number, signal?: AbortSignal) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    throwIfCancelled(signal);
    if (handle.exited || !isManagedProcessAlive(handle)) {
      const output = handle.diagnostics.toString();
      const exitReason = `process exited before readiness with code ${handle.exitCode ?? handle.exitSignal ?? 'unknown'}${output ? `\n${output}` : ''}`;
      throw previewFailure(commandText, portConflictReason(output) ?? exitReason);
    }
    try {
      const requestSignal = signal
        ? AbortSignal.any([signal, AbortSignal.timeout(500)])
        : AbortSignal.timeout(500);
      const response = await fetch(url, { signal: requestSignal });
      if (response.ok) return;
    } catch {
      if (signal?.aborted) throw new PreviewCancelledError();
    }
    await delay(100, undefined, { signal }).catch(() => { throw new PreviewCancelledError(); });
  }
  const output = handle.diagnostics.toString();
  const reason = portConflictReason(output) ?? `startup timeout after ${timeoutMs}ms while waiting for ${url}${output ? `\n${output}` : ''}`;
  throw previewFailure(commandText, reason);
}

export function isProcessAlive(processId: number) {
  try { process.kill(processId, 0); return true; }
  catch { return false; }
}

export class PreviewController {
  private processes = new Map<string, ProcessOwnership>();
  private sessionStates = new Map<string, PreviewSession>();
  private prepared = new Map<string, PreparedPreview>();
  private generations = new Map<string, number>();
  private instrumentationChannels = new Map<string, { identity: PreviewIdentity; branchCommit: string; token: string }>();
  private lifecycleChains = new Map<string, Promise<void>>();
  private readonly stopOwnedProcess: (handle: ManagedProcessHandle) => Promise<void>;

  constructor(
    private repository: RepositoryController,
    private previewViteConfig: string,
    private previewRoute = '/catalogue',
    dependencies: PreviewControllerDependencies = {}
  ) {
    this.stopOwnedProcess = dependencies.stopProcessTree ?? stopProcessTree;
  }

  async branches() { return (await this.repository.inspect()).branches; }

  private serialize<T>(previewId: string, operation: () => Promise<T>) {
    const previous = this.lifecycleChains.get(previewId) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    const settled = result.then(() => undefined, () => undefined);
    this.lifecycleChains.set(previewId, settled);
    void settled.finally(() => {
      if (this.lifecycleChains.get(previewId) === settled) this.lifecycleChains.delete(previewId);
    });
    return result;
  }

  private phase(options: PreviewStartOptions, phase: PreviewLaunchPhase, detail: string) {
    const startedAt = new Date();
    options.onPhase?.({ phase, startedAt: startedAt.toISOString(), completedAt: null, durationMs: null, detail });
    return () => {
      const completedAt = new Date();
      options.onPhase?.({ phase, startedAt: startedAt.toISOString(), completedAt: completedAt.toISOString(), durationMs: completedAt.getTime() - startedAt.getTime(), detail });
    };
  }

  private async stopRuntime(previewId: string) {
    const ownership = this.processes.get(previewId);
    if (!ownership) return;
    try {
      await this.stopOwnedProcess(ownership.handle);
    } catch (error) {
      const session = this.sessionStates.get(previewId);
      if (session) {
        session.status = 'failed';
        session.failure = `Preview cleanup failed: ${errorMessage(error)}`;
      }
      throw error;
    }
    if (this.processes.get(previewId) === ownership) this.processes.delete(previewId);
    this.instrumentationChannels.delete(previewId);
  }

  private async discardPrepared(previewId: string) {
    const prepared = this.prepared.get(previewId);
    if (!prepared) return;
    await this.repository.removeWorktree(prepared.worktreePath);
    if (this.prepared.get(previewId) === prepared) this.prepared.delete(previewId);
  }

  private async runPreparationCommand(previewId: string, cwd: string, command: RuntimeCommandInvocation, displayCommand: string, signal?: AbortSignal) {
    throwIfCancelled(signal);
    const handle = spawnManagedProcess(packageManagerProcessSpec(command), {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
      windowsHide: true
    });
    const ownership = { handle, commandText: displayCommand };
    this.processes.set(previewId, ownership);
    try {
      await handle.spawned;
      const cancelled = new Promise<never>((_, reject) => {
        if (!signal) return;
        signal.addEventListener('abort', () => reject(new PreviewCancelledError()), { once: true });
      });
      await Promise.race([handle.completion, cancelled]);
      throwIfCancelled(signal);
      if (handle.exitCode !== 0) throw previewFailure(displayCommand, handle.diagnostics.toString() || `process exited with code ${handle.exitCode ?? handle.exitSignal ?? 'unknown'}`);
      if (this.processes.get(previewId) === ownership) this.processes.delete(previewId);
    } catch (error) {
      try {
        await this.stopOwnedProcess(handle);
        if (this.processes.get(previewId) === ownership) this.processes.delete(previewId);
      } catch (cleanupError) {
        throw previewFailure(displayCommand, `${errorMessage(error)}\nCleanup failed: ${errorMessage(cleanupError)}`);
      }
      throw error;
    }
  }

  async start(previewIdOrBranch: string, selectedBranch?: string, options: PreviewStartOptions = {}): Promise<PreviewSession> {
    const previewId = selectedBranch === undefined ? 'primary' : previewIdOrBranch;
    const branch = selectedBranch ?? previewIdOrBranch;
    return await this.serialize(previewId, () => this.startSerialized(previewId, branch, options));
  }

  private async startSerialized(previewId: string, branch: string, options: PreviewStartOptions): Promise<PreviewSession> {
    throwIfCancelled(options.signal);
    let done = this.phase(options, 'validating-ref', `Resolving ${branch} to an exact commit.`);
    const branchCommit = await this.repository.resolveRef(branch);
    done();
    throwIfCancelled(options.signal);

    done = this.phase(options, 'stopping-previous-runtime', 'Stopping the previous process while retaining safe prepared files when possible.');
    await this.stopRuntime(previewId);
    const previousSession = this.sessionStates.get(previewId);
    if (previousSession && previousSession.status !== 'failed') previousSession.status = 'stopped';
    done();

    let prepared = this.prepared.get(previewId);
    if (prepared && (prepared.branch !== branch || prepared.branchCommit !== branchCommit)) {
      await this.discardPrepared(previewId);
      prepared = undefined;
    }

    let createdThisAttempt = false;
    if (!prepared) {
      done = this.phase(options, 'preparing-worktree', 'Creating a detached, isolated Git worktree.');
      const worktreePath = await this.repository.createWorktree(branch);
      done();
      prepared = { branch, branchCommit, worktreePath };
      this.prepared.set(previewId, prepared);
      createdThisAttempt = true;
    } else {
      done = this.phase(options, 'preparing-worktree', 'Reusing this preview slot’s unchanged isolated worktree.');
      done();
    }

    let session: PreviewSession | null = null;
    let runtimeOwnership: ProcessOwnership | null = null;
    let commandText = '<preview preparation>';
    try {
      throwIfCancelled(options.signal);
      const runtimeMetadata = await discoverRepository(prepared.worktreePath);
      const commands = discoverRuntimeCommands(runtimeMetadata);
      commandText = commands.devCommand;
      done = this.phase(options, 'preparing-dependencies', createdThisAttempt ? `Installing repository dependencies with ${commands.installCommand}.` : 'Using dependencies already prepared for this exact commit.');
      await access(resolve(prepared.worktreePath, 'node_modules')).catch(() => this.runPreparationCommand(
        previewId,
        prepared!.worktreePath,
        commands.install,
        commands.installCommand,
        options.signal
      ));
      done();

      throwIfCancelled(options.signal);
      done = this.phase(options, 'allocating-port', 'Allocating an unoccupied loopback port.');
      const port = await allocatePort();
      done();

      const generation = (this.generations.get(previewId) ?? 0) + 1;
      this.generations.set(previewId, generation);
      const identity = createPreviewIdentity(previewId, branch, generation);
      const instrumentationToken = randomUUID();
      const origin = `http://127.0.0.1:${port}`;
      const capabilities = await detectFixtureCapabilities(prepared.worktreePath);
      const controlledFixture = capabilities.fixtureContext?.contract === 'product-catalogue-v1';
      const viteArgs = [
        ...(controlledFixture ? ['--config', this.previewViteConfig] : []),
        '--host', '127.0.0.1',
        '--port', String(port),
        '--strictPort'
      ];
      const dev = withViteArguments(commands, viteArgs);

      done = this.phase(options, 'starting-runtime', 'Starting the isolated Vite runtime.');
      let handle!: ManagedProcessHandle;
      handle = spawnManagedProcess(packageManagerProcessSpec(dev), {
        cwd: prepared.worktreePath,
        env: {
          ...process.env,
          UI_MERGE_PREVIEW_ROOT: prepared.worktreePath,
          UI_MERGE_PREVIEW_BRANCH: branch,
          UI_MERGE_PREVIEW_ID: previewId,
          UI_MERGE_PREVIEW_SESSION_ID: identity.sessionId,
          UI_MERGE_PREVIEW_GENERATION: String(generation),
          UI_MERGE_INSTRUMENTATION_TOKEN: instrumentationToken,
          UI_MERGE_STUDIO_ORIGIN: process.env.UI_MERGE_STUDIO_ORIGIN ?? 'http://127.0.0.1:4310'
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
        windowsHide: true
      }, (code, signal) => {
        const currentOwnership = this.processes.get(previewId);
        if (currentOwnership?.handle !== handle) return;
        this.instrumentationChannels.delete(previewId);
        const current = this.sessionStates.get(previewId);
        if (current && current.status !== 'stopped') {
          current.status = 'failed';
          current.failure = `Preview process exited (${code ?? signal ?? 'unknown'}).`;
        }
      });
      runtimeOwnership = { handle, commandText: commands.devCommand };
      this.processes.set(previewId, runtimeOwnership);
      await handle.spawned.catch(error => { throw previewFailure(commands.devCommand, errorMessage(error)); });
      if (!handle.pid) throw previewFailure(commands.devCommand, 'the package manager did not expose a process ID');

      session = {
        ...identity,
        protocolVersion: bridgeVersion,
        repositoryPath: this.repository.repositoryPath,
        commit: branchCommit,
        branchCommit,
        packageManager: commands.packageManager,
        url: `${origin}${this.previewRoute}`,
        origin,
        port,
        processId: handle.pid,
        worktreePath: prepared.worktreePath,
        status: 'starting',
        failure: null
      };
      this.sessionStates.set(previewId, session);
      if (controlledFixture) this.instrumentationChannels.set(previewId, { identity, branchCommit, token: instrumentationToken });
      done();
      if (handle.exited) {
        const output = handle.diagnostics.toString();
        throw previewFailure(commands.devCommand, `process exited before readiness with code ${handle.exitCode ?? handle.exitSignal ?? 'unknown'}${output ? `\n${output}` : ''}`);
      }

      done = this.phase(options, 'waiting-for-runtime', 'Waiting for the preview route to answer successfully.');
      await waitForReady(session.url, handle, commands.devCommand, options.startupTimeoutMs ?? 20_000, options.signal);
      done();
      throwIfCancelled(options.signal);
      if (handle.exited || !isManagedProcessAlive(handle)) throw previewFailure(commands.devCommand, 'process exited immediately after readiness');

      session.status = 'running';
      done = this.phase(options, 'ready', 'The runtime is serving the preview route.');
      done();
      return session;
    } catch (error) {
      if (session) {
        session.status = 'failed';
        session.failure = errorMessage(error);
      }
      let cleanupError: unknown = null;
      if (runtimeOwnership && this.processes.get(previewId) === runtimeOwnership) {
        try { await this.stopRuntime(previewId); }
        catch (caught) { cleanupError = caught; }
      }
      if (!cleanupError && !this.processes.has(previewId)) {
        try { await this.discardPrepared(previewId); }
        catch (caught) { cleanupError = caught; }
      }
      if (cleanupError) {
        const reason = `${errorMessage(error)}\nCleanup failed: ${errorMessage(cleanupError)}`;
        if (session) {
          session.status = 'failed';
          session.failure = reason;
        }
        throw previewFailure(error instanceof PreviewRuntimeCommandError ? error.command : commandText, reason);
      }
      if (options.signal?.aborted || error instanceof PreviewCancelledError) throw new PreviewCancelledError();
      if (error instanceof PreviewRuntimeCommandError) throw error;
      throw previewFailure(commandText, errorMessage(error));
    }
  }

  async stop(previewId = 'primary') {
    await this.serialize(previewId, async () => {
      try {
        await this.stopRuntime(previewId);
        await this.discardPrepared(previewId);
        const session = this.sessionStates.get(previewId);
        if (session) {
          session.status = 'stopped';
          session.failure = null;
        }
      } catch (error) {
        const session = this.sessionStates.get(previewId);
        if (session) {
          session.status = 'failed';
          session.failure = `Preview cleanup failed: ${errorMessage(error)}`;
        }
        throw error;
      }
    });
  }

  async stopAll() {
    const ids = new Set([...this.processes.keys(), ...this.prepared.keys(), ...this.sessionStates.keys(), ...this.lifecycleChains.keys()]);
    await Promise.all([...ids].map(previewId => this.stop(previewId)));
  }

  session(previewId = 'primary') { return this.sessionStates.get(previewId) ?? null; }
  sessions() { return [...this.sessionStates.values()]; }
  isAlive(previewId = 'primary') {
    const session = this.sessionStates.get(previewId);
    const ownership = this.processes.get(previewId);
    return Boolean(session && ownership?.handle.pid === session.processId && (session.status === 'starting' || session.status === 'running') && isManagedProcessAlive(ownership.handle));
  }
  authenticateInstrumentation(previewId: string, token: string, identity: PreviewIdentity) {
    const channel = this.instrumentationChannels.get(previewId);
    if (!channel || channel.token !== token || channel.identity.previewId !== identity.previewId || channel.identity.sessionId !== identity.sessionId || channel.identity.generation !== identity.generation || channel.identity.branch !== identity.branch) return null;
    return { ...channel.identity, branchCommit: channel.branchCommit };
  }
}
