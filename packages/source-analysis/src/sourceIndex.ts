import { posix } from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { GitSourceRepository } from './gitModel';

const babelTraverse = ((traverse as unknown as { default?: typeof traverse }).default ?? traverse);
export type DeclarationKind = 'function' | 'component' | 'variable' | 'interface' | 'type' | 'enum';
export interface ImportBinding { local: string; imported: string; source: string; resolvedPath: string | null; kind: 'value' | 'type' | 'default' | 'namespace' | 'side-effect' | 'style' | 'asset'; }
export interface DeclarationRecord { key: string; path: string; name: string; kind: DeclarationKind; startLine: number; endLine: number; start: number; end: number; exported: boolean; defaultExport: boolean; dependencies: string[]; jsxReferences: string[]; staticLiterals: string[] }
export type IndexedTestUnitKind = 'describe' | 'test' | 'it' | 'beforeEach' | 'afterEach' | 'beforeAll' | 'afterAll';
export interface TestUnitRecord { key: string; path: string; kind: IndexedTestUnitKind; title: string | null; modifier: string | null; startLine: number; endLine: number; start: number; end: number; callbackStart: number; callbackEnd: number; parentDescribeKey: string | null; enclosingDescribeKeys: string[]; dependencies: string[]; staticLiterals: string[] }
export interface ReExportRecord { exported: string; imported: string; source: string; resolvedPath: string | null }
export interface ModuleRecord { path: string; imports: ImportBinding[]; declarations: DeclarationRecord[]; testUnits: TestUnitRecord[]; reExports: ReExportRecord[]; unresolved: string[]; isTest: boolean }
export interface SourceIndex { commit: string; modules: ModuleRecord[]; moduleByPath: Map<string, ModuleRecord>; declarationByKey: Map<string, DeclarationRecord> }

const sourceExtensions = ['.ts','.tsx','.js','.jsx'];
const assetExtensions = new Set(['.svg','.png','.jpg','.jpeg','.gif','.webp','.woff','.woff2']);
function resolveModule(fromPath: string, source: string, files: Set<string>) {
  if (!source.startsWith('.')) return null;
  const raw = posix.normalize(posix.join(posix.dirname(fromPath), source));
  const candidates = [raw, ...sourceExtensions.map(extension => raw + extension), ...sourceExtensions.map(extension => posix.join(raw, `index${extension}`))];
  return candidates.find(candidate => files.has(candidate)) ?? null;
}
function declarationKind(node: t.Node, name: string): DeclarationKind { if (t.isTSInterfaceDeclaration(node)) return 'interface'; if (t.isTSTypeAliasDeclaration(node)) return 'type'; if (t.isTSEnumDeclaration(node)) return 'enum'; if (t.isVariableDeclarator(node)) return /^[A-Z]/.test(name) && (t.isArrowFunctionExpression(node.init) || t.isFunctionExpression(node.init)) ? 'component' : 'variable'; return /^[A-Z]/.test(name) ? 'component' : 'function'; }
function declarationFrom(node: t.Node, path: string, name: string, exported: boolean, defaultExport: boolean): DeclarationRecord { return { key: `${path}#${name}`, path, name, kind: declarationKind(node, name), startLine: node.loc?.start.line ?? 1, endLine: node.loc?.end.line ?? node.loc?.start.line ?? 1, start: node.start ?? 0, end: node.end ?? 0, exported, defaultExport, dependencies: [], jsxReferences: [], staticLiterals: [] }; }

