import { resolve } from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { describe, expect, test } from 'vitest';
import { instrumentReactSource, isProjectOwnedReactSource } from '../../packages/source-instrumentation/src/instrumentReactSource';

const root = resolve('C:/experiment/repository');
function transform(code: string, file = 'src/Example.tsx') {
  const result = instrumentReactSource(code, resolve(root, file), {
    repositoryRoot: root,
    branch: 'candidate-a',
    selectionReceipt: metadata => `rendered-${metadata.boundaryId}${metadata.boundaryId}`
  });
  expect(result).not.toBeNull();
  return result!;
}
function metadata(result: ReturnType<typeof transform>) { return result.boundaries.map(item => item.source); }
function receipts(code: string) {
  const ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  const values: string[] = [];
  traverse(ast, { JSXAttribute(path) { if (t.isJSXIdentifier(path.node.name, { name: 'data-ums-boundary' }) && t.isJSXExpressionContainer(path.node.value) && t.isStringLiteral(path.node.value.expression)) values.push(path.node.value.expression.value); } });
  return values;
}

describe('generic React source instrumentation', () => {
  test('maps named functions to server-owned metadata while rendering only an opaque receipt', () => {
    const output = transform(`export function CatalogueHeader(){ return <header data-kind="catalogue">Header</header> }`);
    expect(metadata(output)[0]).toMatchObject({ componentName: 'CatalogueHeader', exportName: 'CatalogueHeader', repositoryRelativePath: 'src/Example.tsx', line: 1, column: 8, confidence: 'exact' });
    expect(receipts(output.code)).toEqual([expect.stringMatching(/^rendered-[A-Za-z0-9_-]{32}$/)]);
    expect(output.code).not.toContain('repositoryRelativePath');
    expect(output.code).not.toContain('src/Example.tsx');
    expect(output.code).toContain('data-kind');
  });
  test('supports typed arrow components, spread props, and event handlers', () => { const output = transform(`type P={onOpen():void}; export const Row=({onOpen,...rest}:P)=><button {...rest} onClick={onOpen}>Open</button>`); expect(metadata(output)[0]).toMatchObject({ componentName: 'Row', exportName: 'Row' }); expect(output.code).toContain('...rest'); });
  test('supports anonymous and named default exports', () => { expect(metadata(transform(`export default () => <main>Hi</main>`))[0].exportName).toBe('default'); expect(metadata(transform(`export default function Dashboard(){return <main />}`))[0].componentName).toBe('Dashboard'); });
  test('distinguishes nested component definitions without tagging arbitrary nested hosts', () => { const output = transform(`function Child(){return <header><h2>Child</h2></header>} function Parent(){return <aside><Child/><footer>Foot</footer></aside>}`); expect(metadata(output).map(value => value.componentName)).toEqual(['Child', 'Parent']); });
  test('represents fragment host siblings with one partial definition mapping and receipt', () => { const output = transform(`function Pair(){return <><p>A</p><p>B</p></>}`); expect(metadata(output)).toHaveLength(1); expect(metadata(output)[0].confidence).toBe('partial'); expect(new Set(receipts(output.code))).toEqual(new Set([output.boundaries[0].selectionReceipt])); });
  test('instruments conditional host roots while preserving repeated usage', () => { const output = transform(`const State=({ok}:{ok:boolean})=>ok?<p>Yes</p>:<p>No</p>; export function List(){return <div><State ok/><State ok={false}/></div>}`); expect(metadata(output).filter(value => value.componentName === 'State')).toHaveLength(1); expect(metadata(output).find(value => value.componentName === 'List')).toBeTruthy(); expect(output.code.match(/<State/g)).toHaveLength(2); });
  test('does not overwrite an existing data attribute', () => { const output = transform(`function Box(){return <div data-source="application">Box</div>}`); expect(output.code).toContain('data-source="application"'); });
  test('excludes dependencies and paths outside the repository', () => { expect(isProjectOwnedReactSource(resolve(root, 'node_modules/lib/View.tsx'), root)).toBe(false); expect(isProjectOwnedReactSource(resolve(root, '../foreign/View.tsx'), root)).toBe(false); expect(instrumentReactSource('export const X=()=> <div/>', resolve(root, 'src/X.ts'), { repositoryRoot: root, branch: 'x' })).toBeNull(); });
  test('produces stable repository-relative identities without fixture knowledge', () => { const code = `export const Card=()=> <article/>`; const first = metadata(transform(code, 'src/ui/Card.tsx'))[0]; const second = metadata(transform(code, 'src/ui/Card.tsx'))[0]; expect(first.boundaryId).toBe(second.boundaryId); expect(first.repositoryRelativePath).toBe('src/ui/Card.tsx'); expect(JSON.stringify(first)).not.toMatch(/sidebar|inspector|support-dashboard/i); });
  test('leaves wrapper-only delegation untagged while preserving the descendant transform', () => { const result = transform(`function Child(){return <section/>} function Wrapper(){return <Child/>}`, 'src/W.tsx'); expect(result.boundaryCount).toBe(1); expect(metadata(result)[0].componentName).toBe('Child'); });
});
