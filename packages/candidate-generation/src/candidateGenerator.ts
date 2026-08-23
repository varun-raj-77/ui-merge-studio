import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { buildSourceIndex, type ImportBinding, type ModuleRecord } from '../../source-analysis/src/sourceIndex';
import { GitSourceRepository, validateRepositoryPath } from '../../source-analysis/src/gitModel';
import { featureSliceVersion, type FeatureSliceArtifact, type ImportRequirement } from '../../source-analysis/src/types';
import { isSourceIdentity } from '../../shared/src/sourceIdentity';
import { configureExportedConst, findDeclarationRange, insertDeclaration, parseModule, projectJsxRegion, reconcileExport, reconcileImport, reconstructAddedModule, reconstructTestModule, replaceDeclaration } from './astTransform';
import { candidateGenerationVersion, type AppliedOperation, type CandidateConflict, type CandidateGenerationReport, type CandidateGenerationRequest, type CandidateOperation, type CandidatePlan, type CandidatePreflight, type CandidateUnresolved, type ExcludedSourceChange, type VerificationResult } from './types';

const execFileAsync = promisify(execFile);
const textHash = (value: string | Buffer) => createHash('sha256').update((Buffer.isBuffer(value)?value.toString('utf8'):value).replace(/\r\n/g,'\n')).digest('hex');
const blobHash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const sourceIndexCache = new Map<string, ReturnType<typeof buildSourceIndex>>();
function cachedSourceIndex(repository: GitSourceRepository, repositoryRoot: string, commit: string) {
  const key = `${repositoryRoot}:${commit}`;
  const existing = sourceIndexCache.get(key);
  if (existing) return existing;
  const created = buildSourceIndex(repository, commit);
  sourceIndexCache.set(key, created);
  return created;
}
const textPath = (path:string) => /\.(?:[cm]?[jt]sx?|css|json|html|md|yml|yaml)$/.test(path);
const formattedText = (value:string|Buffer) => `${(Buffer.isBuffer(value)?value.toString('utf8'):value).replace(/\r\n/g,'\n').trimEnd()}\n`;
const stable = <T>(items: T[], key: (item: T) => string) => [...items].sort((a,b) => key(a).localeCompare(key(b)));
function operationId(value: Omit<CandidateOperation,'id'|'sliceIds'|'evidenceEdgeIds'>) { return `op:${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,16)}`; }
function branchValid(value: string) { return /^[a-z][a-z0-9-]{0,62}$/.test(value) && value !== 'main'; }
function importRequirement(binding: ImportBinding, reason: string): ImportRequirement { return { source: binding.source, local: binding.local, imported: binding.imported, kind: binding.kind, reason }; }
function importKey(item: Pick<ImportRequirement,'source'|'local'|'imported'|'kind'>) { return `${item.source}:${item.local}:${item.imported}:${item.kind}`; }
function projectionKey(item: NonNullable<CandidateOperation['jsxProjection']>) { return JSON.stringify({mode:item.mode,renderedBoundary:item.renderedBoundary,integrationBoundary:item.integrationBoundary,sourceNode:{kind:item.sourceNode.kind,name:item.sourceNode.name,structuralHash:item.sourceNode.structuralHash},baseParent:{kind:item.baseParent.kind,name:item.baseParent.name,structuralHash:item.baseParent.structuralHash},baseTarget:{structuralHash:item.baseTarget.structuralHash},anchor:item.anchor,requiredBindings:item.requiredBindings,excludedSourceSiblingCount:item.excludedSourceSiblingCount}); }
function operationOrder(operation: CandidateOperation) { const rank: Record<CandidateOperation['kind'],number> = { 'add-file':0,'add-style-file':0,'add-asset':0,'replace-style-file':0,'reconstruct-source-file':0,'insert-import-specifier':1,'insert-export':2,'insert-declaration':3,'replace-declaration':3,'replace-jsx-region':3,'reconstruct-test-file':4,'configure-exported-const':5 }; return `${operation.target.path}:${rank[operation.kind]}:${operation.target.symbol ?? ''}:${operation.id}`; }
const legacyPlanIdentity = 'legacy-v1-no-canonical-plan';
type CandidateProvenance = CandidateGenerationReport['repository']['provenance'];
function operationOwnership(kind: CandidateOperation['kind']): CandidateOperation['ownership'] {
  if (kind === 'add-asset') return 'exclusive-atomic-dependency';
  if (kind === 'replace-jsx-region') return 'region-owned-integration';
  if (kind === 'add-file' || kind === 'add-style-file' || kind === 'replace-style-file') return 'conservative-file-transfer';
  return 'declaration-owned-source';
}

export interface VerificationCommand { name: string; executable: string; args: string[] }
export interface CandidateProgressEvent { stage: string; message: string; sliceId?: string; path?: string; verification?: string }
export interface CandidateGeneratorOptions { artifactRoot?: string; verificationCommands?: VerificationCommand[]; onStage?: (stage: CandidateGenerationReport['stage']) => void; onProgress?: (event: CandidateProgressEvent) => void; onWorktreePrepared?: (worktreePath: string) => Promise<void> | void; onVerifiedWorkspace?: (worktreePath: string) => Promise<void> | void }
class CandidateRefusal extends Error { constructor(message: string) { super(message); this.name = 'CandidateRefusal'; } }
class VerificationFailure extends Error { constructor(message: string) { super(message); this.name = 'VerificationFailure'; } }

export class CandidateGenerator {
  private repository: GitSourceRepository;
  private artifactRoot: string;
  private verificationCommands: VerificationCommand[] | null;
  constructor(readonly repositoryRoot: string, private options: CandidateGeneratorOptions = {}) {
    this.repositoryRoot = resolve(repositoryRoot); this.repository = new GitSourceRepository(this.repositoryRoot); this.artifactRoot = resolve(options.artifactRoot ?? this.repositoryRoot);
    this.verificationCommands = options.verificationCommands ?? null;
  }

  async preflight(request: CandidateGenerationRequest): Promise<CandidatePreflight> {
    const immutable = JSON.parse(JSON.stringify(request)) as CandidateGenerationRequest;
    const generationId = this.generationId(immutable); const unresolved = await this.validate(immutable); const operations: CandidateOperation[] = [];
    if (!unresolved.length) await this.buildOperations(immutable, operations, unresolved);
    if (!unresolved.length) this.validateGenerationProfile(immutable, operations, unresolved);
    const normalized = this.normalizeOperations(operations); const conflicts = this.detectConflicts(normalized, immutable.artifacts);
    const plan: CandidatePlan = { version:candidateGenerationVersion, repository:{baseCommit:immutable.expectedBaseCommit,candidateBranch:immutable.candidateBranch,repositoryId:immutable.repositoryId,foundationRef:immutable.baseRef,foundationCommit:immutable.expectedBaseCommit,commonBaseRef:immutable.commonBaseRef??immutable.baseRef,commonBaseCommit:immutable.expectedCommonBaseCommit??immutable.expectedBaseCommit,generationProfile:immutable.generationProfile??'phase0'}, sliceIds:stable(immutable.artifacts.map(item=>item.analysisId), value=>value), operations:normalized, conflicts, unresolved:stable(unresolved,item=>`${item.path}:${item.reason}`), status: conflicts.length || unresolved.length ? 'refused' : 'ready' };
    return { generationId, plan, integrationPlan: immutable.integrationPlan };
  }