function directTestCall(node: t.CallExpression, parent: t.Node | null | undefined): { kind: IndexedTestUnitKind; modifier: string | null } | null {
  if (t.isIdentifier(node.callee) && ['describe','test','it','beforeEach','afterEach','beforeAll','afterAll'].includes(node.callee.name)) return { kind: node.callee.name as IndexedTestUnitKind, modifier: null };
  if (t.isMemberExpression(node.callee) && !node.callee.computed && t.isIdentifier(node.callee.object) && t.isIdentifier(node.callee.property) && ['describe','test','it'].includes(node.callee.object.name)) {
    if (node.callee.property.name === 'each' && t.isCallExpression(parent) && parent.callee === node) return null;
    if (['each','concurrent','skip','only'].includes(node.callee.property.name)) return { kind: node.callee.object.name as IndexedTestUnitKind, modifier: node.callee.property.name };
    return null;
  }
  if (t.isCallExpression(node.callee) && t.isMemberExpression(node.callee.callee) && !node.callee.callee.computed && t.isIdentifier(node.callee.callee.object) && t.isIdentifier(node.callee.callee.property) && ['test','it'].includes(node.callee.callee.object.name) && node.callee.callee.property.name === 'each') return { kind: node.callee.callee.object.name as IndexedTestUnitKind, modifier: 'each' };
  return null;
}
function callbackArgument(node: t.CallExpression) { return [...node.arguments].reverse().find(argument => t.isArrowFunctionExpression(argument) || t.isFunctionExpression(argument)) as t.ArrowFunctionExpression | t.FunctionExpression | undefined; }

