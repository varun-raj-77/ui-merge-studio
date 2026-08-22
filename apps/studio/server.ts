import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
import { RepositoryController } from '../../packages/repository-controller/src/repositoryController';
import { discoverRepository } from '../../packages/repository-controller/src/repositoryDiscovery';
import { PreviewController } from '../../packages/preview-runtime/src/previewController';
import { PreviewOperationManager } from '../../packages/preview-runtime/src/previewOperations';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import type { InstrumentedBoundaryMapping } from '../../packages/source-instrumentation/src/instrumentReactSource';
import { isPreviewIdentity } from '../../packages/shared/src/bridge';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { loadRepositoryConfiguration } from './repositoryConfig';
import { LocalPlanAuthority, localPlanErrorStatus, localRepositoryId } from './localPlanAuthority';

const workspaceRoot = resolve(import.meta.dirname, '../..');
const configuration = loadRepositoryConfiguration(workspaceRoot);
const discovery = await discoverRepository(configuration.repositoryPath);
const { repositoryPath, baseRef, previewPath, preferredBranches, candidateBranch, verificationCommands } = { ...configuration, repositoryPath: discovery.repositoryPath };
const host = '127.0.0.1';
const port = Number(process.env.UI_MERGE_STUDIO_PORT ?? 4310);
const repository = new RepositoryController(repositoryPath);
const previews = new PreviewController(repository, resolve(import.meta.dirname, 'preview.vite.config.ts'), previewPath);
const previewOperations = new PreviewOperationManager(previews);
const analyzer = new FeatureSliceAnalyzer(repositoryPath, workspaceRoot);
const planAuthority = new LocalPlanAuthority(repositoryPath, localRepositoryId(repositoryPath), baseRef, candidateBranch, previewId => previews.session(previewId), () => previews.sessions());
let candidateProgress: { status: 'idle' | 'running' | 'succeeded' | 'refused' | 'failed'; stage: string | null; message: string; planIdentity?: string; sliceId?: string; path?: string; verification?: string } = { status:'idle',stage:null,message:'No candidate generation is running.' };
const candidateGenerator = new CandidateGenerator(repositoryPath,{artifactRoot:workspaceRoot,verificationCommands,onProgress:event=>{candidateProgress={status:'running',planIdentity:candidateProgress.planIdentity,...event};}});
const vite = await createViteServer({ configFile: resolve(import.meta.dirname, 'vite.config.ts'), server: { middlewareMode: true }, appType: 'spa' });