  async generate(request: CandidateGenerationRequest): Promise<CandidateGenerationReport> {
    const immutable = JSON.parse(JSON.stringify(request)) as CandidateGenerationRequest; this.options.onStage?.('validate'); this.options.onProgress?.({stage:'validate',message:'Validating immutable feature evidence.'});
    const preflight = await this.preflight(immutable); const report = this.emptyReport(preflight, immutable); report.stage='plan'; this.options.onStage?.('plan');
    this.options.onProgress?.({stage:'plan',message:'Building and checking the deterministic integration plan.'});
    if (preflight.plan.status === 'refused') { report.status='refused'; report.message='Candidate generation was refused before mutation because preflight did not produce a safe plan.'; await this.persist(report); return report; }
    let worktreePath = ''; let worktreeRemoved = false; let branchBefore: string | null = null;
    try {
      branchBefore = await this.tryResolve(immutable.candidateBranch);
      this.options.onProgress?.({stage:'preparing-workspace',message:'Preparing an isolated candidate workspace.'});
      worktreePath = await mkdtemp(join(tmpdir(),'ui-merge-studio-candidate-')); report.repository.worktreePath=worktreePath;
      await this.git(['worktree','add','--detach',worktreePath,immutable.expectedBaseCommit]); await this.options.onWorktreePrepared?.(worktreePath); report.stage='transform'; this.options.onStage?.('transform');
      await this.applyPlan(preflight.plan, worktreePath, report.appliedOperations);
      this.options.onProgress?.({stage:'checking-changed-files',message:'Checking that the changed-file set exactly matches the plan.'});
      const plannedPaths = new Set(preflight.plan.operations.map(item=>item.target.path)); const tracked=(await this.git(['diff','--name-only'],worktreePath)).split(/\r?\n/).filter(Boolean);const untracked=(await this.git(['ls-files','--others','--exclude-standard'],worktreePath)).split(/\r?\n/).filter(Boolean);const actualPaths = new Set([...tracked,...untracked]);
      if ([...actualPaths].some(path=>!plannedPaths.has(path)) || [...plannedPaths].some(path=>!actualPaths.has(path))) throw new CandidateRefusal(`Candidate changed-file set does not match the deterministic plan. Planned: ${[...plannedPaths].sort().join(', ')}; actual: ${[...actualPaths].sort().join(', ')}.`);
      await this.git(['add','-A'],worktreePath); try{await this.git(['diff','--cached','--check'],worktreePath);}catch(error){const value=error as Error&{stdout?:string;stderr?:string};throw new CandidateRefusal(`Candidate whitespace check failed: ${(value.stdout??value.stderr??value.message).trim()}`);}
      report.stage='verify'; this.options.onStage?.('verify'); await this.verify(worktreePath, report.verification, preflight.plan);
      await this.options.onVerifiedWorkspace?.(worktreePath);
      this.options.onProgress?.({stage:'writing-tree',message:'Writing and comparing the verified candidate tree.'});
      const tree = await this.git(['write-tree'],worktreePath); report.repository.candidateTree=tree;
      const currentCandidate = await this.tryResolve(immutable.candidateBranch);
      if (currentCandidate !== branchBefore) throw new CandidateRefusal(`Candidate branch ${immutable.candidateBranch} changed during generation.`);
      if (currentCandidate) {
        const existingTree = await this.git(['rev-parse',`${currentCandidate}^{tree}`]);
        if (existingTree !== tree) throw new CandidateRefusal(`Candidate branch ${immutable.candidateBranch} already exists at ${currentCandidate} with a different tree (${existingTree} instead of ${tree}).`);
        const parents = (await this.git(['rev-list','--parents','-n','1',currentCandidate])).split(/\s+/);
        if (parents.length !== 2 || parents[1] !== immutable.expectedBaseCommit) throw new CandidateRefusal(`Candidate branch ${immutable.candidateBranch} has the expected tree but not exactly the expected foundation parent ${immutable.expectedBaseCommit}.`);
        const existingProvenance = await this.readCandidateProvenance(currentCandidate);
        if (!existingProvenance || JSON.stringify(existingProvenance) !== JSON.stringify(report.repository.provenance)) throw new CandidateRefusal(`Candidate branch ${immutable.candidateBranch} has the expected tree and parent but its UI Merge plan/generation provenance does not match this request.`);
        report.repository.candidateCommit=currentCandidate; report.repository.idempotent=true; report.status='succeeded'; report.stage='complete'; report.message='Equivalent candidate already exists; generation is idempotent and created no divergent commit.';
      } else {
        report.stage='commit'; this.options.onStage?.('commit');
        this.options.onProgress?.({stage:'commit',message:'Registering the verified candidate commit atomically.'});
        const environment = { ...process.env, GIT_AUTHOR_NAME:'UI Merge Studio', GIT_AUTHOR_EMAIL:'candidate@ui-merge-studio.invalid', GIT_COMMITTER_NAME:'UI Merge Studio', GIT_COMMITTER_EMAIL:'candidate@ui-merge-studio.invalid', GIT_AUTHOR_DATE:'2000-01-01T00:00:00Z', GIT_COMMITTER_DATE:'2000-01-01T00:00:00Z' };
        await this.git(['commit','-m',this.candidateCommitMessage(report.repository.provenance)],worktreePath,environment); const commit = await this.git(['rev-parse','HEAD'],worktreePath);
        if (await this.tryResolve(immutable.candidateBranch)) throw new CandidateRefusal(`Candidate branch ${immutable.candidateBranch} appeared before registration.`);
        await this.git(['branch',immutable.candidateBranch,commit]); report.repository.candidateCommit=commit; report.repository.idempotent=false; report.status='succeeded'; report.stage='complete'; report.message='Candidate transformations and verification passed; the candidate branch was registered atomically.';
      }
      this.options.onStage?.('complete'); this.options.onProgress?.({stage:'complete',message:'The combined branch is verified and ready.'});
    } catch (error) {
      report.status = error instanceof CandidateRefusal ? 'refused' : 'failed'; report.message = error instanceof Error ? error.message : String(error);
    } finally {
      this.options.onProgress?.({stage:'cleanup',message:'Removing temporary worktrees and confirming process cleanup.'});
      if (worktreePath) { try { await this.removeWorktree(worktreePath); worktreeRemoved=true; } catch (error) { report.message += ` Cleanup failed: ${error instanceof Error ? error.message : String(error)}`; report.status='failed'; } }
      report.cleanup={worktreeRemoved:!worktreePath||worktreeRemoved,processesStopped:true,detail:!worktreePath||worktreeRemoved?'Temporary candidate worktree removed; verification processes exited.':'Temporary worktree cleanup failed.'}; delete report.repository.worktreePath;
      await this.persist(report);
    }
    return report;
  }

