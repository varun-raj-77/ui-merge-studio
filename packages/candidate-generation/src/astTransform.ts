import { createHash } from 'node:crypto';
import generateModule from '@babel/generator';
import { parse } from '@babel/parser';
import traverseModule, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { ImportRequirement, TestFileSlice } from '../../source-analysis/src/types';
import type { ModuleRecord } from '../../source-analysis/src/sourceIndex';
import type { CandidateLiteral } from './types';
import type { JsxRegionProjectionEvidence } from './types';

const generate = ((generateModule as unknown as { default?: typeof generateModule }).default ?? generateModule);
const traverse = ((traverseModule as unknown as { default?: typeof traverseModule }).default ?? traverseModule);
function parserPlugins(path: string) { return path.endsWith('.tsx') || path.endsWith('.jsx') ? ['jsx','typescript'] as const : ['typescript'] as const; }
export function parseModule(code: string, path: string) { return parse(code, { sourceType: 'module', sourceFilename: path, plugins: [...parserPlugins(path), 'dynamicImport'] }); }
export function contentHashInput(value: string) { return value.replace(/\r\n/g, '\n'); }

function declaredName(node: t.Node | null | undefined): string | null {
  if (t.isFunctionDeclaration(node) || t.isTSInterfaceDeclaration(node) || t.isTSTypeAliasDeclaration(node) || t.isTSEnumDeclaration(node) || t.isClassDeclaration(node)) return node.id?.name ?? null;
  if (t.isVariableDeclaration(node) && node.declarations.length === 1 && t.isIdentifier(node.declarations[0].id)) return node.declarations[0].id.name;
  if (t.isVariableDeclarator(node) && t.isIdentifier(node.id)) return node.id.name;
  return null;
}
export function findDeclarationRange(code: string, path: string, name: string) {
  const ast = parseModule(code, path); let result: { start: number; end: number; startLine: number; endLine: number } | null = null;
  for (const statement of ast.program.body) {
    const node = t.isExportNamedDeclaration(statement) || t.isExportDefaultDeclaration(statement) ? statement.declaration : statement;
    if (declaredName(node) === name && node?.start != null && node.end != null) result = { start: node.start, end: node.end, startLine: node.loc?.start.line ?? 1, endLine: node.loc?.end.line ?? 1 };
  }
  return result;
}
export function replaceDeclaration(code: string, path: string, name: string, sourceDeclaration: string) {
  const range = findDeclarationRange(code, path, name); if (!range) throw new Error(`Target declaration ${name} was not found in ${path}.`);
  const next = `${code.slice(0, range.start)}${sourceDeclaration}${code.slice(range.end)}`; parseModule(next, path); return next;
}
export function insertDeclaration(code: string, path: string, sourceDeclaration: string) { const separator = code.endsWith('\n') ? '' : '\n'; const next = `${code}${separator}${sourceDeclaration}\n`; parseModule(next, path); return next; }

type JsxParentNode = t.JSXElement | t.JSXFragment;
type JsxChildNode = t.JSXElement['children'][number];

