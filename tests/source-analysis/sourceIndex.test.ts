import { afterEach, describe, expect, test } from 'vitest';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { buildSourceIndex, resolveImportedDeclaration } from '../../packages/source-analysis/src/sourceIndex';
import { cleanupRepositories, createRepository, git } from './testRepository';

afterEach(cleanupRepositories);
describe('TypeScript source index', () => {
  test('indexes declarations, named/default/namespace imports, type-only imports, JSX, styles, assets, and barrels', async () => {
    const root = createRepository({
      'src/dep.ts': "export default function defaultDep(){return 1}\nexport interface Model { id: string }\nexport const named = 2;\n",
      'src/barrel.ts': "export { named as renamed } from './dep';\n",
      'src/Child.tsx': "export function Child(){return <span/>}\n",
      'src/Feature.tsx': "import defaultDep, { type Model } from './dep';\nimport * as dep from './dep';\nimport { renamed } from './barrel';\nimport { Child } from './Child';\nimport './style.css';\nimport icon from './icon.svg';\nexport function Feature(value: Model){ return <Child data-x={defaultDep()+dep.named+renamed} data-icon={icon}>{value.id}</Child> }\n",
      'src/style.css': '.x{}\n', 'src/icon.svg': '<svg/>\n'
    }); const repository = new GitSourceRepository(root); const index = await buildSourceIndex(repository, git(root,['rev-parse','HEAD'])); const module = index.moduleByPath.get('src/Feature.tsx')!; const feature = module.declarations.find(item => item.name === 'Feature')!;
    expect(module.imports.map(item => item.kind)).toEqual(expect.arrayContaining(['default','type','namespace','style','asset'])); expect(feature.jsxReferences).toContain('Child');
    for (const name of ['defaultDep','Model','dep.named','renamed','Child']) expect(resolveImportedDeclaration(index, module, name), name).not.toBeNull();
    expect(resolveImportedDeclaration(index, module, 'renamed')?.name).toBe('named');
    expect(index.modules.map(item => item.path)).toEqual([...index.modules.map(item => item.path)].sort());
  });
  test('records unresolved static and dynamic imports rather than guessing', async () => { const root = createRepository({ 'src/A.tsx': "import { missing } from './missing'; export function A(){ const load=()=>import('./dynamic'); return <div>{missing}{String(load)}</div> }" }); const index = await buildSourceIndex(new GitSourceRepository(root), git(root,['rev-parse','HEAD'])); expect(index.moduleByPath.get('src/A.tsx')?.unresolved).toEqual(expect.arrayContaining([expect.stringContaining('Unresolved static import'), expect.stringContaining('Dynamic import')])); });
  test('indexes describe hierarchy, tests, modifiers, scoped hooks, helpers, fixtures, and callback references', async () => {
    const root = createRepository({
      'src/Feature.tsx': "export function Feature(){return <div>feature contract</div>} export function Other(){return <div>other contract</div>}\n",
      'src/feature.test.tsx': "import { Feature, Other } from './Feature';\nconst fixture={id:1};\nconst renderFeature=()=> <Feature data-id={fixture.id}/>;\ndescribe('suite',()=>{ beforeEach(()=>renderFeature()); test('direct',()=>renderFeature()); describe('nested',()=>{ afterEach(()=>fixture.id); it.concurrent('other',()=> <Other/>); test.each([[1]])('each',()=>renderFeature()); }); });\n"
    });
    const index = await buildSourceIndex(new GitSourceRepository(root), git(root,['rev-parse','HEAD'])); const module = index.moduleByPath.get('src/feature.test.tsx')!;
    expect(module.testUnits.map(unit => unit.kind)).toEqual(['describe','beforeEach','test','describe','afterEach','it','test']);
    const nested = module.testUnits.find(unit => unit.title === 'nested')!; const concurrent = module.testUnits.find(unit => unit.modifier === 'concurrent')!; const each = module.testUnits.find(unit => unit.modifier === 'each')!;
    expect(concurrent.enclosingDescribeKeys).toEqual([module.testUnits[0].key, nested.key]); expect(each.enclosingDescribeKeys).toEqual(concurrent.enclosingDescribeKeys);
    expect(module.declarations.map(item => item.name)).toEqual(expect.arrayContaining(['fixture','renderFeature']));
    expect(module.testUnits.find(unit => unit.kind === 'beforeEach')?.dependencies).toContain('renderFeature'); expect(concurrent.dependencies).toContain('Other');
  });
  test('reports an unsupported top-level dynamic test factory', async () => { const root = createRepository({ 'src/dynamic.test.ts': "const registry={feature:()=>1}; const name='feature'; createFeatureTests(registry[name]);\n" }); const index = await buildSourceIndex(new GitSourceRepository(root), git(root,['rev-parse','HEAD'])); expect(index.moduleByPath.get('src/dynamic.test.ts')?.unresolved).toContain('Unsupported top-level test factory at line 1'); });
});
