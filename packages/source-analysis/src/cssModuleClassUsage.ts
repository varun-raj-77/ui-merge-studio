import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

const babelTraverse = ((traverse as unknown as { default?: typeof traverse }).default ?? traverse);

export interface CssModuleClassUsageEvidence {
  status: 'supported' | 'refused';
  classes: string[];
  reason: string | null;
}

export interface CssModuleClassUsageRequest {
  sourcePath: string;
  componentName: string;
  componentStartLine: number;
  importSource: string;
  cssClasses: readonly string[];
}

function refused(reason: string): CssModuleClassUsageEvidence {
  return { status: 'refused', classes: [], reason };
}

/**
 * Declaration-wide static reference inventory, NOT a proof of rendered JSX
 * child/subtree ownership. Successful evidence never authorizes CSS transfer.
 */
export function inspectCssModuleClassUsage(source: string, request: CssModuleClassUsageRequest): CssModuleClassUsageEvidence {
  if (!request.sourcePath.endsWith('.tsx')) return refused('Only a TSX declaration source is supported.');
  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(source, { sourceType: 'module', sourceFilename: request.sourcePath, plugins: ['jsx', 'typescript'] });
  } catch {
    return refused('Selected TSX source cannot be parsed.');
  }

  const matchingImports = ast.program.body
    .filter((statement): statement is t.ImportDeclaration => t.isImportDeclaration(statement) && statement.source.value === request.importSource)
    .flatMap(statement => statement.specifiers.filter((specifier): specifier is t.ImportDefaultSpecifier => t.isImportDefaultSpecifier(specifier)));
  if (matchingImports.length !== 1) return refused('CSS Module has no unique default import binding in the selected source.');
  const importedSpecifier = matchingImports[0];
  const localName = importedSpecifier.local.name;

  const declarations: t.Node[] = [];
  for (const statement of ast.program.body) {
    const declaration = (t.isExportNamedDeclaration(statement) || t.isExportDefaultDeclaration(statement))
      ? statement.declaration : statement;
    if (t.isFunctionDeclaration(declaration) && declaration.id?.name === request.componentName) declarations.push(declaration);
    if (t.isVariableDeclaration(declaration)) for (const item of declaration.declarations) {
      if (t.isIdentifier(item.id) && item.id.name === request.componentName && (t.isArrowFunctionExpression(item.init) || t.isFunctionExpression(item.init))) declarations.push(item);
    }
  }
  const matchingDeclarations = declarations.filter(node => node.loc?.start.line === request.componentStartLine);
  if (matchingDeclarations.length !== 1) return refused('Selected declaration identity is absent or ambiguous at its source line.');
  const owner = matchingDeclarations[0];
  if (owner.start == null || owner.end == null) return refused('Selected declaration source range is unavailable.');

  const found = new Set<string>();
  let issue: string | null = null;
  babelTraverse(ast, {
    Identifier(path) {
      if (path.node.name !== localName || !path.isReferencedIdentifier()) return;
      const binding = path.scope.getBinding(localName);
      if (!binding || binding.path.node !== importedSpecifier) {
        issue ??= 'CSS Module binding is shadowed or does not resolve to the unique import.';
        return;
      }
      const offset = path.node.start ?? -1;
      if (offset < owner.start! || offset >= owner.end!) {
        issue ??= 'CSS Module binding is referenced outside the selected declaration.';
        return;
      }
      const member = path.parentPath;
      if (!member.isMemberExpression() || member.node.object !== path.node || member.node.computed || !t.isIdentifier(member.node.property)) {
        issue ??= 'CSS Module reference uses dynamic, aliased, or unsupported member access.';
        return;
      }
      const expression = member.parentPath;
      if (!expression.isJSXExpressionContainer() || expression.node.expression !== member.node ||
          !expression.parentPath.isJSXAttribute() || !t.isJSXIdentifier(expression.parentPath.node.name, { name: 'className' })) {
        issue ??= 'CSS Module class reference is not a direct static JSX className expression.';
        return;
      }
      found.add(member.node.property.name);
    }
  });
  if (issue) return refused(issue);
  const declared = [...new Set(request.cssClasses)].sort();
  const used = [...found].sort();
  if (!used.length) return refused('Selected declaration has no direct static JSX CSS Module class reference.');
  const unknown = used.filter(name => !declared.includes(name));
  if (unknown.length) return refused('Selected declaration references classes absent from the CSS Module: ' + unknown.join(', ') + '.');
  const extra = declared.filter(name => !found.has(name));
  if (extra.length) return refused('CSS Module includes class rules not referenced by the selected declaration: ' + extra.join(', ') + '.');
  return { status: 'supported', classes: used, reason: null };
}
