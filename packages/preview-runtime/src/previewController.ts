import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { RepositoryController } from '../../repository-controller/src/repositoryController';
import { bridgeVersion, type PreviewIdentity } from '../../shared/src/bridge';

export type PreviewStatus = 'running' | 'failed';
export interface PreviewSession extends PreviewIdentity { protocolVersion: typeof bridgeVersion; url: string; origin: string; port: number; worktreePath: string; status: PreviewStatus; failure: string | null }
export function createPreviewIdentity(previewId: string, branch: string, generation: number, createId: () => string = randomUUID): PreviewIdentity { if (!previewId || !branch || !Number.isInteger(generation) || generation < 1) throw new Error('A valid preview identity requires preview ID, branch, and positive generation.'); return { previewId, branch, generation, sessionId: createId() }; }
function command(name: string) { return name; }
export async function allocatePort() { return await new Promise<number>((accept, reject) => { const server = createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const address = server.address(); const port = typeof address === 'object' && address ? address.port : 0; server.close(error => error ? reject(error) : accept(port)); }); }); }
async function runProcess(cwd: string, executable: string, args: string[]) { await new Promise<void>((accept, reject) => { const child = spawn(executable, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' }); let output = ''; child.stdout?.on('data', value => output += value); child.stderr?.on('data', value => output += value); child.once('error', reject); child.once('exit', code => code === 0 ? accept() : reject(new Error(`${executable} failed (${code}): ${output}`))); }); }
async function waitForReady(url: string, child: ChildProcess) { for (let attempt = 0; attempt < 100; attempt++) { if (child.exitCode !== null) throw new Error(`Preview process exited before readiness (${child.exitCode}).`); try { const response = await fetch(url); if (response.ok) return; } catch { /* process is still starting */ } await delay(100); } throw new Error(`Preview did not become ready: ${url}`); }
async function stopTree(child: ChildProcess) { if (!child.pid || child.exitCode !== null) return; if (process.platform === 'win32') await runProcess(process.cwd(), 'taskkill', ['/pid', String(child.pid), '/t', '/f']).catch(() => undefined); else child.kill('SIGTERM'); }

export class PreviewController {
  private active = new Map<string, { session: PreviewSession; child: ChildProcess }>();
  private generations = new Map<string, number>();
  constructor(private repository: RepositoryController, private previewViteConfig: string) {}
  async branches() { return (await this.repository.inspect()).branches; }
  async start(previewIdOrBranch: string, selectedBranch?: string): Promise<PreviewSession> {
    const previewId = selectedBranch === undefined ? 'primary' : previewIdOrBranch;
    const branch = selectedBranch ?? previewIdOrBranch;
    await this.stop(previewId);
    const generation = (this.generations.get(previewId) ?? 0) + 1;
    this.generations.set(previewId, generation);
    const identity = createPreviewIdentity(previewId, branch, generation);
    const { sessionId } = identity;
    const worktreePath = await this.repository.createWorktree(branch);
    try {
      await access(resolve(worktreePath, 'node_modules')).catch(() => runProcess(worktreePath, command('npm'), ['ci', '--no-audit', '--no-fund']));
      const port = await allocatePort();
      const origin = `http://127.0.0.1:${port}`;
      const viteCli = resolve(worktreePath, 'node_modules/vite/bin/vite.js');
      const child = spawn(process.execPath, [viteCli, '--config', this.previewViteConfig, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
        cwd: worktreePath,
        env: { ...process.env, UI_MERGE_PREVIEW_ROOT: worktreePath, UI_MERGE_PREVIEW_BRANCH: branch, UI_MERGE_PREVIEW_ID: previewId, UI_MERGE_PREVIEW_SESSION_ID: sessionId, UI_MERGE_PREVIEW_GENERATION: String(generation), UI_MERGE_STUDIO_ORIGIN: process.env.UI_MERGE_STUDIO_ORIGIN ?? 'http://127.0.0.1:4310' },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let diagnostics = '';
      child.stdout?.on('data', value => diagnostics += value);
      child.stderr?.on('data', value => diagnostics += value);
      child.once('error', error => { diagnostics += error.message; });
      await waitForReady(`${origin}/tickets`, child).catch(error => { throw new Error(`${error instanceof Error ? error.message : String(error)}\n${diagnostics}`); });
      const session: PreviewSession = { previewId, sessionId, generation, branch, protocolVersion: bridgeVersion, url: `${origin}/tickets`, origin, port, worktreePath, status: 'running', failure: null };
      this.active.set(previewId, { session, child });
      child.once('exit', code => { const current = this.active.get(previewId); if (current?.child === child && code !== 0) { current.session.status = 'failed'; current.session.failure = `Preview process exited (${code}).`; } });
      return session;
    } catch (error) {
      await this.repository.removeWorktree(worktreePath).catch(() => undefined);
      throw error;
    }
  }
  async stop(previewId = 'primary') { const current = this.active.get(previewId); if (!current) return; this.active.delete(previewId); await stopTree(current.child); await this.repository.removeWorktree(current.session.worktreePath); }
  async stopAll() { await Promise.all([...this.active.keys()].map(previewId => this.stop(previewId))); }
  session(previewId = 'primary') { return this.active.get(previewId)?.session ?? null; }
  sessions() { return [...this.active.values()].map(value => value.session); }
}