function structuralCode(node: t.Node) { return generate(node, { comments: false, compact: true }).code; }
function structuralHash(node: t.Node) { return createHash('sha256').update(structuralCode(node)).digest('hex').slice(0, 16); }
function jsxName(node: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName): string {
  if (t.isJSXIdentifier(node)) return node.name;
  if (t.isJSXMemberExpression(node)) return `${jsxName(node.object)}.${jsxName(node.property)}`;
  return `${node.namespace.name}:${node.name.name}`;
}
function parentName(node: JsxParentNode) { return t.isJSXFragment(node) ? '<fragment>' : jsxName(node.openingElement.name); }
function parentShellHash(node: JsxParentNode) { return structuralHash(t.isJSXFragment(node) ? t.jsxFragment(t.jsxOpeningFragment(), t.jsxClosingFragment(), []) : node.openingElement); }
function significantChildren(node: JsxParentNode) { return node.children.filter(child => !t.isJSXText(child) || child.value.trim().length > 0); }
function sourceRegion(node: t.Node) { return { startLine: node.loc?.start.line ?? 1, endLine: node.loc?.end.line ?? node.loc?.start.line ?? 1 }; }
function declarationNode(ast: ReturnType<typeof parseModule>, name: string) {
  for (const statement of ast.program.body) {
    const node = t.isExportNamedDeclaration(statement) || t.isExportDefaultDeclaration(statement) ? statement.declaration : statement;
    if (declaredName(node) === name) return node;
  }
  return null;
}
function inside(node: t.Node, owner: t.Node) { return node.start != null && node.end != null && owner.start != null && owner.end != null && node.start >= owner.start && node.end <= owner.end; }
function collectJsxElements(ast: ReturnType<typeof parseModule>, owner: t.Node) {
  const result: NodePath<t.JSXElement>[] = [];
  traverse(ast, { JSXElement(elementPath) { if (inside(elementPath.node, owner)) result.push(elementPath); } });
  return result;
}
function collectJsxParents(ast: ReturnType<typeof parseModule>, owner: t.Node) {
  const result: Array<NodePath<t.JSXElement> | NodePath<t.JSXFragment>> = [];
  traverse(ast, {
    JSXElement(elementPath) { if (inside(elementPath.node, owner)) result.push(elementPath); },
    JSXFragment(fragmentPath) { if (inside(fragmentPath.node, owner)) result.push(fragmentPath); }
  });
  return result;
}
function directJsxChild(selectedPath: NodePath<t.JSXElement>) {
  let current: NodePath = selectedPath;
  while (current.parentPath) {
    const parent = current.parentPath;
    if ((parent.isJSXElement() || parent.isJSXFragment()) && parent.node.children.includes(current.node as JsxChildNode)) {
      return { child: current, parent: parent as NodePath<t.JSXElement> | NodePath<t.JSXFragment> };
    }
    current = parent;
  }
  return null;
}
function requiredBindings(ast: ReturnType<typeof parseModule>, region: t.Node) {
  const result = new Set<string>();
  traverse(ast, {
    Identifier(identifierPath) { if (inside(identifierPath.node, region) && identifierPath.isReferencedIdentifier()) result.add(identifierPath.node.name); },
    JSXElement(elementPath) { if (!inside(elementPath.node, region)) return; const name = jsxName(elementPath.node.openingElement.name); if (/^[A-Z]/.test(name)) result.add(name.split('.', 1)[0]); }
  });
  return [...result].sort();
}
function whitespaceGap(code: string, start: number, end: number, description: string) {
  const gap = code.slice(start, end);
  if (!/^\s*$/.test(gap)) throw new Error(`${description} contains non-whitespace source between structurally matched JSX children.`);
  return gap;
}
function declarationOutsideParentHash(node: t.Node, shellHash: string) {
  const clone = t.cloneNode(node, true); let matches = 0;
  t.traverseFast(clone, child => {
    if ((t.isJSXElement(child) || t.isJSXFragment(child)) && parentShellHash(child) === shellHash) { child.children = []; matches++; }
  });
  if (matches !== 1) throw new Error(`JSX projection found ${matches} declaration parent shells while checking non-region integration structure; exactly one is required.`);
  return structuralHash(clone);
}

