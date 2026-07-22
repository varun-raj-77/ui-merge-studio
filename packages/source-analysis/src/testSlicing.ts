import { resolveImportedDeclaration, type DeclarationRecord, type ModuleRecord, type SourceIndex, type TestUnitRecord } from './sourceIndex';
import type { ChangedFile, ExcludedTestUnit, ImportRequirement, SliceEvidence, SourceRegion, SupportDeclaration, TestFileSlice, TestUnitChange, UnresolvedDependency } from './types';

interface TestSlicingInput {
  index: SourceIndex;
  module: ModuleRecord;
  file: ChangedFile;
  branchCommit: string;
  productionKeys: Set<string>;
  changedProductionKeys: Set<string>;
  literalOwners: Map<string, Set<string>>;
  addEvidence: (type: SliceEvidence['type'], from: string, to: string, detail: string, baseState: SliceEvidence['baseState']) => string;
}
export interface TestSlicingResult { slice: TestFileSlice; unresolved: UnresolvedDependency[] }

function stable<T>(items: T[], key: (item: T) => string) { return [...items].sort((a,b) => key(a).localeCompare(key(b))); }
function region(unit: TestUnitRecord): SourceRegion { return { startLine: unit.startLine, endLine: unit.endLine }; }
function overlaps(left: SourceRegion, right: SourceRegion) { return left.startLine <= right.endLine && left.endLine >= right.startLine; }
function changedHunks(file: ChangedFile, unit: TestUnitRecord) { return file.status === 'added' ? [region(unit)] : file.hunks.filter(hunk => overlaps(hunk, region(unit))); }
function importFor(module: ModuleRecord, dependency: string) { const local = dependency.split('.', 1)[0]; return module.imports.find(item => item.local === local); }
function importRequirement(module: ModuleRecord, dependency: string, reason: string): ImportRequirement | null { const binding = importFor(module, dependency); return binding ? { source: binding.source, local: binding.local, imported: binding.imported, kind: binding.kind, reason } : null; }
function supportKind(declaration: DeclarationRecord): SupportDeclaration['kind'] { return declaration.kind === 'function' || declaration.kind === 'component' ? 'helper' : 'constant'; }

