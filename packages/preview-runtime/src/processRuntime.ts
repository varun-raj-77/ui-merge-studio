import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { RuntimeCommandInvocation, SupportedPackageManager } from './runtimeCommands';

export const diagnosticByteLimit = 64 * 1024;

export class BoundedDiagnostics {
  private value = Buffer.alloc(0);

  constructor(readonly limit = diagnosticByteLimit) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Diagnostic limit must be a positive integer.');
  }

  append(value: string | Buffer | Uint8Array) {
    const incoming = Buffer.isBuffer(value) ? value : Buffer.from(value);
    if (incoming.length >= this.limit) this.value = incoming.subarray(incoming.length - this.limit);
    else {
      const combined = Buffer.concat([this.value, incoming]);
      this.value = combined.length > this.limit ? combined.subarray(combined.length - this.limit) : combined;
    }
  }

  toString() { return this.value.toString('utf8'); }
  get byteLength() { return this.value.length; }
}

export interface CommandProcessSpec {
  executable: string;
  args: string[];
}

export interface WindowsPackageManagerPaths {
  nodeExecutable: string;
  npmCli: string;
  corepackCli: string;
}

function windowsPaths(environment: NodeJS.ProcessEnv = process.env): WindowsPackageManagerPaths {
  const nodeExecutable = process.execPath;
  const nodeRoot = dirname(nodeExecutable);
  const npmExecPath = environment.npm_execpath;
  return {
    nodeExecutable,
    npmCli: npmExecPath && /(?:^|[\\/])npm-cli\.js$/i.test(npmExecPath)
      ? npmExecPath
      : resolve(nodeRoot, 'node_modules/npm/bin/npm-cli.js'),
    corepackCli: resolve(nodeRoot, 'node_modules/corepack/dist/corepack.js')
  };
}

export function packageManagerProcessSpec(
  command: RuntimeCommandInvocation,
  platform: NodeJS.Platform = process.platform,
  paths: WindowsPackageManagerPaths = windowsPaths()
): CommandProcessSpec {
  if (platform !== 'win32') return { executable: command.executable, args: [...command.args] };
  if (command.executable === 'npm') {
    return { executable: paths.nodeExecutable, args: [paths.npmCli, ...command.args] };
  }
  return {
    executable: paths.nodeExecutable,
    args: [paths.corepackCli, command.executable, ...command.args]
  };
}

export interface ManagedProcessHandle {
  child: ChildProcess;
  pid: number;
  diagnostics: BoundedDiagnostics;
  exited: boolean;
  closed: boolean;
  exitCode: number | null;
  exitSignal: NodeJS.Signals | null;
  spawned: Promise<void>;
  completion: Promise<void>;
  waitForClose(timeoutMs: number): Promise<boolean>;
}

export function manageProcess(child: ChildProcess, diagnostics = new BoundedDiagnostics(), onExit?: (code: number | null, signal: NodeJS.Signals | null) => void): ManagedProcessHandle {
  let acceptSpawn!: () => void;
  let rejectSpawn!: (error: Error) => void;
  let acceptClose!: () => void;
  const spawned = new Promise<void>((accept, reject) => { acceptSpawn = accept; rejectSpawn = reject; });
  const closed = new Promise<void>(accept => { acceptClose = accept; });
  const handle: ManagedProcessHandle = {
    child,
    pid: child.pid ?? 0,
    diagnostics,
    exited: false,
    closed: false,
    exitCode: null,
    exitSignal: null,
    spawned,
    completion: closed,
    async waitForClose(timeoutMs: number) {
      if (handle.closed) return true;
      await Promise.race([closed, delay(timeoutMs)]);
      return handle.closed;
    }
  };
  child.stdout?.on('data', value => diagnostics.append(value));
  child.stderr?.on('data', value => diagnostics.append(value));
  child.once('spawn', () => {
    handle.pid = child.pid ?? 0;
    acceptSpawn();
  });
  child.once('error', error => {
    diagnostics.append(error.message);
    rejectSpawn(error);
  });
  child.once('exit', (code, signal) => {
    handle.exited = true;
    handle.exitCode = code;
    handle.exitSignal = signal;
    onExit?.(code, signal);
  });
  child.once('close', () => {
    handle.closed = true;
    acceptClose();
  });
  return handle;
}