export function projectJsxRegion(baseCode: string, sourceCode: string, path: string, integrationName: string, renderedBoundary: { path: string; symbol: string }) {
  baseCode = contentHashInput(baseCode); sourceCode = contentHashInput(sourceCode);
  const baseAst = parseModule(baseCode, path); const sourceAst = parseModule(sourceCode, path);
  const baseDeclaration = declarationNode(baseAst, integrationName); const sourceDeclaration = declarationNode(sourceAst, integrationName);
  if (!baseDeclaration || !sourceDeclaration) throw new Error(`JSX projection requires ${integrationName} to exist in both base and source ASTs.`);
  const sourceMatches = collectJsxElements(sourceAst, sourceDeclaration).filter(item => jsxName(item.node.openingElement.name) === renderedBoundary.symbol);
  const baseMatches = collectJsxElements(baseAst, baseDeclaration).filter(item => jsxName(item.node.openingElement.name) === renderedBoundary.symbol);
  if (sourceMatches.length !== 1) throw new Error(`JSX projection found ${sourceMatches.length} source occurrences of rendered boundary ${renderedBoundary.symbol}; exactly one is required.`);
  if (baseMatches.length) throw new Error(`JSX projection expected added rendered boundary ${renderedBoundary.symbol}, but the base declaration already contains ${baseMatches.length} occurrence(s).`);
  const located = directJsxChild(sourceMatches[0]);
  if (!located) throw new Error(`Rendered boundary ${renderedBoundary.symbol} is not contained in a supported JSX child region.`);
  if (located.child !== sourceMatches[0]) throw new Error(`Selected JSX region ${renderedBoundary.symbol} overlaps an expression or enclosing child replacement; Phase 0 supports only direct-child insertion.`);
  const sourceChild = sourceMatches[0].node; const sourceParent = located.parent.node;
  const shellHash = parentShellHash(sourceParent);
  const baseParents = collectJsxParents(baseAst, baseDeclaration).filter(item => parentShellHash(item.node) === shellHash);
  if (baseParents.length !== 1) throw new Error(`JSX projection found ${baseParents.length} base parents matching the selected source parent; exactly one structural parent is required.`);
  const baseParent = baseParents[0].node; const sourceChildren = significantChildren(sourceParent); const baseChildren = significantChildren(baseParent);
  if (declarationOutsideParentHash(baseDeclaration, shellHash) !== declarationOutsideParentHash(sourceDeclaration, shellHash)) throw new Error(`JSX projection cannot preserve ${integrationName} because declaration structure outside the selected JSX parent also changed.`);
  const sourceIndex = sourceChildren.indexOf(sourceChild as JsxChildNode);
  if (sourceIndex < 0) throw new Error(`Selected JSX region is not a direct structural child of its source parent.`);
  const sourceFingerprints = sourceChildren.map(structuralHash); const baseFingerprints = baseChildren.map(structuralHash); const selectedFingerprint = structuralHash(sourceChild);
  const excludedSourceSiblingCount = sourceFingerprints.filter((fingerprint, index) => index !== sourceIndex && !baseFingerprints.includes(fingerprint)).length;
  let anchor: JsxRegionProjectionEvidence['anchor']; let baseTarget: JsxChildNode | null = null; let next = '';
  {
    const previous = [...sourceFingerprints.slice(0, sourceIndex)].map((fingerprint, index) => ({ fingerprint, sourceIndex: index })).reverse().find(item => baseFingerprints.filter(value => value === item.fingerprint).length === 1);
    const following = sourceFingerprints.slice(sourceIndex + 1).map((fingerprint, index) => ({ fingerprint, sourceIndex: sourceIndex + 1 + index })).find(item => baseFingerprints.filter(value => value === item.fingerprint).length === 1);
    const previousBaseIndex = previous ? baseFingerprints.indexOf(previous.fingerprint) : -1; const followingBaseIndex = following ? baseFingerprints.indexOf(following.fingerprint) : -1;
    if (previous && following && previousBaseIndex >= followingBaseIndex) throw new Error(`JSX insertion anchors appear in an incompatible order in the base parent.`);
    const snippet = sourceCode.slice(sourceChild.start!, sourceChild.end!);
    if (following) {
      baseTarget = baseChildren[followingBaseIndex]; const priorEnd = followingBaseIndex ? baseChildren[followingBaseIndex - 1].end! : t.isJSXElement(baseParent) ? baseParent.openingElement.end! : baseParent.openingFragment.end!;
      const gap = whitespaceGap(baseCode, priorEnd, baseTarget.start!, 'JSX insertion anchor'); next = `${baseCode.slice(0, baseTarget.start!)}${snippet}${gap}${baseCode.slice(baseTarget.start!)}`;
      anchor = { side: 'before', structuralHash: structuralHash(baseTarget) };
    } else if (previous) {
      baseTarget = baseChildren[previousBaseIndex]; const nextStart = previousBaseIndex + 1 < baseChildren.length ? baseChildren[previousBaseIndex + 1].start! : t.isJSXElement(baseParent) ? baseParent.closingElement!.start! : baseParent.closingFragment.start!;
      const gap = whitespaceGap(baseCode, baseTarget.end!, nextStart, 'JSX insertion anchor'); next = `${baseCode.slice(0, baseTarget.end!)}${gap}${snippet}${baseCode.slice(baseTarget.end!)}`;
      anchor = { side: 'after', structuralHash: structuralHash(baseTarget) };
    } else if (!baseChildren.length && sourceChildren.length === 1) {
      const closeStart = t.isJSXElement(baseParent) ? baseParent.closingElement!.start! : baseParent.closingFragment.start!; const openEnd = t.isJSXElement(baseParent) ? baseParent.openingElement.end! : baseParent.openingFragment.end!;
      const gap = whitespaceGap(baseCode, openEnd, closeStart, 'Empty JSX parent'); next = `${baseCode.slice(0, closeStart)}${snippet}${gap}${baseCode.slice(closeStart)}`;
      anchor = { side: 'only-child', structuralHash: null };
    } else throw new Error(`JSX insertion has no unique unchanged sibling anchor in the base parent.`);
  }
  parseModule(next, path);
  const evidence: JsxRegionProjectionEvidence = {
    mode: 'insert-child',
    renderedBoundary,
    integrationBoundary: { path, symbol: integrationName },
    sourceNode: { kind: 'JSXElement', name: renderedBoundary.symbol, region: sourceRegion(sourceChild), structuralHash: selectedFingerprint },
    baseParent: { kind: baseParent.type as 'JSXElement' | 'JSXFragment', name: parentName(baseParent), region: sourceRegion(baseParent), structuralHash: shellHash },
    baseTarget: { region: baseTarget ? sourceRegion(baseTarget) : null, structuralHash: baseTarget ? structuralHash(baseTarget) : null },
    anchor,
    requiredBindings: requiredBindings(sourceAst, sourceChild),
    excludedSourceSiblingCount
  };
  return { code: next, evidence, sourceSnippet: sourceCode.slice(sourceChild.start!, sourceChild.end!) };
}

