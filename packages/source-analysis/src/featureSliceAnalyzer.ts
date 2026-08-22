import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isSourceIdentity } from '../../shared/src/sourceIdentity';
import { buildSourceIndex, resolveImportedDeclaration, type DeclarationRecord, type ModuleRecord, type SourceIndex } from './sourceIndex';
import { analyzeTestFile } from './testSlicing';
import { featureSliceVersion, type AnalyzeFeatureRequest, type ChangeCategory, type ChangedFile, type ExcludedChange, type FeatureSlice, type FeatureSliceArtifact, type IncludedChange, type SliceEvidence, type SourceRegion, type SymbolIdentity, type TestFileSlice, type UnresolvedDependency } from './types';
import { GitSourceRepository, validateRepositoryPath } from './gitModel';

interface GraphEdge { from: DeclarationRecord; to: DeclarationRecord; type: 'imports-symbol' | 'renders-component' | 'uses-type' }
interface AnalysisPolicy { strictExternal: boolean; supportedSourceRoot: string | null }
function edgeKey(edge: GraphEdge) { return `${edge.type}:${edge.from.key}->${edge.to.key}`; }
function buildEdges(index: SourceIndex) {
  const edges: GraphEdge[] = [];
  for (const module of index.modules) for (const declaration of module.declarations) {
    for (const name of declaration.dependencies) {
      const local = module.declarations.find(item => item.name === name); const imported = resolveImportedDeclaration(index, module, name); const target = local ?? imported; if (!target) continue;
      const binding = module.imports.find(item => item.local === name); edges.push({ from: declaration, to: target, type: binding?.kind === 'type' ? 'uses-type' : 'imports-symbol' });
    }
    for (const name of declaration.jsxReferences) { const target = module.declarations.find(item => item.name === name) ?? resolveImportedDeclaration(index, module, name); if (target) edges.push({ from: declaration, to: target, type: 'renders-component' }); }
  }
  return [...new Map(edges.map(edge => [edgeKey(edge), edge])).values()].sort((a,b) => edgeKey(a).localeCompare(edgeKey(b)));
}
function overlaps(region: SourceRegion, declaration: DeclarationRecord) { return region.startLine <= declaration.endLine && region.endLine >= declaration.startLine; }
function symbol(declaration: DeclarationRecord): SymbolIdentity { return { name: declaration.name, kind: declaration.kind, region: { startLine: declaration.startLine, endLine: declaration.endLine } }; }
function category(declaration: DeclarationRecord, module: ModuleRecord, selected: boolean, integration: boolean): ChangeCategory {
  if (selected) return 'selected-definition'; if (integration) return 'integration'; if (module.isTest) return 'test'; if (declaration.kind === 'component') return 'component'; if (declaration.kind === 'type' || declaration.kind === 'interface' || declaration.kind === 'enum') return 'type';
  const dependencies = new Set(declaration.dependencies); if (module.imports.some(item => item.source === 'react' && dependencies.has(item.local))) return 'hook'; return 'utility';
}
function stable<T>(items: T[], key: (item: T) => string) { return [...items].sort((a,b) => key(a).localeCompare(key(b))); }
function cycleFrom(edges: GraphEdge[], start: string) {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) { const targets = adjacency.get(edge.from.key) ?? []; targets.push(edge.to.key); adjacency.set(edge.from.key, targets); }
  for (const [key, targets] of adjacency) adjacency.set(key, [...new Set(targets)].sort());
  const visited = new Set<string>(); const active = new Set<string>(); const path: string[] = [];
  const visit = (key: string): string[] | null => {
    if (active.has(key)) { const index = path.indexOf(key); return [...path.slice(index), key]; }
    if (visited.has(key)) return null;
    visited.add(key); active.add(key); path.push(key);
    for (const target of adjacency.get(key) ?? []) { const cycle = visit(target); if (cycle) return cycle; }
    path.pop(); active.delete(key); return null;
  };
  return visit(start);
}
function emptySlice(request: AnalyzeFeatureRequest, baseCommit: string, branchCommit: string, mergeBaseCommit: string, reason: string): FeatureSlice { return { version: featureSliceVersion, repository: { baseRef: request.baseRef, branchRef: request.branchRef, mergeBaseCommit, branchCommit }, selection: request.selection, status: 'refused', boundary: { original: request.selection.componentName ?? request.selection.repositoryRelativePath, analyzed: request.selection.componentName ?? request.selection.repositoryRelativePath, status: 'unresolved', reason }, changedFiles: [], includedChanges: [], excludedChanges: [], unresolvedDependencies: [{ path: request.selection.repositoryRelativePath, symbol: request.selection.componentName, reason, edge: 'selection-validation', manualNextStep: 'Restart the preview, make a fresh visual selection, and analyze again.', ancestorBoundaryMayHelp: false }], testFileSlices: [], evidence: [] }; }

