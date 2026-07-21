import { spawn, type ChildProcess } from 'node:child_process';
import { access } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { RepositoryController } from '../../repository-controller/src/repositoryController';

export interface PreviewSession { branch: string; url: string; origin: string; worktreePath: string }
function command(name: string) { return name; }
export async function allocatePort() { return await new Promise<number>((accept, reject) => { const server = createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const address = server.address(); const port = typeof address === 'object' && address ? address.port : 0; server.close(error => error ? reject(error) : accept(port)); }); }); }
async function runProcess(cwd: string, executable: string, args: string[]) { await new Promise<void>((accept, reject) => { const child = spawn(executable, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' }); let output = ''; child.stdout?.on('data', value => output += value); child.stderr?.on('data', value => output += value); child.once('error', reject); child.once('exit', code => code === 0 ? accept() : reject(new Error(`${executable} failed (${code}): ${output}`))); }); }
async function waitForReady(url: string, child: ChildProcess) { for (let attempt = 0; attempt < 80; attempt++) { if (child.exitCode !== null) throw new Error(`Preview process exited before readiness (${child.exitCode}).`); try { const response = await fetch(url); if (response.ok) return; } catch { /* starting */ } await delay(100); } throw new Error(`Preview did not become ready: ${url}`); }
async function stopTree(child: ChildProcess) { if (!child.pid || child.exitCode !== null) return; if (process.platform === 'win32') await runProcess(process.cwd(), 'taskkill', ['/pid', String(child.pid), '/t', '/f']).catch(() => undefined); else child.kill('SIGTERM'); }

export class PreviewController {
  private current: { session: PreviewSession; child: ChildProcess } | null = null;
  constructor(private repository: RepositoryController, private previewViteConfig: string) {}
  async branches() { return (await this.repository.inspect()).branches; }
  async start(branch: string): Promise<PreviewSession> {
    await this.stop();
    const worktreePath = await this.repository.createWorktree(branch);
    try {
      await access(resolve(worktreePath, 'node_modules')).catch(() => runProcess(worktreePath, command('npm'), ['ci', '--no-audit', '--no-fund']));
      const port = await allocatePort(); const origin = `http://127.0.0.1:${port}`;
      const viteCli = resolve(worktreePath, 'node_modules/vite/bin/vite.js');
      const child = spawn(process.execPath, [viteCli, '--config', this.previewViteConfig, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: worktreePath, env: { ...process.env, UI_MERGE_PREVIEW_ROOT: worktreePath, UI_MERGE_PREVIEW_BRANCH: branch, UI_MERGE_STUDIO_ORIGIN: process.env.UI_MERGE_STUDIO_ORIGIN ?? 'http://127.0.0.1:4310' }, stdio: ['ignore', 'pipe', 'pipe'] });
      let diagnostics = ''; child.stdout?.on('data', value => diagnostics += value); child.stderr?.on('data', value => diagnostics += value);
      child.once('error', error => { diagnostics += error.message; });
      await waitForReady(`${origin}/tickets`, child).catch(error => { throw new Error(`${error instanceof Error ? error.message : String(error)}\n${diagnostics}`); });
      const session = { branch, url: `${origin}/tickets`, origin, worktreePath }; this.current = { session, child }; return session;
    } catch (error) { await this.repository.removeWorktree(worktreePath).catch(() => undefined); throw error; }
  }
  async stop() { if (!this.current) return; const current = this.current; this.current = null; await stopTree(current.child); await this.repository.removeWorktree(current.session.worktreePath); }
  session() { return this.current?.session ?? null; }
}