function literalNode(value: CandidateLiteral): t.Expression {
  if (value === null) return t.nullLiteral();
  if (typeof value === 'string') return t.stringLiteral(value);
  if (typeof value === 'number') return t.numericLiteral(value);
  if (typeof value === 'boolean') return t.booleanLiteral(value);
  if (Array.isArray(value)) return t.arrayExpression(value.map(literalNode));
  return t.objectExpression(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => t.objectProperty(t.stringLiteral(key), literalNode(item))));
}

export function configureExportedConst(code: string, path: string, name: string, value: CandidateLiteral) {
  const ast = parseModule(code, path);
  let configured = false;
  traverse(ast, {
    VariableDeclarator(declarationPath) {
      if (!t.isIdentifier(declarationPath.node.id, { name })) return;
      if (configured) throw new Error(`Configured declaration ${name} is duplicated in ${path}.`);
      const declaration = declarationPath.parentPath;
      const exported = declaration.parentPath;
      if (!declaration.isVariableDeclaration({ kind: 'const' }) || !exported?.isExportNamedDeclaration()) {
        throw new Error(`Configured declaration ${name} in ${path} must be an exported const.`);
      }
      const current = t.isTSAsExpression(declarationPath.node.init)
        ? declarationPath.node.init.expression
        : declarationPath.node.init;
      const compatibleShape = Array.isArray(value)
        ? t.isArrayExpression(current)
        : value !== null && typeof value === 'object'
          ? t.isObjectExpression(current) && Object.keys(value).every(key => current.properties.some(property => (
            t.isObjectProperty(property)
              && !property.computed
              && ((t.isIdentifier(property.key) && property.key.name === key)
                || (t.isStringLiteral(property.key) && property.key.value === key))
          )))
          : Boolean(current) && (
            (typeof value === 'string' && t.isStringLiteral(current))
            || (typeof value === 'number' && t.isNumericLiteral(current))
            || (typeof value === 'boolean' && t.isBooleanLiteral(current))
            || (value === null && t.isNullLiteral(current))
          );
      if (!compatibleShape) {
        throw new Error(`Configured declaration ${name} in ${path} has an incompatible source shape.`);
      }
      const next = literalNode(value);
      declarationPath.node.init = t.isTSAsExpression(declarationPath.node.init)
        ? t.tsAsExpression(next, declarationPath.node.init.typeAnnotation)
        : next;
      configured = true;
    }
  });
  if (!configured) throw new Error(`Configured declaration ${name} was not found in ${path}.`);
  const output = `${generate(ast, { comments: true, compact: false, retainLines: false }).code}\n`;
  parseModule(output, path);
  return output;
}