  private async validate(request: CandidateGenerationRequest) {
    const unresolved: CandidateUnresolved[]=[]; const reject=(reason:string,path='<request>',sliceId:string|null=null)=>unresolved.push({path,sliceId,reason,manualResolution:'Refresh both resolved analyses against the same clean base and retry with a safe candidate branch name.'});
    const commonBaseRef=request.commonBaseRef??request.baseRef; const expectedCommonBaseCommit=request.expectedCommonBaseCommit??request.expectedBaseCommit;
    if (resolve(request.repositoryRoot)!==this.repositoryRoot) reject('The immutable request repository does not match the configured generator repository.');
    if (!branchValid(request.candidateBranch)) reject(`Invalid candidate branch name: ${request.candidateBranch}.`);
    if (request.analyzerSchemaVersion!==featureSliceVersion) reject(`Unsupported analyzer schema version ${request.analyzerSchemaVersion}.`);
    if (request.generationProfile && request.generationProfile!=='phase0' && request.generationProfile!=='external-react-vite') reject(`Unsupported candidate-generation profile ${String(request.generationProfile)}.`);
    if (request.artifacts.length < 1 || request.artifacts.length > 2) reject('One or two resolved feature-slice artifacts are required.');
    let base=''; try { base=await this.repository.resolveRef(request.baseRef); } catch(error){ reject(`Base ref resolution failed: ${error instanceof Error?error.message:String(error)}`); }
    if (base && base!==request.expectedBaseCommit) reject(`Stale base commit: expected ${request.expectedBaseCommit}, current ${base}.`);
    let commonBase=''; try { commonBase=await this.repository.resolveRef(commonBaseRef); } catch(error){ reject(`Common base ref resolution failed: ${error instanceof Error?error.message:String(error)}`); }
    if (commonBase && commonBase!==expectedCommonBaseCommit) reject(`Stale common base commit: expected ${expectedCommonBaseCommit}, current ${commonBase}.`);
    const foundationChangedPaths = new Set<string>();
    if (base && commonBase && base !== commonBase) {
      try { for (const change of await this.repository.changedFiles(commonBase, base)) foundationChangedPaths.add(change.path); }
      catch (error) { reject(`Foundation change inspection failed: ${error instanceof Error?error.message:String(error)}`); }
    }
    try{if((await this.repository.git(['status','--porcelain']))!=='')reject('The source repository working tree is dirty; candidate generation is refused.');}catch(error){reject(`Repository cleanliness inspection failed: ${error instanceof Error?error.message:String(error)}`);}
    const seen=new Set<string>();
    for (const artifact of request.artifacts) {
      const slice=artifact.slice; const id=artifact.analysisId;
      if (seen.has(id)) reject(`Duplicate slice identity ${id}.`,'<slice>',id); seen.add(id);
      if (textHash(JSON.stringify(slice)).slice(0,16)!==id) reject(`Slice ${id} content does not match its analysis ID.`,'<slice>',id);
      if (slice.status!=='resolved') reject(`Slice ${id} is ${slice.status}; only resolved slices can generate a candidate.`,'<slice>',id);
      if (slice.version!==featureSliceVersion || slice.version!==request.analyzerSchemaVersion) reject(`Slice ${id} uses unsupported schema version ${slice.version}.`,'<slice>',id);
      if (slice.repository.baseRef!==commonBaseRef || slice.repository.mergeBaseCommit!==expectedCommonBaseCommit) reject(`Slice ${id} does not use the expected common base commit.`,'<slice>',id);
      if (!isSourceIdentity(slice.selection) || slice.selection.branch!==slice.repository.branchRef) reject(`Slice ${id} has an invalid or mismatched source selection.`,'<slice>',id);
      try { const current=await this.repository.resolveRef(slice.repository.branchRef); if(current!==slice.repository.branchCommit) reject(`Feature branch ${slice.repository.branchRef} moved from ${slice.repository.branchCommit} to ${current}.`,'<slice>',id); const merge=await this.repository.mergeBase(request.baseRef,slice.repository.branchRef); if(merge!==expectedCommonBaseCommit) reject(`Slice ${id} no longer shares the expected merge base with the selected foundation.`,'<slice>',id); } catch(error){ reject(`Feature branch validation failed for ${id}: ${error instanceof Error?error.message:String(error)}`,'<slice>',id); }
      const evidence=new Set(slice.evidence.map(item=>item.id)); for(const change of slice.includedChanges) if(!change.evidenceEdgeIds.length||change.evidenceEdgeIds.some(edge=>!evidence.has(edge))) reject(`Included change ${change.branchChangeId} has missing evidence.` ,change.path,id);
      for (const edge of slice.evidence.filter(item => item.type === 'uses-type' && item.baseState === 'existing')) {
        const contractPath = edge.to.split('#')[0];
        if (foundationChangedPaths.has(contractPath)) reject(`The selected foundation changes shared contract ${edge.to} required by slice ${id}.` ,contractPath,id);
      }
      if (slice.unresolvedDependencies.length) reject(`Resolved slice ${id} unexpectedly contains unresolved dependencies.`,'<slice>',id);
      try { validateRepositoryPath(slice.selection.repositoryRelativePath); const index=await cachedSourceIndex(this.repository,this.repositoryRoot,slice.repository.branchCommit); const selected=index.moduleByPath.get(slice.selection.repositoryRelativePath)?.declarations.find(item=>item.name===slice.selection.componentName&&item.startLine===slice.selection.line); if(!selected) reject(`Slice ${id} source selection is no longer valid at its recorded location.`,slice.selection.repositoryRelativePath,id); } catch(error){ reject(`Slice ${id} path validation failed: ${error instanceof Error?error.message:String(error)}`,'<slice>',id); }
    }
    const branchRefs=new Set(request.artifacts.map(item=>item.slice.repository.branchRef)); if(branchRefs.size!==request.artifacts.length) reject('Duplicate or conflicting source branch identities were supplied.');
    for (const configuration of request.sourceConfigurations ?? []) {
      const artifact = request.artifacts.find(item => item.analysisId === configuration.sliceId);
      if (!artifact) { reject(`Configuration ${configuration.path} does not reference a selected slice.`, configuration.path, configuration.sliceId); continue; }
      try { validateRepositoryPath(configuration.path); } catch (error) { reject(error instanceof Error ? error.message : String(error), configuration.path, configuration.sliceId); continue; }
      const change = artifact.slice.includedChanges.find(item => item.path === configuration.path);
      const file = artifact.slice.changedFiles.find(item => item.path === configuration.path);
      if (!change || file?.status !== 'added') reject('Select the parent feature before generating this configuration. Configured source must be an added file represented by the selected slice.', configuration.path, configuration.sliceId);
      if (!configuration.declaration) reject('Configured source declaration is required.', configuration.path, configuration.sliceId);
      if (configuration.expectedSourceContentHash) {
        try {
          const source = await this.gitBlob(artifact.slice.repository.branchCommit, configuration.path);
          if (textHash(source) !== configuration.expectedSourceContentHash) {
            reject(
              'The configurable feature source changed after it was inspected. Re-analyze the selection before generating.',
              configuration.path,
              configuration.sliceId
            );
          }
        } catch (error) {
          reject(`Configured source inspection failed: ${error instanceof Error ? error.message : String(error)}`, configuration.path, configuration.sliceId);
        }
      }
    }
    return unresolved;
  }

  private validateGenerationProfile(request:CandidateGenerationRequest,operations:CandidateOperation[],unresolved:CandidateUnresolved[]) {
    if ((request.generationProfile??'phase0')!=='external-react-vite') return;
    const reject=(path:string,sliceId:string,reason:string)=>this.unresolved(unresolved,path,sliceId,reason);
    if(request.artifacts.length!==1){
      unresolved.push({path:'<request>',sliceId:null,reason:'The bounded external React/Vite profile accepts exactly one rendered feature slice.',manualResolution:'Generate one visually selected external feature at a time.'});
      return;
    }
    const artifact=request.artifacts[0]; const slice=artifact.slice;
    if(!request.integrationPlan||request.integrationPlan.version!==2||!/^plan-v2-[a-f0-9]{8}$/.test(request.integrationPlan.identity))reject('<request>',artifact.analysisId,'The external React/Vite profile requires the server-owned canonical Integration Plan V2 identity.');
    if(request.sourceConfigurations?.length)reject('<request>',artifact.analysisId,'Manual source configuration is outside the external React/Vite generation boundary.');
    if(slice.selection.confidence!=='exact'||!slice.selection.componentName||!slice.selection.repositoryRelativePath.startsWith('src/')||!slice.selection.repositoryRelativePath.endsWith('.tsx'))reject(slice.selection.repositoryRelativePath,artifact.analysisId,'The external React/Vite profile requires an exact named TSX component selected through trusted rendered instrumentation.');
    for(const change of slice.excludedChanges.filter(item=>item.proof!=='proven'))reject(change.path,artifact.analysisId,`Excluded change ${change.branchChangeId} is not proven unrelated.`);
    const allowed=new Set<CandidateOperation['kind']>(['add-asset','reconstruct-source-file','insert-import-specifier','replace-jsx-region']);
    for(const operation of operations){
      if(operation.kind==='add-style-file'||operation.kind==='replace-style-file')reject(operation.target.path,artifact.analysisId,'Whole global stylesheet transfer is refused by the external React/Vite profile because CSS rule ownership is not implemented.');
      if(!allowed.has(operation.kind))reject(operation.target.path,artifact.analysisId,`Operation ${operation.kind} is outside the bounded external React/Vite transform grammar.`);
      if(!operation.target.path.startsWith('src/'))reject(operation.target.path,artifact.analysisId,'External candidate writes are restricted to the analyzed src/ dependency boundary.');
      if(operation.kind==='reconstruct-source-file'&&operation.ownership!=='declaration-owned-source')reject(operation.target.path,artifact.analysisId,'External added source must be reconstructed from declaration-owned source evidence.');
      if(operation.kind==='add-asset'&&operation.ownership!=='exclusive-atomic-dependency')reject(operation.target.path,artifact.analysisId,'External assets require exclusive atomic dependency evidence.');
      if(operation.kind==='replace-jsx-region'&&operation.jsxProjection?.excludedSourceSiblingCount)reject(operation.target.path,artifact.analysisId,`Unrelated source changes modify the same JSX integration parent as ${operation.jsxProjection.renderedBoundary.symbol}; selective projection from that shared region is refused.`);
    }
    const integrations=operations.filter(item=>item.kind==='replace-jsx-region');
    if(integrations.length!==1)reject(slice.selection.repositoryRelativePath,artifact.analysisId,`The external React/Vite profile requires exactly one structurally anchored JSX integration operation; planned ${integrations.length}.`);
  }

