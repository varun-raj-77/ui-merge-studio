import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { PreviewCapabilities } from '../../shared/src/bridge';

const babelTraverse = ((traverse as unknown as { default?: typeof traverse }).default ?? traverse);

export async function detectFixtureCapabilities(repositoryRoot: string): Promise<PreviewCapabilities> {
  const source = await readFile(resolve(repositoryRoot, 'src/state/ticketSelection.ts'), 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] });
  let queryContract = false;
  let pathContract = false;
  babelTraverse(ast, {
    VariableDeclarator(path) {
      if (t.isIdentifier(path.node.id, { name: 'ticketQueryKey' }) && t.isStringLiteral(path.node.init)) queryContract = true;
    },
    FunctionDeclaration(path) {
      if (path.node.id?.name === 'ticketPath') pathContract = true;
    }
  });
  const routeSync = queryContract && !pathContract
    ? { version: 1, contract: 'ticket-query-v1' }
    : pathContract && !queryContract
      ? { version: 1, contract: 'ticket-path-v1' }
      : null;
  return {
    routeSync,
    fixtureContext: routeSync ? { version: 1, contract: `support-ticket-${routeSync.contract}`, entityType: 'ticket' } : null,
    sourceSelection: { version: 1 }
  };
}