function importKey(requirement: ImportRequirement) { return `${requirement.source}:${requirement.kind}:${requirement.imported}:${requirement.local}`; }
function importSpecifier(requirement: ImportRequirement) {
  if (requirement.kind === 'default') return t.importDefaultSpecifier(t.identifier(requirement.local));
  if (requirement.kind === 'namespace') return t.importNamespaceSpecifier(t.identifier(requirement.local));
  const imported = t.isValidIdentifier(requirement.imported) ? t.identifier(requirement.imported) : t.stringLiteral(requirement.imported);
  const specifier = t.importSpecifier(t.identifier(requirement.local), imported); if (requirement.kind === 'type') specifier.importKind = 'type'; return specifier;
}
function buildImport(requirement: ImportRequirement) { const node = t.importDeclaration(requirement.local ? [importSpecifier(requirement)] : [], t.stringLiteral(requirement.source)); if (requirement.kind === 'type' && requirement.imported === '*') node.importKind = 'type'; return node; }
function equivalentSpecifier(node: t.ImportDeclaration, requirement: ImportRequirement) {
  if (node.source.value !== requirement.source) return false;
  if (!requirement.local) return node.specifiers.length === 0;
  return node.specifiers.some(specifier => {
    if (specifier.local.name !== requirement.local) return false;
    if (t.isImportDefaultSpecifier(specifier)) return requirement.imported === 'default';
    if (t.isImportNamespaceSpecifier(specifier)) return requirement.imported === '*';
    const imported = t.isIdentifier(specifier.imported) ? specifier.imported.name : specifier.imported.value;
    return imported === requirement.imported && (requirement.kind !== 'type' || specifier.importKind === 'type' || node.importKind === 'type');
  });
}
export function reconcileImport(code: string, path: string, requirement: ImportRequirement) {
  const ast = parseModule(code, path); const declarations = ast.program.body.filter((node): node is t.ImportDeclaration => t.isImportDeclaration(node));
  if (declarations.some(node => equivalentSpecifier(node, requirement))) return code;
  if (requirement.local) {
    for (const node of declarations) for (const specifier of node.specifiers) if (specifier.local.name === requirement.local) throw new Error(`Import local ${requirement.local} conflicts in ${path}.`);
  }
  const compatible = declarations.find(node => node.source.value === requirement.source && requirement.local && requirement.kind !== 'namespace' && !node.specifiers.some(specifier => t.isImportNamespaceSpecifier(specifier)));
  if (compatible) {
    compatible.specifiers.push(importSpecifier(requirement)); compatible.specifiers.sort((a,b) => a.local.name.localeCompare(b.local.name));
    const replacement = generate(compatible, { comments: true, compact: true }).code;
    const next = `${code.slice(0, compatible.start!)}${replacement}${code.slice(compatible.end!)}`; parseModule(next, path); return next;
  }
  const statement = generate(buildImport(requirement), { comments: true, compact: true }).code;
  const offset = declarations.length ? declarations[declarations.length - 1].end! : 0;
  const prefix = offset === 0 ? '' : '\n'; const suffix = offset === 0 && code.length ? '\n' : '';
  const next = `${code.slice(0, offset)}${prefix}${statement}${suffix}${code.slice(offset)}`; parseModule(next, path); return next;
}
export function reconcileExport(code: string, path: string, name: string, source: string, imported=name) {
  const ast = parseModule(code, path); const existing = ast.program.body.filter((node): node is t.ExportNamedDeclaration => t.isExportNamedDeclaration(node)).some(node => node.source?.value === source && node.specifiers.some(specifier => {
    if (!t.isExportSpecifier(specifier)) return false;
    const exported = t.isIdentifier(specifier.exported) ? specifier.exported.name : t.isStringLiteral(specifier.exported) ? specifier.exported.value : null;
    const local = specifier.local.name;
    return exported === name && local === imported;
  }));
  if (existing) return code;
  const statement = `export { ${imported}${imported===name?'':` as ${name}`} } from ${JSON.stringify(source)};`; const next = `${code}${code.endsWith('\n') ? '' : '\n'}${statement}\n`; parseModule(next, path); return next;
}

