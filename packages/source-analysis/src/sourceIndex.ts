import { posix } from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { GitSourceRepository } from './gitModel';

const babelTraverse = ((traverse as unknown as { default?: typeof traverse }).default ?? traverse);
export type DeclarationKind = 'function' | 'component' | 'variable' | 'interface' | 'type' | 'enum';
export interface ImportBinding { local: string; imported: string; source: string; resolvedPath: string | null; kind: 'value' | 'type' | 'default' | 'namespace' | 'side-effect' | 'style' | 'asset'; }
export interface DeclarationRecord { key: string; path: string; name: string; kind: DeclarationKind; startLine: number; endLine: number; start: number; end: number; exported: boolean; defaultExport: boolean; dependencies: string[]; jsxReferences: string[] }
export interface ReExportRecord { exported: string; imported: string; source: string; resolvedPath: string | null }
export interface ModuleRecord { path: string; imports: ImportBinding[]; declarations: DeclarationRecord[]; reExports: ReExportRecord[]; unresolved: string[]; isTest: boolean }
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
function declarationFrom(node: t.Node, path: string, name: string, exported: boolean, defaultExport: boolean): DeclarationRecord { return { key: `${path}#${name}`, path, name, kind: declarationKind(node, name), startLine: node.loc?.start.line ?? 1, endLine: node.loc?.end.line ?? node.loc?.start.line ?? 1, start: node.start ?? 0, end: node.end ?? 0, exported, defaultExport, dependencies: [], jsxReferences: [] }; }

export async function buildSourceIndex(repository: GitSourceRepository, commit: string): Promise<SourceIndex> {
  const allFiles = await repository.listFiles(commit); const fileSet = new Set(allFiles);
  const paths = allFiles.filter(path => /\.[jt]sx?$/.test(path) && !path.endsWith('.d.ts')).sort();
  const modules: ModuleRecord[] = [];
  for (const path of paths) {
    const code = await repository.readFile(commit, path);
    const ast = parse(code, { sourceType: 'module', sourceFilename: path, plugins: ['jsx','typescript','dynamicImport'] });
    const imports: ImportBinding[] = []; const declarations: DeclarationRecord[] = []; const reExports: ReExportRecord[] = []; const unresolved: string[] = []; const localExports = new Set<string>(); let localDefaultExport: string | null = null;
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
    const importedNames = new Set(imports.map(item => item.local).filter(Boolean)); const localNames = new Set(declarations.map(item => item.name));
    babelTraverse(ast, {
      Identifier(identifierPath) { if (!identifierPath.isReferencedIdentifier()) return; const offset = identifierPath.node.start ?? -1; const owner = declarations.find(item => offset >= item.start && offset <= item.end); if (owner && (importedNames.has(identifierPath.node.name) || (localNames.has(identifierPath.node.name) && identifierPath.node.name !== owner.name))) owner.dependencies.push(identifierPath.node.name); },
      MemberExpression(memberPath) {
        const { object, property, computed } = memberPath.node;
        if (!t.isIdentifier(object) || !t.isIdentifier(property) || computed) return;
        const binding = imports.find(item => item.local === object.name && item.kind === 'namespace');
        if (!binding) return;
        const offset = memberPath.node.start ?? -1;
        const owner = declarations.find(item => offset >= item.start && offset <= item.end);
        if (owner) owner.dependencies.push(`${binding.local}.${property.name}`);
      },
      JSXIdentifier(jsxPath) { if (!t.isJSXOpeningElement(jsxPath.parent) || jsxPath.parent.name !== jsxPath.node || !/^[A-Z]/.test(jsxPath.node.name)) return; const offset = jsxPath.node.start ?? -1; const owner = declarations.find(item => offset >= item.start && offset <= item.end); if (owner) owner.jsxReferences.push(jsxPath.node.name); },
      CallExpression(callPath) { if (t.isImport(callPath.node.callee)) unresolved.push(`Dynamic import at line ${callPath.node.loc?.start.line ?? 1}`); }
    });
    for (const declaration of declarations) { declaration.dependencies = [...new Set(declaration.dependencies)].sort(); declaration.jsxReferences = [...new Set(declaration.jsxReferences)].sort(); }
    modules.push({ path, imports: imports.sort((a,b) => `${a.source}:${a.local}`.localeCompare(`${b.source}:${b.local}`)), declarations: declarations.sort((a,b) => a.startLine - b.startLine || a.name.localeCompare(b.name)), reExports: reExports.sort((a,b) => a.exported.localeCompare(b.exported)), unresolved: [...new Set(unresolved)].sort(), isTest: /(^|\/)test(s)?\//.test(path) || /\.(test|spec)\.[jt]sx?$/.test(path) });
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