  private async buildOperations(request: CandidateGenerationRequest, operations: CandidateOperation[], unresolved: CandidateUnresolved[]) {
    const baseIndex=await cachedSourceIndex(this.repository,this.repositoryRoot,request.expectedBaseCommit);
    const external=(request.generationProfile??'phase0')==='external-react-vite';
    for(const artifact of stable(request.artifacts,item=>item.analysisId)) {
      const slice=artifact.slice; const sourceIndex=await cachedSourceIndex(this.repository,this.repositoryRoot,slice.repository.branchCommit); const changed=new Map(slice.changedFiles.map(item=>[item.path,item])); const includedByPath=new Map<string,typeof slice.includedChanges>();
      for(const change of slice.includedChanges){const list=includedByPath.get(change.path)??[];list.push(change);includedByPath.set(change.path,list);} const processed=new Set<string>();
      for(const testSlice of slice.testFileSlices) {
        if(!includedByPath.has(testSlice.path))continue; processed.add(testSlice.path); const file=changed.get(testSlice.path); if(!file){this.unresolved(unresolved,testSlice.path,artifact.analysisId,'Included test file is missing from the analyzed Git change set.');continue;} if(testSlice.mode!=='test-units'){this.unresolved(unresolved,testSlice.path,artifact.analysisId,`Test slicing mode ${testSlice.mode} cannot be reconstructed safely.`);continue;} if(file.status!=='added'){this.unresolved(unresolved,testSlice.path,artifact.analysisId,'Modified pre-existing test files are not yet supported by deterministic test reconstruction.');continue;}
        const source=await this.gitBlobText(slice.repository.branchCommit,testSlice.path); const module=sourceIndex.moduleByPath.get(testSlice.path); if(!module){this.unresolved(unresolved,testSlice.path,artifact.analysisId,'Test module is absent from the source AST index.');continue;} const output=reconstructTestModule(source,testSlice.path,module,testSlice);
        operations.push(this.operation('reconstruct-test-file',artifact, testSlice.path,null,null,source,textHash(output),testSlice.evidenceEdgeIds,'Reconstruct the added test module from included AST test units, support declarations, and required import specifiers.',undefined,testSlice));
      }
      for(const [path,changes] of stable([...includedByPath.entries()],item=>item[0])) {
        if(processed.has(path))continue; processed.add(path); const file=changed.get(path); if(!file){this.unresolved(unresolved,path,artifact.analysisId,'Included path is missing from the analyzed Git change set.');continue;} try{validateRepositoryPath(path);}catch(error){this.unresolved(unresolved,path,artifact.analysisId,error instanceof Error?error.message:String(error));continue;}
        const exclusions=slice.excludedChanges.filter(item=>item.path===path); const source=await this.gitBlob(slice.repository.branchCommit,path);
        if(file.status==='added') {
          const reconstructSource=external&&/\.[jt]sx?$/.test(path);
          if(exclusions.length&&!/\.[jt]sx?$/.test(path)){this.unresolved(unresolved,path,artifact.analysisId,'An added atomic file contains excluded source changes; selective semantic reconstruction is unavailable.');continue;}
          if(exclusions.length||reconstructSource){
            const module=sourceIndex.moduleByPath.get(path);const names=changes.map(item=>item.symbol?.name).filter((value):value is string=>Boolean(value)).sort();
            if(!module||!names.length){this.unresolved(unresolved,path,artifact.analysisId,'An added source module lacks reconstructable included declaration evidence.');continue;}
            const includedPaths=new Set(slice.includedChanges.map(item=>item.path));
            const allowedBareImportSources=external?module.imports.filter(item=>item.kind==='style'&&item.resolvedPath&&includedPaths.has(item.resolvedPath)).map(item=>item.source).sort():undefined;
            let output='';
            try{output=reconstructAddedModule(source.toString('utf8'),path,module,names,{allowedBareImportSources,refuseUnsupportedTopLevel:external});}
            catch(error){this.unresolved(unresolved,path,artifact.analysisId,`Added source cannot be reconstructed from declaration-owned content: ${error instanceof Error?error.message:String(error)}`);continue;}
            const operation=this.operation('reconstruct-source-file',artifact,path,null,null,source,textHash(output),changes.flatMap(item=>item.evidenceEdgeIds),'Reconstruct declaration-owned added source from only reachable indexed declarations and structurally required imports.');operation.declarationNames=names;if(allowedBareImportSources?.length)operation.allowedBareImportSources=allowedBareImportSources;operations.push(operation);continue;
          }
          const kind=path.endsWith('.css')?'add-style-file':changes.some(item=>item.category==='asset')?'add-asset':'add-file';
          if(external&&kind==='add-asset'){
            if(await this.pathExistsAtCommit(request.expectedBaseCommit,path)){this.unresolved(unresolved,path,artifact.analysisId,'Atomic asset dependency already exists at the candidate foundation and is not an added exclusive dependency.');continue;}
            const ownership=this.exclusiveAtomicAssetDependency(artifact,sourceIndex,path);
            if(!ownership.ok){this.unresolved(unresolved,path,artifact.analysisId,ownership.reason);continue;}
          }
          const output=textPath(path)?formattedText(source):source;
          const detail=kind==='add-asset'?'Add the unchanged atomic asset blob only as an exclusive static dependency; no semantic ownership of its bytes is claimed.':kind==='add-style-file'?'Plan a conservative whole-file stylesheet transfer; profiles that cannot prove CSS rule ownership must refuse it.':'Add the conservatively classified file blob with deterministic text normalization.';
          operations.push(this.operation(kind,artifact,path,null,null,source,kind==='add-asset'?blobHash(output):textHash(output),changes.flatMap(item=>item.evidenceEdgeIds),detail)); continue;
        }
        if(path.endsWith('.css')) {
          if(file.status!=='modified'||exclusions.length){this.unresolved(unresolved,path,artifact.analysisId,'Modified stylesheet has excluded or unsupported content; CSS rule-level reconstruction is unavailable.');continue;}
          const base=await this.gitBlob(request.expectedBaseCommit,path); operations.push(this.operation('replace-style-file',artifact,path,null,null,source,textHash(formattedText(source)),changes.flatMap(item=>item.evidenceEdgeIds),'Apply the legacy Phase 0 conservative complete-file stylesheet operation and normalize EOF formatting.',undefined,undefined,textHash(base))); continue;
        }
        if(!/\.[jt]sx?$/.test(path)||file.status!=='modified'){this.unresolved(unresolved,path,artifact.analysisId,`Changed file status/type ${file.status} is unsupported for reconstruction.`);continue;}
        const sourceText=source.toString('utf8'); const baseText=(await this.gitBlob(request.expectedBaseCommit,path)).toString('utf8'); const sourceModule=sourceIndex.moduleByPath.get(path); const baseModule=baseIndex.moduleByPath.get(path); if(!sourceModule||!baseModule){this.unresolved(unresolved,path,artifact.analysisId,'Modified TypeScript module is missing from the base/source AST index.');continue;}
        const selectedNames=new Set(changes.map(item=>item.symbol?.name).filter((value):value is string=>Boolean(value))); const dependencies=new Set<string>();
        for (const change of changes) if (change.symbol) {
          const record=sourceModule.declarations.find(item=>item.name===change.symbol!.name);
          if(!record){this.unresolved(unresolved,path,artifact.analysisId,`Source declaration ${change.symbol.name} is missing.`);continue;}
          const sourceRange=findDeclarationRange(sourceText,path,record.name);
          if(!sourceRange){this.unresolved(unresolved,path,artifact.analysisId,`Source declaration ${change.symbol.name} has no reconstructable statement boundary.`);continue;}
          const sourceSnippet=sourceText.slice(sourceRange.start,sourceRange.end); const baseRecord=baseModule.declarations.find(item=>item.name===record.name); const baseRange=baseRecord?findDeclarationRange(baseText,path,record.name):null; const baseSnippet=baseRange?baseText.slice(baseRange.start,baseRange.end):null;
          if (baseRecord && baseRange && baseSnippet && change.category === 'integration') {
            const integrationKey=`${path}#${record.name}`;
            const integrationEdge=artifact.slice.evidence.find(edge=>edge.type==='integrated-by'&&edge.to===integrationKey&&change.evidenceEdgeIds.includes(edge.id));
            if (!integrationEdge) { this.unresolved(unresolved,path,artifact.analysisId,`Integration declaration ${record.name} lacks a unique integrated-by edge identifying the selected JSX boundary.`); continue; }
            const separator=integrationEdge.from.lastIndexOf('#'); const renderedPath=separator>=0?integrationEdge.from.slice(0,separator):''; const renderedSymbol=separator>=0?integrationEdge.from.slice(separator+1):'';
            if (!renderedPath || !renderedSymbol) { this.unresolved(unresolved,path,artifact.analysisId,`Integration evidence ${integrationEdge.id} has an invalid rendered boundary identity.`); continue; }
            try {
              const projection=projectJsxRegion(baseText,sourceText,path,record.name,{path:renderedPath,symbol:renderedSymbol});
              const projectedRange=findDeclarationRange(projection.code,path,record.name);
              if(!projectedRange)throw new Error(`Projected declaration ${record.name} disappeared after JSX transformation.`);
              projection.evidence.requiredBindings.forEach(item=>dependencies.add(item));
              const operation=this.operation('replace-jsx-region',artifact,path,record.name,projection.evidence.sourceNode.region,projection.sourceSnippet,textHash(projection.code.slice(projectedRange.start,projectedRange.end)),change.evidenceEdgeIds,`Project ${projection.evidence.mode} for selected ${renderedSymbol} inside ${record.name}; preserve the base declaration and exclude ${projection.evidence.excludedSourceSiblingCount} unmatched source sibling(s).`,undefined,undefined,textHash(baseText),textHash(baseSnippet),projection.evidence.baseParent.region);
              operation.jsxProjection=projection.evidence; operations.push(operation); continue;
            } catch (projectionError) {
              const projectionReason=projectionError instanceof Error?projectionError.message:String(projectionError);
              this.unresolved(unresolved,path,artifact.analysisId,`Selected JSX region ${renderedSymbol} cannot be projected safely: ${projectionReason} Full declaration replacement fallback is forbidden for region-owned integration.`); continue;
            }
          }
          [...record.dependencies,...record.jsxReferences].forEach(item=>dependencies.add(item));
          const kind=baseRecord?'replace-declaration':'insert-declaration';
          operations.push(this.operation(kind,artifact,path,record.name,{startLine:sourceRange.startLine,endLine:sourceRange.endLine},sourceSnippet,textHash(sourceSnippet),change.evidenceEdgeIds,`${baseRecord?'Replace':'Insert'} declaration ${record.name} by AST identity from the validated source branch.`,undefined,undefined,textHash(baseText),baseSnippet?textHash(baseSnippet):null,baseRange?{startLine:baseRange.startLine,endLine:baseRange.endLine}:null));
        }
        const moduleLevel=changes.some(item=>!item.symbol); const baseBindings=new Set(baseModule.imports.map(importKey));
        for(const binding of sourceModule.imports) if(!baseBindings.has(importKey(binding))&&(moduleLevel||dependencies.has(binding.local))) { const requirement=importRequirement(binding,'Required by a selected reconstructed declaration or module integration operation.'); operations.push(this.operation('insert-import-specifier',artifact,path,binding.local||null,null,Buffer.from(importKey(requirement)),textHash(importKey(requirement)),changes.flatMap(item=>item.evidenceEdgeIds),`Reconcile required import ${binding.local||binding.source} without copying unrelated imports.`,requirement,undefined,textHash(baseText))); }
        const baseExports=new Set(baseModule.reExports.map(item=>`${item.exported}:${item.imported}:${item.source}`));for(const edge of sourceModule.reExports){const key=`${edge.exported}:${edge.imported}:${edge.source}`;if(baseExports.has(key))continue;const operation=this.operation('insert-export',artifact,path,edge.exported,null,Buffer.from(key),textHash(key),changes.flatMap(item=>item.evidenceEdgeIds),`Insert static re-export ${edge.exported} from ${edge.source}.`,undefined,undefined,textHash(baseText));operation.exportRequirement={exported:edge.exported,imported:edge.imported,source:edge.source};operations.push(operation);}
        if(!selectedNames.size&&!moduleLevel)this.unresolved(unresolved,path,artifact.analysisId,'Modified module has no supported declaration or module-level integration operation.');
      }
    }
    for (const configuration of stable(request.sourceConfigurations ?? [], item => `${item.path}:${item.declaration}`)) {
      const artifact = request.artifacts.find(item => item.analysisId === configuration.sliceId)!;
      const source = await this.gitBlobText(artifact.slice.repository.branchCommit, configuration.path);
      let output = '';
      try { output = configureExportedConst(source, configuration.path, configuration.declaration, configuration.value); }
      catch (error) { this.unresolved(unresolved, configuration.path, configuration.sliceId, `This feature configuration cannot be generated safely. ${error instanceof Error ? error.message : String(error)}`); continue; }
      const operation = this.operation('configure-exported-const', artifact, configuration.path, configuration.declaration, null, source, textHash(output), [], `Write canonical configuration for exported const ${configuration.declaration}.`);
      operation.sourceConfiguration = configuration;
      operations.push(operation);
    }
  }