async function body(request: import('node:http').IncomingMessage) { const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as unknown; }
function json(response: import('node:http').ServerResponse, status: number, value: unknown) { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(value)); }
function previewRoute(url: string | undefined) { const match = url?.match(/^\/api\/previews\/([a-z][a-z0-9-]*)$/); return match?.[1] ?? null; }
function previewOperationRoute(url: string | undefined) { const match = url?.match(/^\/api\/preview-operations\/([a-f0-9-]+)$/); return match?.[1] ?? null; }
function analysisPreviewRoute(url: string | undefined) { const match = url?.match(/^\/api\/previews\/([a-z][a-z0-9-]*)\/analysis$/); return match?.[1] ?? null; }
function instrumentationPreviewRoute(url: string | undefined) { const match = url?.match(/^\/api\/internal\/previews\/([a-z][a-z0-9-]*)\/instrumentation$/); return match?.[1] ?? null; }
function artifactRoute(url: string | undefined) { const match = url?.match(/^\/api\/analysis\/([a-f0-9]{16})$/); return match?.[1] ?? null; }
function generationArtifactRoute(url: string | undefined) { const match = url?.match(/^\/api\/candidate\/reports\/([a-f0-9]{16})$/); return match?.[1] ?? null; }
const server = createServer(async (request, response) => {
  try {
    const instrumentationPreviewId = instrumentationPreviewRoute(request.url);
    if (instrumentationPreviewId && request.method === 'POST') {
      const token = request.headers.authorization?.match(/^Bearer ([A-Za-z0-9-]+)$/)?.[1] ?? '';
      const value = await body(request);
      const preview = value && typeof value === 'object' ? (value as { preview?: unknown }).preview : null;
      const boundaries = value && typeof value === 'object' ? (value as { boundaries?: unknown }).boundaries : null;
      if (!isPreviewIdentity(preview) || !Array.isArray(boundaries)) return json(response, 400, { error: 'Valid preview instrumentation metadata is required.' });
      const authenticated = previews.authenticateInstrumentation(instrumentationPreviewId, token, preview);
      if (!authenticated) return json(response, 403, { error: 'Preview instrumentation authentication failed.' });
      planAuthority.registerInstrumentedBoundaries(authenticated, boundaries as InstrumentedBoundaryMapping[]);
      return json(response, 200, { registered: boundaries.length });
    }
    if (request.url === '/api/repository' && request.method === 'GET') { const inspected = await repository.inspect(); return json(response, 200, { repositoryId: planAuthority.repositoryId, discovery, foundation: await planAuthority.foundation(), branches: inspected.branches, preferredBranches, candidateBranch, clean: inspected.clean, sessions: previews.sessions() }); }
    const analysisPreviewId = analysisPreviewRoute(request.url);
    if (analysisPreviewId && request.method === 'POST') {
      const session = previews.session(analysisPreviewId); if (!session || session.status !== 'running' || !previews.isAlive(analysisPreviewId)) return json(response, 409, { error: 'The preview session is not running.' });
      const value = await body(request); const selectionReceipt = value && typeof value === 'object' ? (value as { selectionReceipt?: unknown }).selectionReceipt : null;
      if (typeof selectionReceipt !== 'string') return json(response, 400, { error: 'A rendered-selection receipt is required; browser-authored source metadata is not accepted.' });
      const selection = planAuthority.resolveRenderedSelection(session, selectionReceipt);
      const artifact = await analyzer.analyze({ baseRef, branchRef: session.branch, expectedBranchCommit: session.branchCommit, selection });
      return json(response, 200, await planAuthority.register(session, artifact, previewPath));
    }
    const analysisId = artifactRoute(request.url);
    if (analysisId && request.method === 'GET') { const artifact = await readFile(resolve(workspaceRoot, '.ums', 'analysis', analysisId, 'feature-slice.json')); response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="feature-slice-${analysisId}.json"` }); return response.end(artifact); }
    if(request.url==='/api/candidate/preflight'&&request.method==='POST'){const projected=await planAuthority.project(await body(request));const result=await candidateGenerator.preflight(projected.request);candidateProgress={status:result.plan.status==='ready'?'idle':'refused',stage:'plan',message:result.plan.status==='ready'?'Candidate plan is ready.':'Candidate plan was refused.',planIdentity:projected.planIdentity};return json(response,200,result);}
    if(request.url==='/api/candidate/generate'&&request.method==='POST'){const projected=await planAuthority.project(await body(request));candidateProgress={status:'running',stage:'validate',message:'Candidate generation is running: validate.',planIdentity:projected.planIdentity};const report=await candidateGenerator.generate(projected.request);candidateProgress={status:report.status,stage:report.stage,message:report.message,planIdentity:projected.planIdentity};return json(response,200,report);}
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
    if (previewId && request.method === 'GET') {
      const session = previews.session(previewId);
      return json(response, 200, { previewId, alive: previews.isAlive(previewId), session });
    }
    if (previewId && request.method === 'DELETE') { await previewOperations.stop(previewId); return json(response, 200, { stopped: true, previewId }); }
    if (request.url === '/api/preview' && request.method === 'DELETE') { await previewOperations.stopAll(); return json(response, 200, { stopped: true }); }
    vite.middlewares(request, response, (error?: Error) => { if (error) json(response, 500, { error: error.message }); else { response.statusCode = 404; response.end(); } });
  } catch (error) { json(response, localPlanErrorStatus(error), { error: error instanceof Error ? error.message : String(error) }); }
});
server.listen(port, host, () => console.log(`UI Merge Studio: http://${host}:${port}`));
async function shutdown() { await previewOperations.stopAll().catch(error => console.error(error)); await vite.close(); server.close(); }
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown); process.once('exit', () => { void previews.stopAll(); });
