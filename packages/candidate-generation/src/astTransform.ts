import generateModule from '@babel/generator';
import { parse } from '@babel/parser';
import traverseModule, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { ImportRequirement, TestFileSlice } from '../../source-analysis/src/types';
import type { ModuleRecord } from '../../source-analysis/src/sourceIndex';

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