  private operation(kind:CandidateOperation['kind'],artifact:FeatureSliceArtifact,path:string,symbol:string|null,sourceRegion:CandidateOperation['source']['region'],sourceContent:string|Buffer,expectedHash:string,evidence:string[],detail:string,requirement?:ImportRequirement,testSlice?:CandidateOperation['testSlice'],baseHash:string|null=null,targetHash:string|null=null,targetRegion:CandidateOperation['target']['region']=null): CandidateOperation {
    const without:{kind:CandidateOperation['kind'];source:CandidateOperation['source'];target:CandidateOperation['target'];precondition:CandidateOperation['precondition'];postcondition:CandidateOperation['postcondition'];ownership:CandidateOperation['ownership'];detail:string;importRequirement?:ImportRequirement;testSlice?:CandidateOperation['testSlice']}={kind,source:{branchCommit:artifact.slice.repository.branchCommit,path,region:sourceRegion,contentHash:kind==='add-asset'?blobHash(sourceContent):textHash(sourceContent)},target:{path,region:targetRegion,symbol},precondition:{baseContentHash:baseHash,targetContentHash:targetHash,description:baseHash?'Target file and AST identity must match the analyzed base.':'Target path must not contain conflicting content.'},postcondition:{expectedContentHash:expectedHash,description:'Result must parse where applicable and match the planned deterministic content hash.'},ownership:operationOwnership(kind),detail}; if(requirement)without.importRequirement=requirement;if(testSlice)without.testSlice=testSlice; return {id:operationId(without),sliceIds:[artifact.analysisId],evidenceEdgeIds:stable([...new Set(evidence)],value=>value),...without};
  }
  private normalizeOperations(operations:CandidateOperation[]) {
    const map=new Map<string,CandidateOperation>();
    for(const operation of stable(operations,operationOrder)) {
      const semanticKey=JSON.stringify({kind:operation.kind,target:operation.target,expectedContentHash:operation.postcondition.expectedContentHash,ownership:operation.ownership,importRequirement:operation.importRequirement,exportRequirement:operation.exportRequirement,declarationNames:operation.declarationNames,allowedBareImportSources:operation.allowedBareImportSources,sourceConfiguration:operation.sourceConfiguration,jsxProjection:operation.jsxProjection});
      const existing=map.get(semanticKey);
      if(existing){existing.sliceIds=stable([...new Set([...existing.sliceIds,...operation.sliceIds])],value=>value);existing.evidenceEdgeIds=stable([...new Set([...existing.evidenceEdgeIds,...operation.evidenceEdgeIds])],value=>value);}
      else map.set(semanticKey,{...operation});
    }
    return stable([...map.values()],operationOrder);
  }
  private detectConflicts(operations:CandidateOperation[], artifacts:FeatureSliceArtifact[] = []) {
    const conflicts:CandidateConflict[]=[]; const add=(kind:string,path:string,symbol:string|null,items:CandidateOperation[],reason:string)=>conflicts.push({id:`conflict:${textHash(`${kind}:${path}:${symbol}:${items.map(item=>item.id).sort().join(':')}`).slice(0,16)}`,kind,path,symbol,sliceIds:stable([...new Set(items.flatMap(item=>item.sliceIds))],value=>value),operationIds:stable(items.map(item=>item.id),value=>value),evidenceEdgeIds:stable([...new Set(items.flatMap(item=>item.evidenceEdgeIds))],value=>value),reason,manualResolution:'Resolve the competing source ownership manually, then produce fresh resolved slices.'});
    const declarationKinds=new Set<CandidateOperation['kind']>(['replace-declaration','insert-declaration','replace-jsx-region']); const groups=new Map<string,CandidateOperation[]>();
    for(const item of operations.filter(op=>declarationKinds.has(op.kind))){const key=`${item.target.path}#${item.target.symbol}`;const list=groups.get(key)??[];list.push(item);groups.set(key,list);} for(const [key,items] of groups) if(new Set(items.map(item=>item.postcondition.expectedContentHash)).size>1)add('overlapping-declaration',items[0].target.path,items[0].target.symbol,items,`Slices reconstruct ${key} with different source declarations.`);
    const fileKinds=new Set<CandidateOperation['kind']>(['add-file','add-style-file','add-asset','replace-style-file','reconstruct-source-file','reconstruct-test-file']); const files=new Map<string,CandidateOperation[]>(); for(const item of operations.filter(op=>fileKinds.has(op.kind))){const list=files.get(item.target.path)??[];list.push(item);files.set(item.target.path,list);} for(const items of files.values())if(new Set(items.map(item=>item.postcondition.expectedContentHash)).size>1)add('conflicting-file-content',items[0].target.path,null,items,'Slices require incompatible whole-file or reconstructed content.');
    const imports=new Map<string,CandidateOperation[]>(); for(const item of operations.filter(op=>op.kind==='insert-import-specifier'&&op.importRequirement?.local)){const key=`${item.target.path}#${item.importRequirement!.local}`;const list=imports.get(key)??[];list.push(item);imports.set(key,list);} for(const items of imports.values())if(new Set(items.map(item=>importKey(item.importRequirement!))).size>1)add('conflicting-import-alias',items[0].target.path,items[0].importRequirement!.local,items,`The same local import binding is assigned incompatible sources or imported names.`);
    const exports=new Map<string,CandidateOperation[]>();for(const item of operations.filter(op=>op.kind==='insert-export'&&op.exportRequirement)){const key=`${item.target.path}#${item.exportRequirement!.exported}`;const list=exports.get(key)??[];list.push(item);exports.set(key,list);}for(const items of exports.values())if(new Set(items.map(item=>`${item.exportRequirement!.source}:${item.exportRequirement!.imported}`)).size>1)add('conflicting-export',items[0].target.path,items[0].exportRequirement!.exported,items,'Slices export the same name from incompatible source bindings.');
    for(let left=0;left<operations.length;left++)for(let right=left+1;right<operations.length;right++){const a=operations[left],b=operations[right];if(a.target.path!==b.target.path||!a.target.region||!b.target.region||a.target.symbol===b.target.symbol)continue;if(a.target.region.startLine<=b.target.region.endLine&&b.target.region.startLine<=a.target.region.endLine)add('overlapping-source-region',a.target.path,null,[a,b],'Distinct operations overlap the same inseparable base source region.');}
    for (const operation of operations.filter(item => declarationKinds.has(item.kind) && item.target.symbol)) {
      const contractKey = `${operation.target.path}#${operation.target.symbol}`;
      for (const artifact of artifacts.filter(item => !operation.sliceIds.includes(item.analysisId))) {
        const dependencies = artifact.slice.evidence.filter(edge => edge.type === 'uses-type' && edge.baseState === 'existing' && edge.to === contractKey);
        if (!dependencies.length) continue;
        const sliceIds = stable([...new Set([...operation.sliceIds, artifact.analysisId])], value => value);
        const evidenceEdgeIds = stable([...new Set([...operation.evidenceEdgeIds, ...dependencies.map(edge => edge.id)])], value => value);
        const id = `conflict:${textHash(`changed-dependency-contract:${contractKey}:${sliceIds.join(':')}`).slice(0,16)}`;
        if (!conflicts.some(item => item.id === id)) conflicts.push({
          id,
          kind:'changed-dependency-contract',
          path:operation.target.path,
          symbol:operation.target.symbol,
          sliceIds,
          operationIds:[operation.id],
          evidenceEdgeIds,
          reason:`One selected slice replaces the existing ${operation.target.symbol} contract while another selected slice was analyzed against that existing contract.`,
          manualResolution:'Reconcile the shared type contract and update its dependent feature manually, then capture fresh rendered selections and source analysis.'
        });
      }
    }
    return stable(conflicts,item=>item.id);
  }

