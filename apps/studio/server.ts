import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import { RepositoryController } from '../../packages/repository-controller/src/repositoryController';
import { PreviewController } from '../../packages/preview-runtime/src/previewController';
import { PreviewOperationManager } from '../../packages/preview-runtime/src/previewOperations';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { isSourceIdentity } from '../../packages/shared/src/sourceIdentity';
import { samePreviewIdentity } from '../../packages/shared/src/bridge';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import type { CandidateGenerationRequest, CandidateGenerationReport } from '../../packages/candidate-generation/src/types';
import type { FeatureSliceArtifact } from '../../packages/source-analysis/src/types';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const fixturePath = process.env.UI_MERGE_FIXTURE_PATH ?? resolve(workspaceRoot, 'fixtures/generated/support-dashboard');
const host = '127.0.0.1';
const port = Number(process.env.UI_MERGE_STUDIO_PORT ?? 4310);
const repository = new RepositoryController(fixturePath);
const previews = new PreviewController(repository, resolve(import.meta.dirname, 'preview.vite.config.ts'));
const previewOperations = new PreviewOperationManager(previews);
const analyzer = new FeatureSliceAnalyzer(fixturePath, workspaceRoot);
let candidateProgress: { status: 'idle' | 'running' | 'succeeded' | 'refused' | 'failed'; stage: string | null; message: string; sliceId?: string; path?: string; verification?: string } = { status:'idle',stage:null,message:'No candidate generation is running.' };
const candidateGenerator = new CandidateGenerator(fixturePath,{artifactRoot:workspaceRoot,onProgress:event=>{candidateProgress={status:'running',...event};}});
const vite = await createViteServer({ configFile: resolve(import.meta.dirname, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'spa' });

async function body(request: import('node:http').IncomingMessage) { const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as unknown; }
function json(response: import('node:http').ServerResponse, status: number, value: unknown) { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(value)); }
function previewRoute(url: string | undefined) { const match = url?.match(/^\/api\/previews\/([a-z][a-z0-9-]*)$/); return match?.[1] ?? null; }
function previewOperationRoute(url: string | undefined) { const match = url?.match(/^\/api\/preview-operations\/([a-f0-9-]+)$/); return match?.[1] ?? null; }
function analysisPreviewRoute(url: string | undefined) { const match = url?.match(/^\/api\/previews\/([a-z][a-z0-9-]*)\/analysis$/); return match?.[1] ?? null; }
function artifactRoute(url: string | undefined) { const match = url?.match(/^\/api\/analysis\/([a-f0-9]{16})$/); return match?.[1] ?? null; }
function generationArtifactRoute(url: string | undefined) { const match = url?.match(/^\/api\/candidate\/reports\/([a-f0-9]{16})$/); return match?.[1] ?? null; }
function candidateRequest(value:unknown):CandidateGenerationRequest { if(!value||typeof value!=='object')throw new Error('A candidate generation request object is required.');const item=value as {expectedBaseCommit?:unknown;candidateBranch?:unknown;artifacts?:unknown;analyzerSchemaVersion?:unknown};if(typeof item.expectedBaseCommit!=='string'||typeof item.candidateBranch!=='string'||!Array.isArray(item.artifacts)||typeof item.analyzerSchemaVersion!=='number')throw new Error('Candidate generation requires expected base, branch, schema version, and slice artifacts.');return{repositoryRoot:fixturePath,baseRef:'main',expectedBaseCommit:item.expectedBaseCommit,candidateBranch:item.candidateBranch,artifacts:item.artifacts as FeatureSliceArtifact[],analyzerSchemaVersion:item.analyzerSchemaVersion};}
const server = createServer(async (request, response) => {
  try {
    if (request.url === '/api/repository' && request.method === 'GET') { const inspected = await repository.inspect(); return json(response, 200, { branches: inspected.branches, clean: inspected.clean, sessions: previews.sessions() }); }
    const analysisPreviewId = analysisPreviewRoute(request.url);
    if (analysisPreviewId && request.method === 'POST') {
      const session = previews.session(analysisPreviewId); if (!session) return json(response, 409, { error: 'The preview session is not running.' });
      const value = await body(request); const selection = value && typeof value === 'object' ? (value as { selection?: unknown }).selection : null;
      if (!isSourceIdentity(selection)) return json(response, 400, { error: 'A valid source-mapped selection is required.' });
      if (!samePreviewIdentity(selection, session)) return json(response, 409, { error: 'The selection belongs to a stale or mismatched preview session.' });
      return json(response, 200, await analyzer.analyze({ baseRef: 'main', branchRef: session.branch, expectedBranchCommit: session.branchCommit, selection }));
    }
    const analysisId = artifactRoute(request.url);
    if (analysisId && request.method === 'GET') { const artifact = await readFile(resolve(workspaceRoot, '.ums', 'analysis', analysisId, 'feature-slice.json')); response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="feature-slice-${analysisId}.json"` }); return response.end(artifact); }
    if(request.url==='/api/candidate/preflight'&&request.method==='POST'){const value=candidateRequest(await body(request));const result=await candidateGenerator.preflight(value);candidateProgress={status:result.plan.status==='ready'?'idle':'refused',stage:'plan',message:result.plan.status==='ready'?'Candidate plan is ready.':'Candidate plan was refused.'};return json(response,200,result);}
    if(request.url==='/api/candidate/generate'&&request.method==='POST'){const value=candidateRequest(await body(request));candidateProgress={status:'running',stage:'validate',message:'Candidate generation is running: validate.'};const report=await candidateGenerator.generate(value);candidateProgress={status:report.status,stage:report.stage,message:report.message};return json(response,200,report);}
    if(request.url==='/api/candidate/status'&&request.method==='GET')return json(response,200,candidateProgress);
    const generationId=generationArtifactRoute(request.url);if(generationId&&request.method==='GET'){const artifact=await readFile(resolve(workspaceRoot,'.ums','generation',generationId,'candidate-report.json'));response.writeHead(200,{'Content-Type':'application/json','Content-Disposition':`attachment; filename="candidate-report-${generationId}.json"`});return response.end(artifact);}
    const previewOperationId = previewOperationRoute(request.url);
    if (previewOperationId && request.method === 'GET') {
      const operation = previewOperations.get(previewOperationId);
      return operation ? json(response, 200, operation) : json(response, 404, { error: 'Preview operation was not found.' });
    }
    if (previewOperationId && request.method === 'DELETE') {
      const operation = previewOperations.cancel(previewOperationId);
      return operation ? json(response, 200, operation) : json(response, 404, { error: 'Preview operation was not found.' });
    }
    const previewId = previewRoute(request.url);
    if (previewId && request.method === 'POST') {
      const value = await body(request);
      if (!value || typeof value !== 'object' || typeof (value as { branch?: unknown }).branch !== 'string') return json(response, 400, { error: 'A branch string is required.' });
      return json(response, 202, previewOperations.launch(previewId, (value as { branch: string }).branch));
    }
    if (previewId && request.method === 'DELETE') { await previews.stop(previewId); return json(response, 200, { stopped: true, previewId }); }
    if (request.url === '/api/preview' && request.method === 'DELETE') { await previews.stopAll(); return json(response, 200, { stopped: true }); }
    vite.middlewares(request, response, (error?: Error) => { if (error) json(response, 500, { error: error.message }); else { response.statusCode = 404; response.end(); } });
  } catch (error) { json(response, 500, { error: error instanceof Error ? error.message : String(error) }); }
});
server.listen(port, host, () => console.log(`UI Merge Studio: http://${host}:${port}`));
async function shutdown() { await previewOperations.stopAll().catch(error => console.error(error)); await vite.close(); server.close(); }
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown); process.once('exit', () => { void previews.stopAll(); });