export function reconstructAddedModule(source: string, path: string, module: ModuleRecord, includedNames: string[]) {
  const ast = parseModule(source, path); const included = new Set(includedNames); const requiredBindings = new Set<string>();
  for (const declaration of module.declarations.filter(item => included.has(item.name))) for (const dependency of [...declaration.dependencies,...declaration.jsxReferences]) requiredBindings.add(dependency.split('.',1)[0]);
  const filtered: t.Statement[] = [];
  for (const statement of ast.program.body) {
    if (t.isImportDeclaration(statement)) {
      const keep = statement.specifiers.filter(specifier => requiredBindings.has(specifier.local.name));
      if (!statement.specifiers.length || keep.length) { statement.specifiers = keep; filtered.push(statement); }
      continue;
    }
    if (t.isExportNamedDeclaration(statement) || t.isExportDefaultDeclaration(statement)) {
      const declaration = statement.declaration;
      if (declaration && declaredName(declaration)) { if (included.has(declaredName(declaration)!)) filtered.push(statement); continue; }
      if (t.isExportNamedDeclaration(statement)) { statement.specifiers = statement.specifiers.filter(specifier => t.isExportSpecifier(specifier) && included.has(t.isIdentifier(specifier.exported) ? specifier.exported.name : specifier.exported.value)); if (statement.specifiers.length) filtered.push(statement); }
      continue;
    }
    if (t.isVariableDeclaration(statement)) { statement.declarations = statement.declarations.filter(item => t.isIdentifier(item.id) && included.has(item.id.name)); if (statement.declarations.length) filtered.push(statement); continue; }
    const name = declaredName(statement); if (!name || included.has(name)) filtered.push(statement);
  }
  ast.program.body = filtered; const output = `${generate(ast,{comments:true,compact:false,retainLines:false}).code}\n`; parseModule(output,path);
  for (const name of included) if (!findDeclarationRange(output,path,name)) throw new Error(`Included declaration ${name} is missing after reconstructing ${path}.`);
  return output;
}