export class FeatureSliceRefusal extends Error { override name = 'FeatureSliceRefusal'; }

export class FeatureSliceAnalyzer {
  private repository: GitSourceRepository;
  constructor(repositoryRoot: string, private artifactRoot?: string) { this.repository = new GitSourceRepository(repositoryRoot); }
  async analyze(request: AnalyzeFeatureRequest): Promise<FeatureSliceArtifact> {
    return this.analyzeWithPolicy(request, { strictExternal: false, supportedSourceRoot: null });
  }
  async analyzeExternal(request: AnalyzeFeatureRequest): Promise<FeatureSliceArtifact> {
    if (!request || typeof request !== 'object' || !isSourceIdentity((request as AnalyzeFeatureRequest).selection)) throw new FeatureSliceRefusal('A trusted SourceIdentity is required before external feature-slice analysis. Browser paths, rendered text, screenshots, and manual file lists are not accepted.');
    const sourcePath = request.selection.repositoryRelativePath.replaceAll('\\', '/');
    if (request.selection.confidence !== 'exact' || !request.selection.componentName) throw new FeatureSliceRefusal('External feature slicing requires an exact named function-component SourceIdentity from trusted preview instrumentation.');
    if (!sourcePath.startsWith('src/') || !sourcePath.endsWith('.tsx')) {
      throw new FeatureSliceRefusal(`External feature slicing supports selected React TypeScript function components under src/; received ${sourcePath}.`);
    }
    return this.analyzeWithPolicy(request, { strictExternal: true, supportedSourceRoot: 'src/' });
  }
  private async analyzeWithPolicy(request: AnalyzeFeatureRequest, policy: AnalysisPolicy): Promise<FeatureSliceArtifact> {
    let baseCommit = ''; let branchCommit = ''; let mergeBaseCommit = '';
    try {
      baseCommit = await this.repository.resolveRef(request.baseRef); branchCommit = await this.repository.resolveRef(request.branchRef); mergeBaseCommit = await this.repository.mergeBase(request.baseRef, request.branchRef);
    } catch (error) { return this.artifact(emptySlice(request, baseCommit, branchCommit, mergeBaseCommit, `Git identity resolution failed: ${error instanceof Error ? error.message : String(error)}`)); }
    if (!isSourceIdentity(request.selection) || request.selection.branch !== request.branchRef) return this.artifact(emptySlice(request, baseCommit, branchCommit, mergeBaseCommit, 'The source selection is malformed or belongs to a different branch.'));
    if (branchCommit !== request.expectedBranchCommit) return this.artifact(emptySlice(request, baseCommit, branchCommit, mergeBaseCommit, `Branch commit mismatch: selected ${request.expectedBranchCommit}, current ${branchCommit}.`));
    try { validateRepositoryPath(request.selection.repositoryRelativePath); } catch (error) { return this.artifact(emptySlice(request, baseCommit, branchCommit, mergeBaseCommit, error instanceof Error ? error.message : String(error))); }
    const changedFiles = await this.repository.changedFiles(mergeBaseCommit, branchCommit);
    const [branchIndex, baseIndex] = await Promise.all([buildSourceIndex(this.repository, branchCommit), buildSourceIndex(this.repository, mergeBaseCommit)]);
    const selectedModule = branchIndex.moduleByPath.get(request.selection.repositoryRelativePath);
    const seed = selectedModule?.declarations.find(item => item.name === request.selection.componentName && item.startLine === request.selection.line);
    if (!selectedModule || !seed) return this.artifact({ ...emptySlice(request, baseCommit, branchCommit, mergeBaseCommit, 'The selected definition no longer exists at the recorded source location.'), changedFiles });
    if (policy.strictExternal && seed.kind !== 'component') return this.artifact({ ...emptySlice(request, baseCommit, branchCommit, mergeBaseCommit, `The selected definition ${seed.key} is not a supported function component.`), changedFiles });
    const branchEdges = buildEdges(branchIndex); const baseEdges = buildEdges(baseIndex); const baseEdgeKeys = new Set(baseEdges.map(edgeKey));
    const baseSeed = baseIndex.declarationByKey.get(seed.key); const integrationPath: GraphEdge[] = []; let boundaryResolved = Boolean(baseSeed);
    let boundary = seed; let boundaryReason = 'The selected changed definition is sufficient for the supported dependency graph.';
    if (!baseSeed) {
      let current = seed; const visited = new Set([current.key]);
      while (true) {
        const candidates = branchEdges.filter(edge => edge.to.key === current.key && edge.type === 'renders-component' && !visited.has(edge.from.key));
        if (!candidates.length) { boundaryReason = 'No safe existing application integration boundary was found for the selected added definition.'; break; }
        if (policy.strictExternal && candidates.length > 1) {
          const reason = `Ambiguous integration dependency: ${current.name} has ${candidates.length} supported reverse render paths (${candidates.map(item => item.from.key).join(', ')}).`;
          const refused = emptySlice(request, baseCommit, branchCommit, mergeBaseCommit, reason); refused.changedFiles = changedFiles; refused.boundary = { original: seed.name, analyzed: current.name, status: 'unresolved', reason }; refused.unresolvedDependencies[0] = { path: current.path, symbol: current.name, reason, edge: 'ambiguous-dependency', manualNextStep: 'Select an existing unambiguous ancestor boundary or simplify the branch integration path.', ancestorBoundaryMayHelp: true };
          return this.artifact(refused);
        }
        const edge = candidates[0]; integrationPath.push(edge); visited.add(edge.from.key);
        if (baseIndex.declarationByKey.has(edge.from.key)) { boundary = edge.from; boundaryResolved = true; boundaryReason = `Expanded from ${seed.name} to ${boundary.name} because the selected definition requires a changed integration chain before reaching an existing base declaration boundary.`; break; }
        current = edge.from;
      }
    }
    const changedByPath = new Map(changedFiles.map(file => [file.path, file]));
    const changedDeclarations = new Map<string, DeclarationRecord>();
    for (const module of branchIndex.modules) { const file = changedByPath.get(module.path); if (!file) continue; for (const declaration of module.declarations) if (file.status === 'added' || file.hunks.some(region => overlaps(region, declaration))) changedDeclarations.set(declaration.key, declaration); }
    const reachableFromSelection = new Set<string>();
    const selectionQueue = [seed.key];
    while (selectionQueue.length) {
      const key = selectionQueue.shift()!;
      if (reachableFromSelection.has(key)) continue;
      reachableFromSelection.add(key);
      for (const edge of branchEdges.filter(item => item.from.key === key)) selectionQueue.push(edge.to.key);
    }
    if (![...reachableFromSelection].some(key => changedDeclarations.has(key)) && integrationPath.length === 0) {
      const reason = 'The selected definition is unchanged and no changed supported dependency or integration edge connects it to this branch delta.';
      const refused = emptySlice(request, baseCommit, branchCommit, mergeBaseCommit, reason);
      refused.changedFiles = changedFiles;
      refused.boundary = { original: seed.name, analyzed: seed.name, status: 'unresolved', reason };
      refused.excludedChanges = changedFiles.map(file => this.excludedFile(branchCommit, file, 'not-reached-by-supported-analysis', 'unproven', reason));
      return this.artifact(refused);
    }
    const evidence = new Map<string, SliceEvidence>();
    const addEvidence = (type: SliceEvidence['type'], from: string, to: string, detail: string, baseState: SliceEvidence['baseState']) => { const id = `edge:${type}:${from}->${to}`; evidence.set(id, { id, type, from, to, detail, baseState }); return id; };
    if (baseSeed) {
      const existingIntegration = branchEdges.find(edge => edge.to.key === seed.key && edge.type === 'renders-component' && baseEdgeKeys.has(edgeKey(edge)));
      if (existingIntegration) addEvidence('existing-base-edge', seed.key, existingIntegration.from.key, `${existingIntegration.from.name} already renders ${seed.name} in the merge base, so no parent branch change is required.`, 'existing');
    }
    const included = new Map<string, IncludedChange>();
    const integrationKeys = new Set(integrationPath.map(edge => edge.from.key));
    const includeDeclaration = (declaration: DeclarationRecord, reason: string, edgeIds: string[], selected = false) => {
      if (!changedDeclarations.has(declaration.key)) return;
      const module = branchIndex.moduleByPath.get(declaration.path)!; const file = changedByPath.get(declaration.path)!; const itemKey = `${declaration.path}#${declaration.name}`;
      included.set(itemKey, { path: declaration.path, category: category(declaration, module, selected, integrationKeys.has(declaration.key)), symbol: symbol(declaration), branchChangeId: `${branchCommit}:${itemKey}`, wholeFile: file.status === 'added' && module.declarations.length === 1, reason, evidenceEdgeIds: stable(edgeIds, value => value), confidence: 'exact' });
    };
    const visited = new Set<string>();
    const walk = (declaration: DeclarationRecord) => { if (visited.has(declaration.key)) return; visited.add(declaration.key); for (const edge of branchEdges.filter(item => item.from.key === declaration.key)) { const id = addEvidence(edge.type, edge.from.key, edge.to.key, `${edge.from.name} statically ${edge.type === 'renders-component' ? 'renders' : 'references'} ${edge.to.name}.`, baseEdgeKeys.has(edgeKey(edge)) ? 'existing' : 'added'); includeDeclaration(edge.to, `${edge.to.name} is a changed static dependency of the analyzed boundary.`, [id], edge.to.key === seed.key); walk(edge.to); } };
    includeDeclaration(seed, 'This changed definition is the validated visual selection seed.', [addEvidence('changed-within', seed.path, seed.key, 'The selected definition overlaps a branch diff region.', baseSeed ? 'changed' : 'added')], true);
    for (const edge of integrationPath) { const id = addEvidence('integrated-by', edge.to.key, edge.from.key, `${edge.from.name} provides the supported reverse component-integration edge for ${edge.to.name}.`, baseEdgeKeys.has(edgeKey(edge)) ? 'existing' : 'added'); includeDeclaration(edge.from, `${edge.from.name} is a changed integration step required to connect the selection to ${boundary.name}.`, [id]); }
    walk(boundary);
    const integrationModules = this.reverseModuleClosure(branchIndex, boundary.path);
    const unresolved: UnresolvedDependency[] = [];
    const styleModules = new Map(integrationModules.map(module => [module.path, module]));
    for (const key of visited) {
      const declaration = branchIndex.declarationByKey.get(key);
      const module = declaration ? branchIndex.moduleByPath.get(declaration.path) : null;
      if (module) styleModules.set(module.path, module);
    }
    for (const module of [...styleModules.values()].sort((a, b) => a.path.localeCompare(b.path))) for (const styleImport of module.imports.filter(item => item.kind === 'style' && item.resolvedPath)) {
      const stylePath = styleImport.resolvedPath!; const file = changedByPath.get(stylePath); if (!file) continue; const id = addEvidence('imports-style', module.path, stylePath, `${module.path} statically imports the changed stylesheet.`, baseIndex.moduleByPath.get(module.path)?.imports.some(item => item.kind === 'style' && item.resolvedPath === stylePath) ? 'existing' : 'added');
      included.set(`${stylePath}#<file>`, { path: stylePath, category: 'style', symbol: null, branchChangeId: `${branchCommit}:${stylePath}:file`, wholeFile: true, reason: 'The changed stylesheet is statically imported on the analyzed application integration chain; rule-level extraction is not supported.', evidenceEdgeIds: [id], confidence: 'conservative' });
      if (!baseIndex.moduleByPath.get(module.path)?.imports.some(item => item.kind === 'style' && item.resolvedPath === stylePath) && changedByPath.has(module.path)) included.set(`${module.path}#<module>`, { path: module.path, category: 'integration', symbol: null, branchChangeId: `${branchCommit}:${module.path}:module`, wholeFile: true, reason: 'This changed module-level import registers the feature stylesheet on the application integration chain.', evidenceEdgeIds: [id], confidence: 'conservative' });
    }
    const checkedAssets = new Map<string, string | null>();
    const assetOwnershipIssue = (assetPath: string, file: ChangedFile) => {
      if (checkedAssets.has(assetPath)) return checkedAssets.get(assetPath)!;
      let issue: string | null = file.status === 'added' ? null : `Atomic asset ${assetPath} is ${file.status}; only an asset absent at the analysis foundation can be an exclusive atomic dependency.`;
      let references = 0;
      for (const importer of branchIndex.modules) for (const binding of importer.imports.filter(item => item.kind === 'asset' && item.resolvedPath === assetPath)) {
        const consumers = binding.local ? importer.declarations.filter(item => item.dependencies.includes(binding.local) || item.jsxReferences.includes(binding.local)) : [];
        if (!binding.local || !consumers.length) issue ??= `Atomic asset ${assetPath} has an importer in ${importer.path} whose declaration owner is not statically known.`;
        for (const consumer of consumers) { references += 1; if (!visited.has(consumer.key)) issue ??= `Atomic asset ${assetPath} is also referenced by unrelated project declaration ${consumer.key}.`; }
      }
      if (!references) issue ??= `Atomic asset ${assetPath} has no statically owned project reference.`;
      checkedAssets.set(assetPath, issue); return issue;
    };
    for (const declarationKey of visited) {
      const declaration = branchIndex.declarationByKey.get(declarationKey)!; const module = branchIndex.moduleByPath.get(declaration.path)!;
      for (const binding of module.imports.filter(item => item.kind === 'asset' && item.resolvedPath && declaration.dependencies.includes(item.local))) {
        const assetPath=binding.resolvedPath!; const file = changedByPath.get(assetPath); if (!file) continue;
        const issue=policy.strictExternal?assetOwnershipIssue(assetPath,file):null;
        const id = addEvidence('imports-asset', declaration.key, assetPath, `${declaration.name} statically imports a changed project asset.`, 'added');
        included.set(`${assetPath}#<file>`, { path: assetPath, category: 'asset', symbol: null, branchChangeId: `${branchCommit}:${assetPath}:file`, wholeFile: true, reason: issue ? 'The asset is statically reached but exclusive atomic dependency ownership is not provable.' : 'The unchanged asset blob is an exclusive atomic dependency of reachable selected declarations; its bytes were not semantically analyzed.', evidenceEdgeIds: [id], confidence: issue ? 'unresolved' : 'conservative' });
        if(issue)unresolved.push({path:assetPath,symbol:null,reason:issue,edge:'non-exclusive-atomic-dependency',manualNextStep:'Remove unrelated asset consumers or keep the asset out of automatic external candidate generation.',ancestorBoundaryMayHelp:false});
      }
    }
    if (policy.strictExternal && !boundaryResolved) unresolved.push({ path: boundary.path, symbol: boundary.name, reason: boundaryReason, edge: 'integration-boundary', manualNextStep: 'Select an existing supported ancestor boundary or add one unambiguous static render path to the application.', ancestorBoundaryMayHelp: true });
    const testFileSlices: TestFileSlice[] = [];
    const productionKeys = new Set([...visited, ...integrationKeys, seed.key, boundary.key]);
    const productionPaths = new Set([...productionKeys].map(key => branchIndex.declarationByKey.get(key)?.path).filter((path): path is string => Boolean(path)));
    const literalOwners = new Map<string, Set<string>>();
    for (const module of branchIndex.modules.filter(item => !item.isTest)) for (const declaration of module.declarations) for (const literal of declaration.staticLiterals) { const owners = literalOwners.get(literal) ?? new Set<string>(); owners.add(declaration.key); literalOwners.set(literal, owners); }
    for (const module of branchIndex.modules.filter(item => item.isTest && changedByPath.has(item.path))) if ([...productionPaths].some(path => this.moduleReaches(branchIndex, module.path, path))) {
      const id = addEvidence('tested-by', boundary.key, module.path, `${module.path} reaches the analyzed boundary through supported static imports.`, 'added');
      const result = analyzeTestFile({ index: branchIndex, module, file: changedByPath.get(module.path)!, branchCommit, productionKeys, changedProductionKeys: new Set(changedDeclarations.keys()), literalOwners, addEvidence });
      testFileSlices.push(result.slice); unresolved.push(...result.unresolved);
      if (result.slice.includedUnits.length) included.set(`${module.path}#<file>`, { path: module.path, category: 'test', symbol: null, branchChangeId: `${branchCommit}:${module.path}:test-units`, wholeFile: false, reason: result.slice.mode === 'test-units' ? 'Only evidence-connected test units, support declarations, and import specifiers are required.' : 'Supported test units were identified, but unresolved test-file dependencies keep this inclusion partial.', evidenceEdgeIds: stable([id, ...result.slice.evidenceEdgeIds], value => value), confidence: result.slice.mode === 'test-units' ? 'exact' : 'unresolved' });
    }
    for (const path of new Set([...visited].map(key => branchIndex.declarationByKey.get(key)!.path))) { const module = branchIndex.moduleByPath.get(path)!; for (const issue of module.unresolved) unresolved.push({ path, symbol: null, reason: issue, edge: 'unresolved-static-analysis', manualNextStep: 'Resolve the module statically or choose a supported ancestor boundary.', ancestorBoundaryMayHelp: true }); }
    if (policy.strictExternal) {
      const cycle = cycleFrom(branchEdges, boundary.key);
      if (cycle) { const owner = branchIndex.declarationByKey.get(cycle[0]); unresolved.push({ path: owner?.path ?? boundary.path, symbol: owner?.name ?? boundary.name, reason: `Circular dependency is not safely handled by the external feature-slice profile: ${cycle.join(' -> ')}.`, edge: 'circular-dependency', manualNextStep: 'Remove the cycle or select a boundary whose required module graph is acyclic.', ancestorBoundaryMayHelp: true }); }
      const supportedRoot = policy.supportedSourceRoot!;
      for (const edge of branchEdges.filter(item => visited.has(item.from.key) && !item.to.path.startsWith(supportedRoot))) unresolved.push({ path: edge.to.path, symbol: edge.to.name, reason: `Dependency ${edge.to.key} is outside the supported ${supportedRoot} source boundary.`, edge: 'outside-supported-boundary', manualNextStep: `Move the dependency under ${supportedRoot} or choose a feature whose local graph stays within that boundary.`, ancestorBoundaryMayHelp: false });
      for (const key of visited) {
        const declaration = branchIndex.declarationByKey.get(key)!; const module = branchIndex.moduleByPath.get(declaration.path)!;
        for (const binding of module.imports.filter(item => item.resolvedPath && !item.resolvedPath.startsWith(supportedRoot) && (item.kind === 'style' || item.kind === 'side-effect' || declaration.dependencies.includes(item.local) || declaration.jsxReferences.includes(item.local)))) unresolved.push({ path: binding.resolvedPath!, symbol: binding.local || null, reason: `Dependency ${binding.resolvedPath} is outside the supported ${supportedRoot} source boundary.`, edge: 'outside-supported-boundary', manualNextStep: `Move the dependency under ${supportedRoot} or choose a feature whose local graph stays within that boundary.`, ancestorBoundaryMayHelp: false });
      }
    }
    for (const file of changedFiles.filter(item => item.status === 'deleted' || item.status === 'unsupported' || item.status === 'binary')) unresolved.push({ path: file.path, symbol: null, reason: `Changed file status ${file.status} is not safely sliceable.`, edge: 'unsupported-git-change', manualNextStep: 'Review this changed file manually before integration.', ancestorBoundaryMayHelp: false });
    const exclusions: ExcludedChange[] = [];
    for (const file of changedFiles) {
      if (/\.css$/.test(file.path)) { if (!included.has(`${file.path}#<file>`)) exclusions.push(this.excludedFile(branchCommit, file, 'not-reached-by-supported-analysis', 'unproven', 'The changed stylesheet was not connected by a supported static stylesheet import on the analyzed feature graph.')); continue; }
      const module = branchIndex.moduleByPath.get(file.path); if (!module) { if (!included.has(`${file.path}#<file>`)) exclusions.push(this.excludedFile(branchCommit, file, 'unsupported-analysis', 'unproven', 'The changed file type is outside the supported TypeScript, TSX, stylesheet, and asset index.')); continue; }
      const candidates = module.declarations.filter(item => file.status === 'added' || file.hunks.some(region => overlaps(region, item)));
      if (!candidates.length && !included.has(`${file.path}#<module>`) && !included.has(`${file.path}#<file>`)) exclusions.push(this.excludedFile(branchCommit, file, 'not-reached-by-supported-analysis', 'unproven', 'No supported changed declaration was mapped in this module.'));
      for (const declaration of candidates) if (!included.has(`${declaration.path}#${declaration.name}`) && !included.has(`${file.path}#<file>`)) { const reverseExisting = branchEdges.some(edge => edge.from.key === declaration.key && visited.has(edge.to.key) && baseEdgeKeys.has(edgeKey(edge))); const noIssues = module.unresolved.length === 0; exclusions.push({ path: file.path, symbol: symbol(declaration), branchChangeId: `${branchCommit}:${declaration.key}`, classification: reverseExisting && noIssues ? 'proven-unrelated' : noIssues ? 'proven-unrelated' : 'not-reached-by-supported-analysis', proof: noIssues ? 'proven' : 'unproven', reason: reverseExisting ? 'The component’s connection to the analyzed feature already exists unchanged in the merge base; this branch delta does not create that integration edge.' : 'The changed symbol is outside the analyzed boundary’s supported forward graph and no added reverse integration edge connects it.' }); }
    }
    const status = policy.strictExternal && (!boundaryResolved || unresolved.length) ? 'refused' : !boundaryResolved || unresolved.length ? 'partial' : 'resolved';
    const slice: FeatureSlice = { version: featureSliceVersion, repository: { baseRef: request.baseRef, branchRef: request.branchRef, mergeBaseCommit, branchCommit }, selection: request.selection, status, boundary: { original: seed.name, analyzed: boundary.name, status: !boundaryResolved ? 'unresolved' : boundary === seed ? 'selected-boundary-sufficient' : 'expanded-to-integration-boundary', reason: boundaryReason }, changedFiles, includedChanges: stable([...included.values()], item => `${item.path}:${item.symbol?.region.startLine ?? 0}:${item.symbol?.name ?? ''}`), excludedChanges: stable(exclusions, item => `${item.path}:${item.symbol?.region.startLine ?? 0}:${item.symbol?.name ?? ''}`), unresolvedDependencies: stable(unresolved, item => `${item.path}:${item.reason}`), testFileSlices: stable(testFileSlices, item => item.path), evidence: stable([...evidence.values()], item => item.id) };
    return this.artifact(slice);
  }
  private reverseModuleClosure(index: SourceIndex, targetPath: string) { const result = new Map<string, ModuleRecord>(); const queue = [targetPath]; while (queue.length) { const path = queue.shift()!; if (result.has(path)) continue; const module = index.moduleByPath.get(path); if (module) result.set(path, module); for (const importer of index.modules.filter(item => !item.isTest && item.imports.some(binding => binding.resolvedPath === path))) queue.push(importer.path); } return [...result.values()].sort((a,b) => a.path.localeCompare(b.path)); }
  private moduleReaches(index: SourceIndex, fromPath: string, targetPath: string) { const visited = new Set<string>(); const queue = [fromPath]; while (queue.length) { const path = queue.shift()!; if (path === targetPath) return true; if (visited.has(path)) continue; visited.add(path); const module = index.moduleByPath.get(path); if (module) for (const binding of module.imports) if (binding.resolvedPath && index.moduleByPath.has(binding.resolvedPath)) queue.push(binding.resolvedPath); } return false; }
  private excludedFile(branchCommit: string, file: ChangedFile, classification: ExcludedChange['classification'], proof: ExcludedChange['proof'], reason: string): ExcludedChange { return { path: file.path, symbol: null, branchChangeId: `${branchCommit}:${file.path}:file`, classification, proof, reason }; }
  private async artifact(slice: FeatureSlice): Promise<FeatureSliceArtifact> { const normalized = JSON.stringify(slice); const analysisId = createHash('sha256').update(normalized).digest('hex').slice(0, 16); const relativePath = `.ums/analysis/${analysisId}/feature-slice.json`; if (this.artifactRoot) { const directory = resolve(this.artifactRoot, '.ums', 'analysis', analysisId); await mkdir(directory, { recursive: true }); await writeFile(resolve(directory, 'feature-slice.json'), `${JSON.stringify(slice, null, 2)}\n`, 'utf8'); } return { analysisId, relativePath, slice }; }
}
