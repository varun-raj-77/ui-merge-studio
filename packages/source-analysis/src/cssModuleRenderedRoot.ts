import { parse } from '@babel/parser';
import * as t from '@babel/types';
import { inspectCssModuleClassUsage, type CssModuleClassUsageEvidence, type CssModuleClassUsageRequest } from './cssModuleClassUsage';

export interface CssModuleRenderedRootRequest extends CssModuleClassUsageRequest {
  selectedBoundary: { path: string; componentName: string | null; line: number; column: number };
}

function refused(reason: string): CssModuleClassUsageEvidence {
  return { status: 'refused', classes: [], reason };
}

function hostName(element: t.JSXElement): string | null {
  const name = element.openingElement.name;
  return t.isJSXIdentifier(name) && /^[a-z]/.test(name.name) ? name.name : null;
}

/**
 * A deliberately narrow proof for the root HOST subtree of the *attested*
 * rendered React component. This does not authorize transferring CSS.
 * Fragments, multiple/conditional returns, dynamic children and JSX spreads
 * have no proof in this grammar and must be refused.
 */
export function inspectCssModuleRenderedRoot(source: string, request: CssModuleRenderedRootRequest): CssModuleClassUsageEvidence {
  const boundary = request.selectedBoundary;
  if (boundary.path !== request.sourcePath || boundary.componentName !== request.componentName ||
      boundary.line !== request.componentStartLine || !Number.isInteger(boundary.column) || boundary.column < 1) {
    return refused('CSS Module owner is not the exact selected rendered component boundary.');
  }
  const declarationUsage = inspectCssModuleClassUsage(source, request);
  if (declarationUsage.status === 'refused') return declarationUsage;

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(source, { sourceType: 'module', sourceFilename: request.sourcePath, plugins: ['jsx', 'typescript'] });
  } catch {
    return refused('Selected rendered JSX source cannot be parsed.');
  }

  const matches: Array<t.FunctionDeclaration | t.VariableDeclarator> = [];
  for (const statement of ast.program.body) {
    const declaration = (t.isExportNamedDeclaration(statement) || t.isExportDefaultDeclaration(statement))
      ? statement.declaration : statement;
    if (t.isFunctionDeclaration(declaration) && declaration.id?.name === request.componentName &&
        declaration.loc?.start.line === boundary.line && declaration.loc.start.column + 1 === boundary.column) {
      matches.push(declaration);
    }
    if (t.isVariableDeclaration(declaration)) for (const item of declaration.declarations) {
      if (t.isIdentifier(item.id) && item.id.name === request.componentName &&
          (t.isArrowFunctionExpression(item.init) || t.isFunctionExpression(item.init)) &&
          item.loc?.start.line === boundary.line && item.loc.start.column + 1 === boundary.column) {
        matches.push(item);
      }
    }
  }
  if (matches.length !== 1) return refused('Rendered component declaration does not uniquely match its attested source line and column.');
  const owner = matches[0];
  const callable = t.isVariableDeclarator(owner) ? owner.init : owner;
  if (!callable || (!t.isFunctionDeclaration(callable) && !t.isFunctionExpression(callable) && !t.isArrowFunctionExpression(callable))) {
    return refused('Rendered component is outside the supported direct-return function grammar.');
  }
  const body = callable.body;
  let root: t.JSXElement | null = null;
  if (t.isJSXElement(body)) root = body;
  else if (t.isBlockStatement(body) && body.body.length === 1 && t.isReturnStatement(body.body[0]) &&
           t.isJSXElement(body.body[0].argument)) root = body.body[0].argument;
  if (!root || !hostName(root)) {
    return refused('Rendered boundary must be one unconditional direct host JSX root, without a fragment, helper, or alternate return.');
  }

  const importedNames = ast.program.body
    .filter((statement): statement is t.ImportDeclaration => t.isImportDeclaration(statement) && statement.source.value === request.importSource)
    .flatMap(statement => statement.specifiers.filter((specifier): specifier is t.ImportDefaultSpecifier => t.isImportDefaultSpecifier(specifier)));
  if (importedNames.length !== 1) return refused('Rendered stylesheet has no unique static default import.');
  const styleName = importedNames[0].local.name;

  const found = new Set<string>();
  let problem: string | null = null;
  const visit = (element: t.JSXElement): void => {
    if (problem) return;
    if (!hostName(element)) {
      problem = 'Rendered CSS proof excludes custom component and namespaced JSX targets.';
      return;
    }
    const seenAttributes = new Set<string>();
    for (const attribute of element.openingElement.attributes) {
      if (t.isJSXSpreadAttribute(attribute) || !t.isJSXIdentifier(attribute.name)) {
        problem = 'Rendered JSX attribute spreads or namespaces cannot prove effective class ownership.';
        return;
      }
      const key = attribute.name.name;
      if (seenAttributes.has(key)) {
        problem = 'Duplicate rendered JSX attributes can override effective class ownership.';
        return;
      }
      seenAttributes.add(key);
      if (key === 'className' && t.isJSXExpressionContainer(attribute.value)) {
        const value = attribute.value.expression;
        if (!t.isMemberExpression(value) || value.computed || !t.isIdentifier(value.object, { name: styleName }) ||
            !t.isIdentifier(value.property)) {
          problem = 'Rendered JSX className is dynamic or not a direct static CSS Module member.';
          return;
        }
        found.add(value.property.name);
      } else if (attribute.value && !t.isStringLiteral(attribute.value)) {
        problem = 'Dynamic rendered JSX props are outside the static root ownership grammar.';
        return;
      }
    }
    for (const child of element.children) {
      if (t.isJSXText(child)) continue;
      if (t.isJSXElement(child)) visit(child);
      else {
        problem = 'Dynamic, fragment, or spread JSX children are outside the selected root ownership grammar.';
        return;
      }
      if (problem) return;
    }
  };
  visit(root);
  if (problem) return refused(problem);
  const renderedClasses = [...found].sort();
  if (renderedClasses.length !== declarationUsage.classes.length ||
      renderedClasses.some((name, index) => name !== declarationUsage.classes[index])) {
    return refused('CSS Module class references are not exclusively located inside the selected rendered root.');
  }
  return { status: 'supported', classes: renderedClasses, reason: null };
}
