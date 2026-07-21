import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import { RepositoryController } from '../../packages/repository-controller/src/repositoryController';
import { PreviewController } from '../../packages/preview-runtime/src/previewController';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const fixturePath = process.env.UI_MERGE_FIXTURE_PATH ?? resolve(workspaceRoot, 'fixtures/generated/support-dashboard');
const host = '127.0.0.1'; const port = Number(process.env.UI_MERGE_STUDIO_PORT ?? 4310);
const previews = new PreviewController(new RepositoryController(fixturePath), resolve(import.meta.dirname, 'preview.vite.config.ts'));
const vite = await createViteServer({ configFile: resolve(import.meta.dirname, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'spa' });

async function body(request: import('node:http').IncomingMessage) { const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as unknown; }
function json(response: import('node:http').ServerResponse, status: number, value: unknown) { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(value)); }
const server = createServer(async (request, response) => {
  try {
    if (request.url === '/api/repository' && request.method === 'GET') { const repository = await new RepositoryController(fixturePath).inspect(); return json(response, 200, { branches: repository.branches, clean: repository.clean, active: previews.session() }); }
    if (request.url === '/api/preview' && request.method === 'POST') { const value = await body(request); if (!value || typeof value !== 'object' || typeof (value as { branch?: unknown }).branch !== 'string') return json(response, 400, { error: 'A branch string is required.' }); return json(response, 200, await previews.start((value as { branch: string }).branch)); }
    if (request.url === '/api/preview' && request.method === 'DELETE') { await previews.stop(); return json(response, 200, { stopped: true }); }
    vite.middlewares(request, response, (error?: Error) => { if (error) json(response, 500, { error: error.message }); else { response.statusCode = 404; response.end(); } });
  } catch (error) { json(response, 500, { error: error instanceof Error ? error.message : String(error) }); }
});
server.listen(port, host, () => console.log(`UI Merge Studio: http://${host}:${port}`));
async function shutdown() { await previews.stop().catch(error => console.error(error)); await vite.close(); server.close(); }
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown); process.once('exit', () => { void previews.stop(); });