export async function buildSourceIndex(repository: GitSourceRepository, commit: string): Promise<SourceIndex> {
  const allFiles = await repository.listFiles(commit); const fileSet = new Set(allFiles);
  const paths = allFiles.filter(path => /\.[jt]sx?$/.test(path) && !path.endsWith('.d.ts')).sort();
  const modules: ModuleRecord[] = [];
  for (const path of paths) {
    const code = await repository.readFile(commit, path);
    const ast = parse(code, { sourceType: 'module', sourceFilename: path, plugins: ['jsx','typescript','dynamicImport'] });
    const isTest = /(^|\/)test(s)?\//.test(path) || /\.(test|spec)\.[jt]sx?$/.test(path);
    const imports: ImportBinding[] = []; const declarations: DeclarationRecord[] = []; const testUnits: TestUnitRecord[] = []; const reExports: ReExportRecord[] = []; const unresolved: string[] = []; const localExports = new Set<string>(); let localDefaultExport: string | null = null;
    const addDeclaration = (node: t.Node, name: string, exported: boolean, defaultExport: boolean) => declarations.push(declarationFrom(node, path, name, exported, defaultExport));
    for (const statement of ast.program.body) {
      if (t.isImportDeclaration(statement)) {
        const source = statement.source.value; const resolvedPath = resolveModule(path, source, fileSet);
        const extension = posix.extname(source).toLowerCase(); const specialKind = extension === '.css' ? 'style' : assetExtensions.has(extension) ? 'asset' : null;
        if (!statement.specifiers.length) imports.push({ local: '', imported: '', source, resolvedPath, kind: specialKind ?? 'side-effect' });
        for (const specifier of statement.specifiers) { const kind = specialKind ?? (statement.importKind === 'type' || (t.isImportSpecifier(specifier) && specifier.importKind === 'type') ? 'type' : t.isImportDefaultSpecifier(specifier) ? 'default' : t.isImportNamespaceSpecifier(specifier) ? 'namespace' : 'value'); const imported = t.isImportSpecifier(specifier) ? (t.isIdentifier(specifier.imported) ? specifier.imported.name : specifier.imported.value) : t.isImportDefaultSpecifier(specifier) ? 'default' : '*'; imports.push({ local: specifier.local.name, imported, source, resolvedPath, kind }); }
        if (source.startsWith('.') && !resolvedPath && !specialKind) unresolved.push(`Unresolved static import ${source}`);
      }
      const exported = t.isExportNamedDeclaration(statement) || t.isExportDefaultDeclaration(statement); const defaultExport = t.isExportDefaultDeclaration(statement);
      const node = exported ? statement.declaration : statement;
      if (node) switch (node.type) {
        case 'FunctionDeclaration': if (node.id) addDeclaration(node, node.id.name, exported, defaultExport); break;
        case 'VariableDeclaration': for (const item of node.declarations) if (t.isIdentifier(item.id)) addDeclaration(item, item.id.name, exported, defaultExport); break;
        case 'TSInterfaceDeclaration': addDeclaration(node, node.id.name, exported, defaultExport); break;
        case 'TSTypeAliasDeclaration': addDeclaration(node, node.id.name, exported, defaultExport); break;
        case 'TSEnumDeclaration': addDeclaration(node, node.id.name, exported, defaultExport); break;
      }
      if (t.isExportNamedDeclaration(statement) && !statement.source) for (const specifier of statement.specifiers) if (t.isExportSpecifier(specifier)) localExports.add(specifier.local.name);
      if (t.isExportDefaultDeclaration(statement) && t.isIdentifier(statement.declaration)) localDefaultExport = statement.declaration.name;
      if (t.isExportNamedDeclaration(statement) && statement.source) for (const specifier of statement.specifiers) if (t.isExportSpecifier(specifier)) { const imported = specifier.local.name; const name = t.isIdentifier(specifier.exported) ? specifier.exported.name : specifier.exported.value; reExports.push({ exported: name, imported, source: statement.source.value, resolvedPath: resolveModule(path, statement.source.value, fileSet) }); }
    }
    for (const declaration of declarations) { if (localExports.has(declaration.name)) declaration.exported = true; if (localDefaultExport === declaration.name) { declaration.exported = true; declaration.defaultExport = true; } }
    if (isTest) {
      babelTraverse(ast, { CallExpression(callPath) {
        const recognized = directTestCall(callPath.node, callPath.parent);
        if (!recognized) return;
        const callback = callbackArgument(callPath.node); if (!callback) { unresolved.push(`Unsupported ${recognized.kind}${recognized.modifier ? `.${recognized.modifier}` : ''} without a static callback at line ${callPath.node.loc?.start.line ?? 1}`); return; }
        const offset = callPath.node.start ?? 0;
        const parentDescribe = testUnits.filter(unit => unit.kind === 'describe' && offset >= unit.callbackStart && offset <= unit.callbackEnd).sort((a,b) => (a.callbackEnd-a.callbackStart)-(b.callbackEnd-b.callbackStart))[0] ?? null;
        const first = callPath.node.arguments[0]; const title = t.isStringLiteral(first) ? first.value : null;
        const line = callPath.node.loc?.start.line ?? 1; const column = callPath.node.loc?.start.column ?? 0;
        testUnits.push({ key: `${path}#${recognized.kind}@${line}:${column}`, path, kind: recognized.kind, title, modifier: recognized.modifier, startLine: line, endLine: callPath.node.loc?.end.line ?? line, start: callPath.node.start ?? 0, end: callPath.node.end ?? 0, callbackStart: callback.start ?? callPath.node.start ?? 0, callbackEnd: callback.end ?? callPath.node.end ?? 0, parentDescribeKey: parentDescribe?.key ?? null, enclosingDescribeKeys: parentDescribe ? [...parentDescribe.enclosingDescribeKeys, parentDescribe.key] : [], dependencies: [], staticLiterals: [] });
      } });
      const existingStarts = new Set(declarations.map(item => item.start));
      const addNestedSupport = (node: t.FunctionDeclaration | t.VariableDeclarator, name: string) => {
        const offset = node.start ?? -1; if (existingStarts.has(offset)) return;
        const owner = testUnits.filter(unit => offset >= unit.callbackStart && offset <= unit.callbackEnd).sort((a,b) => (a.callbackEnd-a.callbackStart)-(b.callbackEnd-b.callbackStart))[0];
        if (owner && owner.kind !== 'describe') return;
        const declaration = declarationFrom(node, path, name, false, false); declaration.key = `${path}#${name}@${declaration.startLine}:${node.loc?.start.column ?? 0}`; declarations.push(declaration); existingStarts.add(offset);
      };
      babelTraverse(ast, {
        FunctionDeclaration(declarationPath) { if (declarationPath.node.id) addNestedSupport(declarationPath.node, declarationPath.node.id.name); },
        VariableDeclarator(declarationPath) { if (t.isIdentifier(declarationPath.node.id)) addNestedSupport(declarationPath.node, declarationPath.node.id.name); }
      });
    }
    const importedNames = new Set(imports.map(item => item.local).filter(Boolean)); const localNames = new Set(declarations.map(item => item.name));
    babelTraverse(ast, {
      Identifier(identifierPath) {
        if (!identifierPath.isReferencedIdentifier()) return;
        const offset = identifierPath.node.start ?? -1;
        const unit = testUnits.filter(item => offset >= item.callbackStart && offset <= item.callbackEnd).sort((a,b) => (a.callbackEnd-a.callbackStart)-(b.callbackEnd-b.callbackStart))[0];
        const declaration = declarations.filter(item => offset >= item.start && offset <= item.end).sort((a,b) => (a.end-a.start)-(b.end-b.start))[0];
        const name = identifierPath.node.name;
        if (declaration && (!unit || declaration.end-declaration.start < unit.callbackEnd-unit.callbackStart)) { if (importedNames.has(name) || (localNames.has(name) && name !== declaration.name)) declaration.dependencies.push(name); }
        else if (unit && (importedNames.has(name) || localNames.has(name))) unit.dependencies.push(name);
      },
      MemberExpression(memberPath) {
        const { object, property, computed } = memberPath.node;
        if (!t.isIdentifier(object) || !t.isIdentifier(property) || computed) return;
        const binding = imports.find(item => item.local === object.name && item.kind === 'namespace');
        if (!binding) return;
        const offset = memberPath.node.start ?? -1;
        const unit = testUnits.filter(item => offset >= item.callbackStart && offset <= item.callbackEnd).sort((a,b) => (a.callbackEnd-a.callbackStart)-(b.callbackEnd-b.callbackStart))[0];
        const owner = declarations.filter(item => offset >= item.start && offset <= item.end).sort((a,b) => (a.end-a.start)-(b.end-b.start))[0];
        if (owner && (!unit || owner.end-owner.start < unit.callbackEnd-unit.callbackStart)) owner.dependencies.push(`${binding.local}.${property.name}`); else if (unit) unit.dependencies.push(`${binding.local}.${property.name}`);
      },
      JSXIdentifier(jsxPath) { if (!t.isJSXOpeningElement(jsxPath.parent) || jsxPath.parent.name !== jsxPath.node || !/^[A-Z]/.test(jsxPath.node.name)) return; const offset = jsxPath.node.start ?? -1; const unit = testUnits.filter(item => offset >= item.callbackStart && offset <= item.callbackEnd).sort((a,b) => (a.callbackEnd-a.callbackStart)-(b.callbackEnd-b.callbackStart))[0]; const owner = declarations.filter(item => offset >= item.start && offset <= item.end).sort((a,b) => (a.end-a.start)-(b.end-b.start))[0]; if (owner && (!unit || owner.end-owner.start < unit.callbackEnd-unit.callbackStart)) owner.jsxReferences.push(jsxPath.node.name); else if (unit) unit.dependencies.push(jsxPath.node.name); },
      StringLiteral(literalPath) { const offset = literalPath.node.start ?? -1; const unit = testUnits.filter(item => offset >= item.callbackStart && offset <= item.callbackEnd).sort((a,b) => (a.callbackEnd-a.callbackStart)-(b.callbackEnd-b.callbackStart))[0]; const declaration = declarations.filter(item => offset >= item.start && offset <= item.end).sort((a,b) => (a.end-a.start)-(b.end-b.start))[0]; if (declaration && (!unit || declaration.end-declaration.start < unit.callbackEnd-unit.callbackStart)) declaration.staticLiterals.push(literalPath.node.value); else if (unit) unit.staticLiterals.push(literalPath.node.value); },
      JSXText(textPath) { const value = textPath.node.value.replace(/\s+/g, ' ').trim(); if (!value) return; const offset = textPath.node.start ?? -1; const owner = declarations.filter(item => offset >= item.start && offset <= item.end).sort((a,b) => (a.end-a.start)-(b.end-b.start))[0]; if (owner) owner.staticLiterals.push(value); },
      RegExpLiteral(literalPath) { const offset = literalPath.node.start ?? -1; const unit = testUnits.filter(item => offset >= item.callbackStart && offset <= item.callbackEnd).sort((a,b) => (a.callbackEnd-a.callbackStart)-(b.callbackEnd-b.callbackStart))[0]; if (unit) unit.staticLiterals.push(literalPath.node.pattern); },
      CallExpression(callPath) {
        if (t.isImport(callPath.node.callee)) unresolved.push(`Dynamic import at line ${callPath.node.loc?.start.line ?? 1}`);
        if (isTest && t.isExpressionStatement(callPath.parent) && t.isProgram(callPath.parentPath.parent) && !directTestCall(callPath.node, callPath.parent)) unresolved.push(`Unsupported top-level test factory at line ${callPath.node.loc?.start.line ?? 1}`);
      }
    });
    for (const declaration of declarations) { declaration.dependencies = [...new Set(declaration.dependencies)].sort(); declaration.jsxReferences = [...new Set(declaration.jsxReferences)].sort(); declaration.staticLiterals = [...new Set(declaration.staticLiterals)].sort(); }
    for (const unit of testUnits) { unit.dependencies = [...new Set(unit.dependencies)].sort(); unit.staticLiterals = [...new Set(unit.staticLiterals)].sort(); }
    modules.push({ path, imports: imports.sort((a,b) => `${a.source}:${a.local}`.localeCompare(`${b.source}:${b.local}`)), declarations: declarations.sort((a,b) => a.startLine - b.startLine || a.name.localeCompare(b.name)), testUnits: testUnits.sort((a,b) => a.startLine-b.startLine || a.start-b.start), reExports: reExports.sort((a,b) => a.exported.localeCompare(b.exported)), unresolved: [...new Set(unresolved)].sort(), isTest });
  }
  const moduleByPath = new Map(modules.map(module => [module.path, module])); const declarationByKey = new Map(modules.flatMap(module => module.declarations.map(declaration => [declaration.key, declaration] as const)));
  return { commit, modules, moduleByPath, declarationByKey };
}