export function analyzeTestFile(input: TestSlicingInput): TestSlicingResult {
  const { index, module, file, productionKeys, changedProductionKeys, literalOwners, addEvidence } = input;
  const changedUnits = module.testUnits.filter(unit => file.status === 'added' || changedHunks(file, unit).length > 0);
  const tests = changedUnits.filter(unit => unit.kind === 'test' || unit.kind === 'it');
  const includedTests = new Map<string, { unit: TestUnitRecord; edgeIds: string[]; reason: string }>();
  const excludedTests = new Map<string, ExcludedTestUnit>();
  const dependencyTargets = (dependencies: string[]) => {
    const targets: DeclarationRecord[] = []; const seenSupport = new Set<string>(); const queue = [...dependencies];
    while (queue.length) { const dependency = queue.shift()!; const local = module.declarations.find(item => item.name === dependency); if (local && !seenSupport.has(local.key)) { seenSupport.add(local.key); queue.push(...local.dependencies, ...local.jsxReferences); continue; } const target = resolveImportedDeclaration(index, module, dependency); if (target) targets.push(target); }
    return targets;
  };

  for (const unit of tests) {
    const directTargets = dependencyTargets(unit.dependencies);
    const direct = directTargets.find(target => productionKeys.has(target.key));
    const literal = unit.staticLiterals.find(value => value.length >= 4 && literalOwners.has(value) && [...literalOwners.get(value)!].every(key => productionKeys.has(key)));
    if (direct) {
      const id = addEvidence('test-unit', direct.key, unit.key, `${unit.kind} at line ${unit.startLine} statically references included production symbol ${direct.name}.`, 'added');
      includedTests.set(unit.key, { unit, edgeIds: [id], reason: `This changed ${unit.kind} directly references included production symbol ${direct.name}.` });
    } else if (literal) {
      const owners = [...literalOwners.get(literal)!].sort();
      const ids = owners.map(owner => addEvidence('test-ui-contract', owner, unit.key, `${unit.kind} at line ${unit.startLine} references an exact UI contract literal uniquely owned by the analyzed production graph.`, 'added'));
      includedTests.set(unit.key, { unit, edgeIds: ids, reason: 'This changed test asserts an exact UI contract exposed uniquely by reachable production declarations.' });
    } else {
      const id = addEvidence('excluded-test-unit', unit.key, [...productionKeys].sort()[0] ?? '<boundary>', `Changed ${unit.kind} at line ${unit.startLine} has no supported symbol or unique UI-contract edge to the analyzed feature.`, 'added');
      excludedTests.set(unit.key, { id: unit.key, kind: unit.kind, title: unit.title, region: region(unit), changedHunks: changedHunks(file, unit), reason: 'The changed test has no supported static symbol or unique UI-contract edge to the analyzed feature.', evidenceEdgeIds: [id], confidence: 'exact', enclosingDescribeIds: unit.enclosingDescribeKeys, proof: module.unresolved.length ? 'unproven' : 'proven' });
    }
  }

  const includedUnitRecords = new Map<string, TestUnitRecord>();
  for (const item of includedTests.values()) includedUnitRecords.set(item.unit.key, item.unit);
  for (const item of includedTests.values()) {
    for (const describeKey of item.unit.enclosingDescribeKeys) { const describe = module.testUnits.find(unit => unit.key === describeKey); if (describe) includedUnitRecords.set(describe.key, describe); }
    for (const hook of module.testUnits.filter(unit => ['beforeEach','afterEach','beforeAll','afterAll'].includes(unit.kind) && (!unit.parentDescribeKey || item.unit.enclosingDescribeKeys.includes(unit.parentDescribeKey)))) includedUnitRecords.set(hook.key, hook);
  }
  for (const unit of changedUnits.filter(item => item.kind !== 'test' && item.kind !== 'it' && !includedUnitRecords.has(item.key))) {
    const supportsExcluded = [...excludedTests.values()].some(item => unit.kind === 'describe' ? item.enclosingDescribeIds.includes(unit.key) : !unit.parentDescribeKey || item.enclosingDescribeIds.includes(unit.parentDescribeKey));
    if (!supportsExcluded) continue;
    const id = addEvidence('excluded-test-unit', unit.key, [...productionKeys].sort()[0] ?? '<boundary>', `Changed ${unit.kind} at line ${unit.startLine} scopes only excluded tests.`, 'added');
    excludedTests.set(unit.key, { id: unit.key, kind: unit.kind, title: unit.title, region: region(unit), changedHunks: changedHunks(file, unit), reason: `The changed ${unit.kind} is structurally scoped only to excluded test units.`, evidenceEdgeIds: [id], confidence: 'exact', enclosingDescribeIds: unit.enclosingDescribeKeys, proof: module.unresolved.length ? 'unproven' : 'proven' });
  }

  const requiredSupport = new Map<string, DeclarationRecord>();
  const supportQueue = [...includedUnitRecords.values()].flatMap(unit => unit.dependencies);
  while (supportQueue.length) {
    const dependency = supportQueue.shift()!;
    const declaration = module.declarations.find(item => item.name === dependency);
    if (!declaration || requiredSupport.has(declaration.key)) continue;
    requiredSupport.set(declaration.key, declaration); supportQueue.push(...declaration.dependencies, ...declaration.jsxReferences);
  }

  const requiredImports = new Map<string, ImportRequirement>();
  const excludedImports = new Map<string, ImportRequirement>();
  const requiredDependencies = [...includedUnitRecords.values()].flatMap(unit => unit.dependencies).concat([...requiredSupport.values()].flatMap(item => [...item.dependencies, ...item.jsxReferences]));
  for (const dependency of requiredDependencies) { const requirement = importRequirement(module, dependency, 'Referenced by an included test unit, scoped hook, or required support declaration.'); if (requirement) requiredImports.set(`${requirement.source}:${requirement.local}:${requirement.imported}`, requirement); }
  for (const item of excludedTests.values()) {
    const unit = module.testUnits.find(candidate => candidate.key === item.id)!;
    for (const dependency of unit.dependencies) { const requirement = importRequirement(module, dependency, 'Referenced only by excluded test units.'); const key = requirement ? `${requirement.source}:${requirement.local}:${requirement.imported}` : ''; if (requirement && !requiredImports.has(key)) excludedImports.set(key, requirement); }
  }

  const includedUnits: TestUnitChange[] = [];
  const sliceEvidence = new Set<string>();
  for (const unit of includedUnitRecords.values()) {
    const test = includedTests.get(unit.key); let reason = test?.reason ?? '';
    const edgeIds = test ? [...test.edgeIds] : [];
    if (unit.kind === 'describe') { const id = addEvidence('test-enclosure', unit.key, [...includedTests.keys()].sort()[0] ?? unit.key, `The describe at line ${unit.startLine} encloses an included changed test.`, file.status === 'added' ? 'added' : 'existing'); edgeIds.push(id); reason = 'Required structural describe wrapper for an included descendant test.'; }
    if (['beforeEach','afterEach','beforeAll','afterAll'].includes(unit.kind)) { const id = addEvidence('test-hook', unit.key, [...includedTests.keys()].sort()[0] ?? unit.key, `${unit.kind} at line ${unit.startLine} applies lexically to an included test.`, file.status === 'added' ? 'added' : 'existing'); edgeIds.push(id); reason = 'Lifecycle hook applies lexically to an included test and is required as scoped setup.'; }
    edgeIds.forEach(id => sliceEvidence.add(id));
    includedUnits.push({ id: unit.key, kind: unit.kind, title: unit.title, region: region(unit), changedHunks: changedHunks(file, unit), reason, evidenceEdgeIds: stable(edgeIds, value => value), confidence: 'exact', enclosingDescribeIds: unit.enclosingDescribeKeys });
  }

  const supportDeclarations: SupportDeclaration[] = [];
  for (const declaration of requiredSupport.values()) { const target = [...includedTests.keys()].sort()[0] ?? module.path; const declarationRegion = { startLine: declaration.startLine, endLine: declaration.endLine }; const id = addEvidence('test-support', target, declaration.key, `${declaration.name} is statically referenced by included test/setup code.`, file.status === 'added' ? 'added' : 'existing'); sliceEvidence.add(id); supportDeclarations.push({ name: declaration.name, kind: supportKind(declaration), region: declarationRegion, changedHunks: file.status === 'added' ? [declarationRegion] : file.hunks.filter(hunk => overlaps(hunk, declarationRegion)), reason: 'Transitively required local support declaration.', evidenceEdgeIds: [id], confidence: 'exact' }); }
  for (const requirement of requiredImports.values()) { const id = addEvidence('test-import', module.path, `${requirement.source}#${requirement.imported}`, `Import specifier ${requirement.local} is referenced by included test/setup/support code.`, file.status === 'added' ? 'added' : 'existing'); sliceEvidence.add(id); }
  for (const item of excludedTests.values()) item.evidenceEdgeIds.forEach(id => sliceEvidence.add(id));

  const unresolved: UnresolvedDependency[] = module.unresolved.map(reason => ({ path: module.path, symbol: null, reason, edge: 'unsupported-test-analysis', manualNextStep: 'Rewrite the test with supported static test declarations and dependencies, or review the file manually.', ancestorBoundaryMayHelp: false }));
  const topLevelHooks = [...includedUnitRecords.values()].filter(unit => ['beforeEach','afterEach','beforeAll','afterAll'].includes(unit.kind) && !unit.parentDescribeKey);
  for (const hook of topLevelHooks) {
    const targets = dependencyTargets(hook.dependencies);
    if (targets.some(target => productionKeys.has(target.key)) && targets.some(target => changedProductionKeys.has(target.key) && !productionKeys.has(target.key)) && excludedTests.size) unresolved.push({ path: module.path, symbol: hook.kind, reason: `Top-level ${hook.kind} contains inseparable setup for included and excluded changed production graphs.`, edge: 'ambiguous-shared-setup', manualNextStep: 'Split the setup into lexically scoped hooks before attempting test-unit reconstruction.', ancestorBoundaryMayHelp: false });
  }
  if (file.status !== 'added') for (const hunk of file.hunks) {
    const touchedIncluded = includedUnits.some(unit => overlaps(hunk, unit.region)); const touchedExcluded = [...excludedTests.values()].some(unit => overlaps(hunk, unit.region));
    if (touchedIncluded && touchedExcluded) unresolved.push({ path: module.path, symbol: null, reason: `Git hunk ${hunk.startLine}-${hunk.endLine} ambiguously spans included and excluded test units.`, edge: 'ambiguous-test-hunk', manualNextStep: 'Separate the test edits into independently mappable declarations.', ancestorBoundaryMayHelp: false });
  }
  if (!tests.length) unresolved.push({ path: module.path, symbol: null, reason: 'No supported changed test or it declarations were indexed in this related test module.', edge: 'unsupported-test-factory', manualNextStep: 'Use supported test/it/describe syntax or review the entire test file manually.', ancestorBoundaryMayHelp: false });

  const mode: TestFileSlice['mode'] = unresolved.length ? (tests.length ? 'partial' : 'refused') : 'test-units';
  return { slice: { path: module.path, mode, includedUnits: stable(includedUnits, unit => `${unit.region.startLine}:${unit.id}`), excludedUnits: stable([...excludedTests.values()], unit => `${unit.region.startLine}:${unit.id}`), requiredImports: stable([...requiredImports.values()], item => `${item.source}:${item.imported}:${item.local}`), excludedImports: stable([...excludedImports.values()], item => `${item.source}:${item.imported}:${item.local}`), requiredSupportDeclarations: stable(supportDeclarations, item => `${item.region.startLine}:${item.name}`), unresolvedDependencies: stable(unresolved, item => `${item.path}:${item.reason}`), evidenceEdgeIds: stable([...sliceEvidence], value => value) }, unresolved: stable(unresolved, item => `${item.path}:${item.reason}`) };
}
