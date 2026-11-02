import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { DeclarationRecord } from './sourceIndex';

const babelTraverse = ((traverse as unknown as { default?: typeof traverse }).default ?? traverse);

export interface CssModuleUsageEvidence {
  status: 'supported' | 'refused';
  classes: string[];
  reason: string | null;
}

function refused(reason: string): CssModuleUsageEvidence {
  return { status: 'refused', classes: [], reason };
}

/**
 * Deliberately narrow: only direct className={styles.className} references in
 * one indexed declaration. This proves static usage, NOT CSS transfer safety.
 */
export function inspectCssModuleUsage(
  source: string,
  path: string,
  owner: Pick<DeclarationRecord, 'start' | 'end'>,
  importName: string,
  stylesheetClasses: readonly string[]
): CssModuleUsageEvidence {
  if (!importName || !stylesheetClasses.length || new Set(stylesheetClasses).size !== stylesheetClasses.length) {
    return refused('CSS Module requires one named binding and distinct local classes.');
  }
  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(source, { sourceType: 'module', sourceFilename: path, plugins: ['jsx', 'typescript', 'dynamicImport'] });
  } catch {
    return refused('CSS Module importer is not valid React TypeScript source.');
  }
  const known = new Set(stylesheetClasses);
  const used = new Set<string>();
  let issue: string | null = null;
  babelTraverse(ast, {
    Identifier(identifierPath) {
      if (identifierPath.node.name !== importName || !identifierPath.isReferencedIdentifier()) return;
      const binding = identifierPath.scope.getBinding(importName);
      if (!binding?.path.isImportDefaultSpecifier()) {
        issue ??= 'CSS Module reference is shadowed or does not resolve to the default stylesheet import.';
        return;
      }
      const offset = identifierPath.node.start ?? -1;
      if (offset < owner.start || offset >= owner.end) {
        issue ??= 'CSS Module binding is used outside its uniquely owned declaration.';
        return;
      }
      const member = identifierPath.parentPath;
      if (!member.isMemberExpression() || member.node.object !== identifierPath.node ||
          member.node.computed || !t.isIdentifier(member.node.property)) {
        issue ??= 'CSS Module class access is not a static styles.className member.';
        return;
      }
      const expression = member.parentPath;
      const attribute = expression.parentPath;
      if (!expression.isJSXExpressionContainer() || expression.node.expression !== member.node ||
          !attribute.isJSXAttribute() || !t.isJSXIdentifier(attribute.node.name) ||
          attribute.node.name.name !== 'className') {
        issue ??= 'CSS Module class reference is not a direct JSX className expression.';
        return;
      }
      const className = member.node.property.name;
      if (!known.has(className)) {
        issue ??= 'CSS Module references undefined local class ' + className + '.';
        return;
      }
      used.add(className);
    }
  });
  if (issue) return refused(issue);
  if (!used.size) return refused('CSS Module has no statically owned JSX className references.');
  const unused = [...known].filter(className => !used.has(className)).sort();
  if (unused.length) return refused('CSS Module has unreferenced local class rules: ' + unused.join(', ') + '.');
  return { status: 'supported', classes: [...used].sort(), reason: null };
}
