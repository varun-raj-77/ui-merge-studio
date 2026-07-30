import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { PreviewCapabilities } from '../../shared/src/bridge';

const babelTraverse = ((traverse as unknown as { default?: typeof traverse }).default ?? traverse);

export async function detectFixtureCapabilities(repositoryRoot: string): Promise<PreviewCapabilities> {
  const source = await readFile(resolve(repositoryRoot, 'src/state/catalogueContext.ts'), 'utf8').catch(error => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  });
  if (source === null) return { routeSync: null, fixtureContext: null, sourceSelection: { version: 1 } };

  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] });
  let route: string | null = null;
  let queryKey: string | null = null;
  let fixtureContract: string | null = null;
  babelTraverse(ast, {
    VariableDeclarator(path) {
      if (!t.isIdentifier(path.node.id) || !t.isStringLiteral(path.node.init)) return;
      if (path.node.id.name === 'catalogueRoute') route = path.node.init.value;
      if (path.node.id.name === 'productQueryKey') queryKey = path.node.init.value;
      if (path.node.id.name === 'catalogueFixtureContract') fixtureContract = path.node.init.value;
    }
  });
  const compatible = route === '/catalogue' && queryKey === 'product' && fixtureContract === 'product-catalogue-v1';
  return {
    routeSync: compatible ? { version: 1, contract: 'catalogue-query-v1' } : null,
    fixtureContext: compatible ? { version: 1, contract: fixtureContract!, entityType: 'product' } : null,
    sourceSelection: { version: 1 }
  };
}