export function spawnManagedProcess(
  spec: CommandProcessSpec,
  options: SpawnOptions,
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void,
  spawnProcess: typeof spawn = spawn
) {
  return manageProcess(spawnProcess(spec.executable, spec.args, { ...options, shell: false }), new BoundedDiagnostics(), onExit);
}

export function assertCleanupCommandSucceeded(command: string, code: number | null, diagnostics: string) {
  if (code !== 0) throw new Error(`${command} failed (${code ?? 'signal'}): ${diagnostics.trim() || 'no diagnostics'}`);
}

async function runCleanupCommand(executable: string, args: string[], spawnProcess: typeof spawn = spawn) {
  const diagnostics = new BoundedDiagnostics(8 * 1024);
  await new Promise<void>((accept, reject) => {
    const child = spawnProcess(executable, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true });
    child.stdout?.on('data', value => diagnostics.append(value));
    child.stderr?.on('data', value => diagnostics.append(value));
    child.once('error', reject);
    child.once('exit', code => {
      try { assertCleanupCommandSucceeded(`${executable} ${args.join(' ')}`, code, diagnostics.toString()); accept(); }
      catch (error) { reject(error); }
    });
  });
}

function processAlive(pid: number) {
  if (pid < 1) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'EPERM'; }
}

function processGroupAlive(pid: number) {
  if (pid < 1) return false;
  try { process.kill(-pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'EPERM'; }
}

async function waitUntilStopped(alive: () => boolean, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!alive()) return true;
    await delay(50);
  }
  return !alive();
}

export interface StopProcessTreeOptions {
  platform?: NodeJS.Platform;
  cleanupTimeoutMs?: number;
  runWindowsCleanup?: (pid: number) => Promise<void>;
}

export async function stopProcessTree(handle: ManagedProcessHandle, options: StopProcessTreeOptions = {}) {
  const platform = options.platform ?? process.platform;
  const timeoutMs = options.cleanupTimeoutMs ?? 2_000;
  if (platform === 'win32') {
    if (handle.closed && !processAlive(handle.pid)) return;
    if (!processAlive(handle.pid)) {
      if (await handle.waitForClose(250)) return;
      throw new Error(`Preview wrapper ${handle.pid} exited before its inherited process handles closed; descendant cleanup cannot be verified.`);
    }
    const cleanup = options.runWindowsCleanup ?? (pid => runCleanupCommand('taskkill.exe', ['/pid', String(pid), '/t', '/f']));
    await cleanup(handle.pid);
    const [stopped, closed] = await Promise.all([
      waitUntilStopped(() => processAlive(handle.pid), timeoutMs),
      handle.waitForClose(timeoutMs)
    ]);
    if (!stopped || !closed) throw new Error(`Preview process tree ${handle.pid} did not close after taskkill.`);
    return;
  }

  if (!processGroupAlive(handle.pid)) return;
  try { process.kill(-handle.pid, 'SIGTERM'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
  if (await waitUntilStopped(() => processGroupAlive(handle.pid), timeoutMs)) return;
  try { process.kill(-handle.pid, 'SIGKILL'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
  if (!await waitUntilStopped(() => processGroupAlive(handle.pid), timeoutMs)) {
    throw new Error(`Preview process group ${handle.pid} survived SIGTERM and SIGKILL.`);
  }
}

export function isManagedProcessAlive(handle: ManagedProcessHandle) {
  return process.platform === 'win32' ? processAlive(handle.pid) : processGroupAlive(handle.pid);
}

export function packageManagerVerificationLevel(packageManager: SupportedPackageManager) {
  return packageManager === 'npm'
    ? { commandResolution: 'verified', realExecution: 'verified', realViteLaunch: 'verified' } as const
    : { commandResolution: 'verified', realExecution: 'unverified', realViteLaunch: 'unverified' } as const;
}
