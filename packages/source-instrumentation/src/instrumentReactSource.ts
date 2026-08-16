import { createHash } from 'node:crypto';
import { relative, resolve, sep } from 'node:path';
import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';

const babelTraverse = ((traverse as unknown as { default?: typeof traverse }).default ?? traverse);
const babelGenerate = ((generate as unknown as { default?: typeof generate }).default ?? generate);

export interface InstrumentationOptions {
  repositoryRoot: string;
  branch: string;
  selectionReceipt?: (metadata: StaticBoundaryMetadata) => string;
}
export interface StaticBoundaryMetadata {
  boundaryId: string;
  repositoryRelativePath: string;
  line: number;
  column: number;
  componentName: string | null;
  exportName: string | null;
  branch: string;
  confidence: 'exact' | 'partial';
}

export interface InstrumentedBoundaryMapping {
  selectionReceipt: string;
  source: StaticBoundaryMetadata;
}

const sourceAttribute = 'data-ums-boundary';
function isComponentName(name: string | null) { return Boolean(name && /^[A-Z]/.test(name)); }
function isHostElement(node: t.JSXElement) { return t.isJSXIdentifier(node.openingElement.name) && /^[a-z]/.test(node.openingElement.name.name); }
function addMetadata(node: t.JSXElement, selectionReceipt: string) {
  if (node.openingElement.attributes.some(attribute => t.isJSXAttribute(attribute) && t.isJSXIdentifier(attribute.name, { name: sourceAttribute }))) return;
  node.openingElement.attributes.push(t.jsxAttribute(t.jsxIdentifier(sourceAttribute), t.jsxExpressionContainer(t.stringLiteral(selectionReceipt))));
}
function instrumentExpression(expression: t.Expression | t.JSXElement | t.JSXFragment, metadata: StaticBoundaryMetadata, selectionReceipt: string, record: (metadata: StaticBoundaryMetadata) => void): number {
  if (t.isJSXElement(expression)) { if (isHostElement(expression)) { addMetadata(expression, selectionReceipt); record(metadata); return 1; } return 0; }
  if (t.isJSXFragment(expression)) {
    let count = 0;
    const partial = { ...metadata, confidence: 'partial' as const };
    for (const child of expression.children) {
      if (t.isJSXElement(child) && isHostElement(child)) { addMetadata(child, selectionReceipt); record(partial); count += 1; }
      else if (t.isJSXExpressionContainer(child) && t.isExpression(child.expression)) count += instrumentExpression(child.expression, partial, selectionReceipt, record);
    }
    return count;
  }
  if (t.isConditionalExpression(expression)) return instrumentExpression(expression.consequent, metadata, selectionReceipt, record) + instrumentExpression(expression.alternate, metadata, selectionReceipt, record);
  if (t.isLogicalExpression(expression) && t.isExpression(expression.right)) return instrumentExpression(expression.right, metadata, selectionReceipt, record);
  return 0;
}
function exportNameFor(path: NodePath<t.FunctionDeclaration | t.VariableDeclarator>) {
  const declaration = t.isVariableDeclarator(path.node) ? path.parentPath : path;
  const parent = declaration.parentPath;
  return parent?.isExportDefaultDeclaration() ? 'default' : parent?.isExportNamedDeclaration() ? (t.isVariableDeclarator(path.node) && t.isIdentifier(path.node.id) ? path.node.id.name : t.isFunctionDeclaration(path.node) && path.node.id ? path.node.id.name : null) : null;
}
function instrumentFunction(path: NodePath<t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression>, metadata: StaticBoundaryMetadata, selectionReceipt: string, record: (metadata: StaticBoundaryMetadata) => void) {
  if (t.isArrowFunctionExpression(path.node) && !t.isBlockStatement(path.node.body)) return instrumentExpression(path.node.body, metadata, selectionReceipt, record);
  let count = 0;
  path.traverse({ ReturnStatement(returnPath) { if (returnPath.getFunctionParent() !== path || !returnPath.node.argument) return; count += instrumentExpression(returnPath.node.argument, metadata, selectionReceipt, record); } });
  return count;
}
function pathFor(repositoryRoot: string, id: string) { return relative(resolve(repositoryRoot), resolve(id)).split(sep).join('/'); }
export function staticBoundaryId(relativePath: string, line: number, column: number, name: string | null) { return createHash('sha256').update(`${relativePath}:${line}:${column}:${name ?? 'anonymous'}`).digest('hex').slice(0, 16); }

export function isProjectOwnedReactSource(id: string, repositoryRoot: string) {
  const clean = id.split('?')[0];
  const relativePath = pathFor(repositoryRoot, clean);
  return !clean.includes(`${sep}node_modules${sep}`) && !relativePath.startsWith('../') && relativePath !== '..' && /\.[jt]sx$/.test(clean);
}

export function instrumentReactSource(code: string, id: string, options: InstrumentationOptions) {
  if (!isProjectOwnedReactSource(id, options.repositoryRoot)) return null;
  const repositoryRelativePath = pathFor(options.repositoryRoot, id.split('?')[0]);
  const ast = parse(code, { sourceType: 'module', sourceFilename: repositoryRelativePath, plugins: ['jsx', 'typescript'] });
  let boundaries = 0;
  const mappings = new Map<string, InstrumentedBoundaryMapping>();
  const makeMetadata = (node: t.Node, componentName: string | null, exportName: string | null): StaticBoundaryMetadata => {
    const line = node.loc?.start.line ?? 1; const column = (node.loc?.start.column ?? 0) + 1;
    return { boundaryId: staticBoundaryId(repositoryRelativePath, line, column, componentName), repositoryRelativePath, line, column, componentName, exportName, branch: options.branch, confidence: 'exact' };
  };
  const instrument = (path: NodePath<t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression>, metadata: StaticBoundaryMetadata) => {
    const selectionReceipt = options.selectionReceipt?.(metadata) ?? `boundary-${metadata.boundaryId}`;
    return instrumentFunction(path, metadata, selectionReceipt, source => mappings.set(metadata.boundaryId, { selectionReceipt, source }));
  };
  babelTraverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id?.name ?? null;
      const exportedDefault = path.parentPath.isExportDefaultDeclaration();
      if (!isComponentName(name) && !exportedDefault) return;
      boundaries += instrument(path, makeMetadata(path.node, name, exportNameFor(path)));
    },
    VariableDeclarator(path) {
      if (!t.isIdentifier(path.node.id) || !isComponentName(path.node.id.name) || (!t.isArrowFunctionExpression(path.node.init) && !t.isFunctionExpression(path.node.init))) return;
      boundaries += instrument(path.get('init') as NodePath<t.ArrowFunctionExpression | t.FunctionExpression>, makeMetadata(path.node, path.node.id.name, exportNameFor(path)));
    },
    ExportDefaultDeclaration(path) {
      const declaration = path.node.declaration;
      if (!t.isArrowFunctionExpression(declaration) && !t.isFunctionExpression(declaration)) return;
      boundaries += instrument(path.get('declaration') as NodePath<t.ArrowFunctionExpression | t.FunctionExpression>, makeMetadata(declaration, t.isFunctionExpression(declaration) ? declaration.id?.name ?? null : null, 'default'));
    }
  });
  if (!boundaries) return null;
  const output = babelGenerate(ast, { sourceMaps: true, sourceFileName: repositoryRelativePath }, code);
  return { code: output.code, map: output.map, boundaryCount: boundaries, boundaries: [...mappings.values()] };
}