function testCall(node: t.CallExpression, parent: t.Node | null | undefined): { kind: string } | null {
  if (t.isIdentifier(node.callee) && ['describe','test','it','beforeEach','afterEach','beforeAll','afterAll'].includes(node.callee.name)) return { kind: node.callee.name };
  if (t.isMemberExpression(node.callee) && !node.callee.computed && t.isIdentifier(node.callee.object) && t.isIdentifier(node.callee.property) && ['describe','test','it'].includes(node.callee.object.name)) { if (node.callee.property.name === 'each' && t.isCallExpression(parent) && parent.callee === node) return null; if (['each','concurrent','skip','only'].includes(node.callee.property.name)) return { kind: node.callee.object.name }; }
  if (t.isCallExpression(node.callee) && t.isMemberExpression(node.callee.callee) && !node.callee.callee.computed && t.isIdentifier(node.callee.callee.object) && ['test','it'].includes(node.callee.callee.object.name) && t.isIdentifier(node.callee.callee.property, { name: 'each' })) return { kind: node.callee.callee.object.name };
  return null;
}
function unitId(path: string, node: t.CallExpression, kind: string) { return `${path}#${kind}@${node.loc?.start.line ?? 1}:${node.loc?.start.column ?? 0}`; }
function groupedImports(requirements: ImportRequirement[]) {
  const result: t.ImportDeclaration[] = [];
  for (const requirement of [...new Map(requirements.map(item => [importKey(item), item])).values()].sort((a,b) => importKey(a).localeCompare(importKey(b)))) {
    const compatible = result.find(node => node.source.value === requirement.source && requirement.local && requirement.kind !== 'namespace' && !node.specifiers.some(specifier => t.isImportNamespaceSpecifier(specifier)));
    if (compatible) compatible.specifiers.push(importSpecifier(requirement)); else result.push(buildImport(requirement));
  }
  for (const node of result) node.specifiers.sort((a,b) => a.local.name.localeCompare(b.local.name));
  return result.sort((a,b) => a.source.value.localeCompare(b.source.value));
}
export function reconstructTestModule(source: string, path: string, module: ModuleRecord, slice: TestFileSlice) {
  if (slice.mode !== 'test-units') throw new Error(`Test file ${path} is not safely reconstructable in ${slice.mode} mode.`);
  const ast = parseModule(source, path); const included = new Set(slice.includedUnits.map(item => item.id)); const requiredSupport = new Set(slice.requiredSupportDeclarations.map(item => `${item.name}:${item.region.startLine}`));
  traverse(ast, { CallExpression: { exit(callPath: NodePath<t.CallExpression>) { const match = testCall(callPath.node, callPath.parent); if (!match || included.has(unitId(path, callPath.node, match.kind))) return; const statement = callPath.findParent(parent => parent.isExpressionStatement()); if (statement) statement.remove(); else throw new Error(`Unsupported nested test registration in ${path}.`); } } });
  const supportByStart = new Map(module.declarations.map(item => [`${item.name}:${item.startLine}`, item]));
  traverse(ast, {
    FunctionDeclaration(declarationPath) { const name = declarationPath.node.id?.name; const key = name ? `${name}:${declarationPath.node.loc?.start.line ?? 1}` : ''; if (supportByStart.has(key) && !requiredSupport.has(key)) declarationPath.remove(); },
    VariableDeclarator(declarationPath) { if (!t.isIdentifier(declarationPath.node.id)) return; const key = `${declarationPath.node.id.name}:${declarationPath.node.loc?.start.line ?? 1}`; if (!supportByStart.has(key) || requiredSupport.has(key)) return; const declaration = declarationPath.parentPath; declarationPath.remove(); if (declaration.isVariableDeclaration() && declaration.node.declarations.length === 0) declaration.remove(); }
  });
  ast.program.body = [...groupedImports(slice.requiredImports), ...ast.program.body.filter(statement => !t.isImportDeclaration(statement))];
  const output = `${generate(ast, { comments: true, compact: false, retainLines: false }).code}\n`; parseModule(output, path);
  for (const excluded of slice.excludedUnits.filter(item => item.kind === 'test' || item.kind === 'it')) if (excluded.title && output.includes(excluded.title)) throw new Error(`Excluded test ${excluded.title} remains in ${path}.`);
  return output;
}
