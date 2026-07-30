import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { RepositoryController } from '../../repository-controller/src/repositoryController';
import { bridgeVersion, type PreviewIdentity } from '../../shared/src/bridge';

export type PreviewStatus = 'running' | 'failed';
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
  branchCommit: string;
  url: string;
  origin: string;
  port: number;
  worktreePath: string;
  status: PreviewStatus;
  failure: string | null;
}

export interface PreviewStartOptions {
  signal?: AbortSignal;
  onPhase?: (event: PreviewPhaseEvent) => void;
}

interface PreparedPreview {
  branch: string;
  branchCommit: string;
  worktreePath: string;
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

function command(name: string) { return name; }
function throwIfCancelled(signal?: AbortSignal) { if (signal?.aborted) throw new PreviewCancelledError(); }

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

async function runProcess(cwd: string, executable: string, args: string[], signal?: AbortSignal) {
  await new Promise<void>((accept, reject) => {
    throwIfCancelled(signal);
    const child = spawn(executable, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
    let output = '';
    const cancel = () => {
      void stopTree(child).finally(() => reject(new PreviewCancelledError()));
    };
    signal?.addEventListener('abort', cancel, { once: true });
    child.stdout?.on('data', value => output += value);
    child.stderr?.on('data', value => output += value);
    child.once('error', reject);
    child.once('exit', code => {
      signal?.removeEventListener('abort', cancel);
      code === 0 ? accept() : reject(new Error(`${executable} failed (${code}): ${output}`));
    });
  });
}

async function waitForReady(url: string, child: ChildProcess, signal?: AbortSignal) {
  for (let attempt = 0; attempt < 200; attempt++) {
    throwIfCancelled(signal);
    if (child.exitCode !== null) throw new Error(`Preview process exited before readiness (${child.exitCode}).`);
    try {
      const response = await fetch(url, { signal });
      if (response.ok) return;
    } catch (error) {
      if (signal?.aborted) throw new PreviewCancelledError();
    }
    await delay(100, undefined, { signal }).catch(() => { throw new PreviewCancelledError(); });
  }
  throw new Error(`Preview did not become ready: ${url}`);
}

async function stopTree(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') await runProcess(process.cwd(), 'taskkill', ['/pid', String(child.pid), '/t', '/f']).catch(() => undefined);
  else {
    child.kill('SIGTERM');
    await Promise.race([new Promise<void>(accept => child.once('exit', () => accept())), delay(2_000)]).catch(() => undefined);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

export class PreviewController {
  private active = new Map<string, { session: PreviewSession; child: ChildProcess }>();
  private prepared = new Map<string, PreparedPreview>();
  private generations = new Map<string, number>();

  constructor(private repository: RepositoryController, private previewViteConfig: string, private previewRoute = '/catalogue') {}

  async branches() { return (await this.repository.inspect()).branches; }

  private phase(options: PreviewStartOptions, phase: PreviewLaunchPhase, detail: string) {
    const startedAt = new Date();
    options.onPhase?.({ phase, startedAt: startedAt.toISOString(), completedAt: null, durationMs: null, detail });
    return () => {
      const completedAt = new Date();
      options.onPhase?.({ phase, startedAt: startedAt.toISOString(), completedAt: completedAt.toISOString(), durationMs: completedAt.getTime() - startedAt.getTime(), detail });
    };
  }

  private async stopRuntime(previewId: string) {
    const current = this.active.get(previewId);
    if (!current) return;
    this.active.delete(previewId);
    await stopTree(current.child);
  }

  private async discardPrepared(previewId: string) {
    const prepared = this.prepared.get(previewId);
    if (!prepared) return;
    this.prepared.delete(previewId);
    await this.repository.removeWorktree(prepared.worktreePath);
  }

  async start(previewIdOrBranch: string, selectedBranch?: string, options: PreviewStartOptions = {}): Promise<PreviewSession> {
    const previewId = selectedBranch === undefined ? 'primary' : previewIdOrBranch;
    const branch = selectedBranch ?? previewIdOrBranch;
    throwIfCancelled(options.signal);

    let done = this.phase(options, 'validating-ref', `Resolving ${branch} to an exact commit.`);
    const branchCommit = await this.repository.resolveRef(branch);
    done();
    throwIfCancelled(options.signal);

    done = this.phase(options, 'stopping-previous-runtime', 'Stopping the previous process while retaining safe prepared files when possible.');
    await this.stopRuntime(previewId);
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

    let child: ChildProcess | null = null;
    try {
      throwIfCancelled(options.signal);
      done = this.phase(options, 'preparing-dependencies', createdThisAttempt ? 'Installing the fixture’s locked dependencies in its isolated worktree.' : 'Using dependencies already prepared for this exact commit.');
      await access(resolve(prepared.worktreePath, 'node_modules')).catch(() => runProcess(prepared!.worktreePath, command('npm'), ['ci', '--prefer-offline', '--no-audit', '--no-fund'], options.signal));
      done();

      throwIfCancelled(options.signal);
      done = this.phase(options, 'allocating-port', 'Allocating an unoccupied loopback port.');
      const port = await allocatePort();
      done();

      const generation = (this.generations.get(previewId) ?? 0) + 1;
      this.generations.set(previewId, generation);
      const identity = createPreviewIdentity(previewId, branch, generation);
      const origin = `http://127.0.0.1:${port}`;
      const viteCli = resolve(prepared.worktreePath, 'node_modules/vite/bin/vite.js');

      done = this.phase(options, 'starting-runtime', 'Starting the isolated Vite runtime.');
      child = spawn(process.execPath, [viteCli, '--config', this.previewViteConfig, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: prepared.worktreePath,
        env: {
          ...process.env,
          UI_MERGE_PREVIEW_ROOT: prepared.worktreePath,
          UI_MERGE_PREVIEW_BRANCH: branch,
          UI_MERGE_PREVIEW_ID: previewId,
          UI_MERGE_PREVIEW_SESSION_ID: identity.sessionId,
          UI_MERGE_PREVIEW_GENERATION: String(generation),
          UI_MERGE_STUDIO_ORIGIN: process.env.UI_MERGE_STUDIO_ORIGIN ?? 'http://127.0.0.1:4310'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      done();

      let diagnostics = '';
      child.stdout?.on('data', value => diagnostics += value);
      child.stderr?.on('data', value => diagnostics += value);
      child.once('error', error => { diagnostics += error.message; });

      done = this.phase(options, 'waiting-for-runtime', 'Waiting for the preview route to answer successfully.');
      await waitForReady(`${origin}${this.previewRoute}`, child, options.signal).catch(error => {
        throw new Error(`${error instanceof Error ? error.message : String(error)}\n${diagnostics}`);
      });
      done();
      throwIfCancelled(options.signal);

      const session: PreviewSession = {
        ...identity,
        branchCommit,
        protocolVersion: bridgeVersion,
        url: `${origin}${this.previewRoute}`,
        origin,
        port,
        worktreePath: prepared.worktreePath,
        status: 'running',
        failure: null
      };
      this.active.set(previewId, { session, child });
      child.once('exit', code => {
        const current = this.active.get(previewId);
        if (current?.child === child && code !== 0) {
          current.session.status = 'failed';
          current.session.failure = `Preview process exited (${code}).`;
        }
      });
      done = this.phase(options, 'ready', 'The runtime is serving the preview route.');
      done();
      return session;
    } catch (error) {
      if (child) await stopTree(child);
      if (createdThisAttempt || options.signal?.aborted) await this.discardPrepared(previewId).catch(() => undefined);
      if (options.signal?.aborted) throw new PreviewCancelledError();
      throw error;
    }
  }

  async stop(previewId = 'primary') {
    await this.stopRuntime(previewId);
    await this.discardPrepared(previewId);
  }

  async stopAll() {
    const ids = new Set([...this.active.keys(), ...this.prepared.keys()]);
    await Promise.all([...ids].map(previewId => this.stop(previewId)));
  }

  session(previewId = 'primary') { return this.active.get(previewId)?.session ?? null; }
  sessions() { return [...this.active.values()].map(value => value.session); }
}