export function resolveImportedDeclaration(index: SourceIndex, from: ModuleRecord, localName: string) {
  const [bindingName, namespaceMember] = localName.split('.', 2); const binding = from.imports.find(item => item.local === bindingName); if (!binding?.resolvedPath) return null; const target = index.moduleByPath.get(binding.resolvedPath); if (!target) return null;
  if (binding.kind === 'namespace') return namespaceMember ? target.declarations.find(item => item.name === namespaceMember && item.exported) ?? resolveReExport(index, target, namespaceMember, new Set()) : null;
  if (binding.imported === 'default') return target.declarations.find(item => item.defaultExport) ?? null;
  return target.declarations.find(item => item.name === binding.imported && item.exported) ?? resolveReExport(index, target, binding.imported, new Set());
}
function resolveReExport(index: SourceIndex, module: ModuleRecord, name: string, seen: Set<string>): DeclarationRecord | null { const key = `${module.path}#${name}`; if (seen.has(key)) return null; seen.add(key); const edge = module.reExports.find(item => item.exported === name); if (!edge?.resolvedPath) return null; const target = index.moduleByPath.get(edge.resolvedPath); if (!target) return null; return target.declarations.find(item => item.name === edge.imported && item.exported) ?? resolveReExport(index, target, edge.imported, seen); }