  private async applyPlan(plan:CandidatePlan,worktree:string,applied:AppliedOperation[]) {
    const verifiedBase=new Set<string>(); const reconstructedTests=new Set<string>(); let activeSlice='';
    for(const operation of plan.operations) {
      const sliceId=operation.sliceIds[0]??''; if(sliceId!==activeSlice){activeSlice=sliceId;this.options.onProgress?.({stage:'applying-feature',message:'Applying one selected feature from its verified source operations.',sliceId});}
      this.options.onProgress?.({stage:'applying-operation',message:`Applying ${operation.kind} to ${operation.target.path}.`,sliceId,path:operation.target.path});
      const target=resolve(worktree,validateRepositoryPath(operation.target.path)); if(!target.startsWith(`${resolve(worktree)}\\`)&&!target.startsWith(`${resolve(worktree)}/`))throw new CandidateRefusal(`Unsafe target path ${operation.target.path}.`);
      if(operation.precondition.baseContentHash&&!verifiedBase.has(operation.target.path)){const current=await readFile(target);if(textHash(current)!==operation.precondition.baseContentHash)throw new CandidateRefusal(`Base content hash precondition failed for ${operation.target.path}.`);verifiedBase.add(operation.target.path);}
      let status:AppliedOperation['status']='applied';
      if(['add-file','add-style-file','add-asset'].includes(operation.kind)) { const blob=await this.gitBlob(operation.source.branchCommit,operation.source.path);const hash=operation.kind==='add-asset'?blobHash:textHash;if(hash(blob)!==operation.source.contentHash)throw new CandidateRefusal(`Source blob hash changed for ${operation.source.path}.`);const output=textPath(operation.target.path)?Buffer.from(formattedText(blob),'utf8'):blob;try{const existing=await readFile(target);if(hash(existing)===hash(output))status='deduplicated';else throw new CandidateRefusal(`Target ${operation.target.path} already exists with conflicting content.`);}catch(error){if(error instanceof CandidateRefusal)throw error;await mkdir(dirname(target),{recursive:true});await writeFile(target,output);} }
      else if(operation.kind==='replace-style-file'){const blob=await this.gitBlob(operation.source.branchCommit,operation.source.path);if(textHash(blob)!==operation.source.contentHash)throw new CandidateRefusal(`Source blob hash changed for ${operation.source.path}.`);await writeFile(target,formattedText(blob),'utf8');}
      else if(operation.kind==='insert-import-specifier'){const current=await readFile(target,'utf8');const next=reconcileImport(current,operation.target.path,operation.importRequirement!);if(next===current)status='deduplicated';else await writeFile(target,next,'utf8');}
      else if(operation.kind==='insert-export'){const current=await readFile(target,'utf8');const item=operation.exportRequirement!;const next=reconcileExport(current,operation.target.path,item.exported,item.source,item.imported);if(next===current)status='deduplicated';else await writeFile(target,next,'utf8');}
      else if(operation.kind==='replace-jsx-region') {
        if(!operation.jsxProjection)throw new CandidateRefusal(`JSX region operation ${operation.id} lacks deterministic projection evidence.`);
        const source=await this.gitBlobText(operation.source.branchCommit,operation.source.path);const current=await readFile(target,'utf8');
        if(operation.precondition.targetContentHash){const targetRange=findDeclarationRange(current,operation.target.path,operation.target.symbol!);if(!targetRange||textHash(current.slice(targetRange.start,targetRange.end))!==operation.precondition.targetContentHash)throw new CandidateRefusal(`Target declaration precondition failed for ${operation.target.symbol} in ${operation.target.path}.`);}
        let projected:ReturnType<typeof projectJsxRegion>;try{projected=projectJsxRegion(current,source,operation.target.path,operation.target.symbol!,operation.jsxProjection.renderedBoundary);}catch(error){throw new CandidateRefusal(`JSX region projection became unsafe for ${operation.target.symbol}: ${error instanceof Error?error.message:String(error)}`);}
        if(textHash(projected.sourceSnippet)!==operation.source.contentHash)throw new CandidateRefusal(`Selected JSX source region hash changed for ${operation.jsxProjection.renderedBoundary.symbol}.`);
        if(projectionKey(projected.evidence)!==projectionKey(operation.jsxProjection))throw new CandidateRefusal(`JSX projection evidence changed for ${operation.jsxProjection.renderedBoundary.symbol} in ${operation.target.path}.`);
        const resultRange=findDeclarationRange(projected.code,operation.target.path,operation.target.symbol!);if(!resultRange||textHash(projected.code.slice(resultRange.start,resultRange.end))!==operation.postcondition.expectedContentHash)throw new CandidateRefusal(`Projected JSX result differs from the planned semantic content for ${operation.target.symbol}.`);
        await writeFile(target,projected.code,'utf8');
      }
      else if(['replace-declaration','insert-declaration'].includes(operation.kind)){const source=await this.gitBlobText(operation.source.branchCommit,operation.source.path);const range=findDeclarationRange(source,operation.source.path,operation.target.symbol!);if(!range)throw new CandidateRefusal(`Source declaration ${operation.target.symbol} disappeared from ${operation.source.path}.`);const snippet=source.slice(range.start,range.end);if(textHash(snippet)!==operation.source.contentHash)throw new CandidateRefusal(`Source declaration hash changed for ${operation.target.symbol}.`);const current=await readFile(target,'utf8');if(operation.precondition.targetContentHash){const targetRange=findDeclarationRange(current,operation.target.path,operation.target.symbol!);if(!targetRange||textHash(current.slice(targetRange.start,targetRange.end))!==operation.precondition.targetContentHash)throw new CandidateRefusal(`Target declaration precondition failed for ${operation.target.symbol} in ${operation.target.path}.`);}const next=operation.kind==='insert-declaration'?insertDeclaration(current,operation.target.path,snippet):replaceDeclaration(current,operation.target.path,operation.target.symbol!,snippet);await writeFile(target,next,'utf8');}
      else if(operation.kind==='reconstruct-source-file'){const source=await this.gitBlobText(operation.source.branchCommit,operation.source.path);const index=await cachedSourceIndex(this.repository,this.repositoryRoot,operation.source.branchCommit);const module=index.moduleByPath.get(operation.source.path);if(!module)throw new CandidateRefusal(`Source module ${operation.source.path} disappeared.`);let output='';try{output=reconstructAddedModule(source,operation.source.path,module,operation.declarationNames??[],{allowedBareImportSources:operation.allowedBareImportSources,refuseUnsupportedTopLevel:plan.repository.generationProfile==='external-react-vite'});}catch(error){throw new CandidateRefusal(`Added source reconstruction became unsafe for ${operation.target.path}: ${error instanceof Error?error.message:String(error)}`);}if(textHash(output)!==operation.postcondition.expectedContentHash)throw new CandidateRefusal(`Reconstructed source content differs from the planned output for ${operation.target.path}.`);await mkdir(dirname(target),{recursive:true});await writeFile(target,output,'utf8');}
      else if(operation.kind==='reconstruct-test-file'){if(reconstructedTests.has(operation.target.path)){status='deduplicated';}else{const source=await this.gitBlobText(operation.source.branchCommit,operation.source.path);const index=await cachedSourceIndex(this.repository,this.repositoryRoot,operation.source.branchCommit);const module=index.moduleByPath.get(operation.source.path);if(!module)throw new CandidateRefusal(`Source test module ${operation.source.path} disappeared.`);const output=reconstructTestModule(source,operation.source.path,module,operation.testSlice!);if(textHash(output)!==operation.postcondition.expectedContentHash)throw new CandidateRefusal(`Reconstructed test content differs from the planned output for ${operation.target.path}.`);await mkdir(dirname(target),{recursive:true});await writeFile(target,output,'utf8');reconstructedTests.add(operation.target.path);}}
      else if(operation.kind==='configure-exported-const'){const configuration=operation.sourceConfiguration!;const current=await readFile(target,'utf8');const next=configureExportedConst(current,operation.target.path,configuration.declaration,configuration.value);if(textHash(next)!==operation.postcondition.expectedContentHash)throw new CandidateRefusal(`Configured source content differs from the planned output for ${operation.target.path}.`);if(next===current)status='deduplicated';else await writeFile(target,next,'utf8');}
      else throw new CandidateRefusal(`Unsupported operation kind ${operation.kind}.`);
      if(/\.[jt]sx?$/.test(operation.target.path))parseModule(await readFile(target,'utf8'),operation.target.path); applied.push({operationId:operation.id,path:operation.target.path,status,resultingContentHash:operation.kind==='add-asset'?blobHash(await readFile(target)):textHash(await readFile(target)),detail:operation.detail});
    }
  }
  private defaultVerificationCommands(plan: CandidatePlan): VerificationCommand[] {
    const npm = process.platform === 'win32' ? (process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe') : 'npm';
    const npmPrefix = process.platform === 'win32' ? ['/d','/s','/c','npm'] : [];
    const focusedTests = [...new Set(plan.operations.filter(item => item.kind === 'reconstruct-test-file').map(item => item.target.path))].sort();
    return [
      { name:'install', executable:npm, args:[...npmPrefix,'ci','--no-audit','--no-fund'] },
      { name:'typecheck', executable:npm, args:[...npmPrefix,'run','typecheck'] },
      { name:'tests', executable:npm, args:[...npmPrefix,'test'] },
      ...(focusedTests.length ? [{ name:'focused-feature-tests', executable:npm, args:[...npmPrefix,'test','--',...focusedTests] }] : []),
      { name:'production-build', executable:npm, args:[...npmPrefix,'run','build'] }
    ];
  }
  private async verify(worktree:string,results:VerificationResult[],plan:CandidatePlan) { for(const command of this.verificationCommands ?? this.defaultVerificationCommands(plan)){this.options.onProgress?.({stage:'verification',message:`Running verification: ${command.name}.`,verification:command.name});let output='';let exitCode=0;try{const result=await execFileAsync(command.executable,command.args,{cwd:worktree,encoding:'utf8',maxBuffer:20*1024*1024,windowsHide:true});output=`${result.stdout}\n${result.stderr}`;}catch(error){const value=error as Error&{stdout?:string;stderr?:string;code?:number};output=`${value.stdout??''}\n${value.stderr??''}\n${value.message}`;exitCode=typeof value.code==='number'?value.code:1;}results.push({name:command.name,command:[command.executable,...command.args].join(' '),status:exitCode===0?'passed':'failed',exitCode,outputTail:output.trim().slice(-4000)});if(exitCode!==0)throw new VerificationFailure(`Verification command ${command.name} failed with exit code ${exitCode}.`);} }
  private exclusiveAtomicAssetDependency(artifact:FeatureSliceArtifact,index:Awaited<ReturnType<typeof buildSourceIndex>>,path:string):{ok:true}|{ok:false;reason:string} {
    const selectedDeclarations=new Set(artifact.slice.includedChanges.filter(item=>item.symbol).map(item=>`${item.path}#${item.symbol!.name}`));
    const evidence=artifact.slice.evidence.some(item=>item.type==='imports-asset'&&item.to===path);
    if(!evidence)return{ok:false,reason:'Atomic asset lacks a static imports-asset evidence edge from the selected reachable declaration graph.'};
    let selectedReferences=0;
    for(const module of index.modules){
      for(const binding of module.imports.filter(item=>item.kind==='asset'&&item.resolvedPath===path)){
        if(!binding.local)return{ok:false,reason:`Atomic asset ${path} has a bare or otherwise unbound project importer in ${module.path}; exclusivity is not provable.`};
        const consumers=module.declarations.filter(item=>item.dependencies.includes(binding.local)||item.jsxReferences.includes(binding.local));
        if(!consumers.length)return{ok:false,reason:`Atomic asset ${path} has an importer in ${module.path} whose declaration owner is not statically known.`};
        for(const consumer of consumers){
          if(!selectedDeclarations.has(consumer.key))return{ok:false,reason:`Atomic asset ${path} is also referenced by unrelated project declaration ${consumer.key}; it is not an exclusive atomic dependency.`};
          selectedReferences+=1;
        }
      }
    }
    return selectedReferences>0?{ok:true}:{ok:false,reason:`Atomic asset ${path} has no statically owned reference from a selected declaration.`};
  }
  private expectedProvenance(preflight:CandidatePreflight):CandidateProvenance{return{planIdentity:preflight.integrationPlan?.identity??legacyPlanIdentity,generationId:preflight.generationId,profile:preflight.plan.repository.generationProfile??'phase0'};}
  private candidateCommitMessage(provenance:CandidateProvenance){return `Generate verified UI Merge Studio candidate\n\nUI-Merge-Plan: ${provenance.planIdentity}\nUI-Merge-Generation: ${provenance.generationId}\nUI-Merge-Profile: ${provenance.profile}`;}
  private async readCandidateProvenance(commit:string):Promise<CandidateProvenance|null>{
    const message=await this.git(['show','-s','--format=%B',commit]);const values=new Map<string,string[]>();
    for(const line of message.split(/\r?\n/)){const match=/^(UI-Merge-(?:Plan|Generation|Profile)):\s*(\S+)\s*$/.exec(line);if(!match)continue;const items=values.get(match[1])??[];items.push(match[2]);values.set(match[1],items);}
    const plan=values.get('UI-Merge-Plan');const generation=values.get('UI-Merge-Generation');const profile=values.get('UI-Merge-Profile');
    if(plan?.length!==1||generation?.length!==1||profile?.length!==1||!/^[a-f0-9]{16}$/.test(generation[0])||(profile[0]!=='phase0'&&profile[0]!=='external-react-vite'))return null;
    return{planIdentity:plan[0],generationId:generation[0],profile:profile[0]};
  }
  private generationId(request:CandidateGenerationRequest){return createHash('sha256').update(JSON.stringify({version:candidateGenerationVersion,repositoryRoot:resolve(request.repositoryRoot),repositoryId:request.repositoryId,baseRef:request.baseRef,expectedBaseCommit:request.expectedBaseCommit,commonBaseRef:request.commonBaseRef??request.baseRef,expectedCommonBaseCommit:request.expectedCommonBaseCommit??request.expectedBaseCommit,candidateBranch:request.candidateBranch,analyzerSchemaVersion:request.analyzerSchemaVersion,generationProfile:request.generationProfile??'phase0',integrationPlan:request.integrationPlan,sliceIds:stable(request.artifacts.map(item=>item.analysisId),value=>value),sourceConfigurations:stable(request.sourceConfigurations ?? [],item=>`${item.sliceId}:${item.path}:${item.declaration}`)})).digest('hex').slice(0,16);}
  private emptyReport(preflight:CandidatePreflight,request:CandidateGenerationRequest):CandidateGenerationReport{const excluded:ExcludedSourceChange[]=request.artifacts.flatMap(artifact=>artifact.slice.excludedChanges.map(item=>({sliceId:artifact.analysisId,path:item.path,symbol:item.symbol?.name??null,reason:item.reason})));const relativePath=`.ums/generation/${preflight.generationId}/candidate-report.json`;return{version:candidateGenerationVersion,generationId:preflight.generationId,integrationPlan:preflight.integrationPlan,status:'failed',stage:'validate',message:'Candidate generation has not completed.',repository:{baseCommit:request.expectedBaseCommit,candidateBranch:request.candidateBranch,provenance:this.expectedProvenance(preflight)},sliceIds:preflight.plan.sliceIds,plan:preflight.plan,appliedOperations:[],excludedSourceChanges:stable(excluded,item=>`${item.sliceId}:${item.path}:${item.symbol??''}`),conflicts:preflight.plan.conflicts,verification:[],cleanup:{worktreeRemoved:true,processesStopped:true,detail:'No worktree created.'},relativePath};}
  private unresolved(target:CandidateUnresolved[],path:string,sliceId:string,reason:string){target.push({path,sliceId,reason,manualResolution:'Use a supported non-overlapping source structure or resolve the source integration manually, then re-analyze.'});}
  private async persist(report:CandidateGenerationReport){const directory=resolve(this.artifactRoot,'.ums','generation',report.generationId);await mkdir(directory,{recursive:true});await writeFile(resolve(directory,'candidate-report.json'),`${JSON.stringify(report,null,2)}\n`,'utf8');}
  private async git(args:string[],cwd=this.repositoryRoot,env:NodeJS.ProcessEnv=process.env){return(await execFileAsync('git',args,{cwd,encoding:'utf8',maxBuffer:20*1024*1024,env,windowsHide:true})).stdout.trim();}
  private async gitBlob(commit:string,path:string){const result=await execFileAsync('git',['show',`${commit}:${validateRepositoryPath(path)}`],{cwd:this.repositoryRoot,encoding:'buffer',maxBuffer:20*1024*1024,windowsHide:true});return result.stdout as Buffer;}
  private async gitBlobText(commit:string,path:string){return(await this.gitBlob(commit,path)).toString('utf8');}
  private async pathExistsAtCommit(commit:string,path:string){return(await this.git(['ls-tree','--name-only',commit,'--',validateRepositoryPath(path)]))===path;}
  private async tryResolve(ref:string){try{return await this.repository.resolveRef(ref);}catch{return null;}}
  private async removeWorktree(path:string){const target=resolve(path),prefix=resolve(tmpdir());if(!target.startsWith(`${prefix}\\ui-merge-studio-candidate-`)&&!target.startsWith(`${prefix}/ui-merge-studio-candidate-`))throw new Error(`Refusing to remove unrecognized candidate worktree ${target}.`);await this.git(['worktree','remove','--force',target]);await rm(target,{recursive:true,force:true});}
}
