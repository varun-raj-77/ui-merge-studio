import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';

const fixture = resolve(import.meta.dirname, '../../fixtures/generated/product-catalogue');
const repository = new GitSourceRepository(fixture);
function selection(branch: string, path: string, line: number, componentName: string, previewId: string): SourceIdentity {
  return { boundaryId: `${componentName}-boundary`, instanceId: `${componentName}-instance`, repositoryRelativePath: path, line, column: 8, componentName, exportName: componentName, branch, previewId, sessionId: `${previewId}-session`, generation: 1, confidence: 'exact' };
}
async function analyze(branch: string, source: SourceIdentity) {
  return (await new FeatureSliceAnalyzer(fixture).analyze({ baseRef: 'main', branchRef: branch, expectedBranchCommit: await repository.resolveRef(branch), selection: source })).slice;
}
const paths = (slice: Awaited<ReturnType<typeof analyze>>) => new Set(slice.includedChanges.map(item => item.path));

describe('Product Catalogue fixture feature slices', () => {
  test('maps CategorySidebar and follows its dependencies while excluding the promotion', async () => {
    const source = selection('branch-a', 'src/features/catalogue/CategorySidebar.tsx', 10, 'CategorySidebar', 'left');
    const first = await analyze('branch-a', source);
    const second = await analyze('branch-a', source);
    const included = paths(first);
    expect(first.status, JSON.stringify(first.unresolvedDependencies, null, 2)).toBe('resolved');
    expect(first.boundary.original).toBe('CategorySidebar');
    for (const path of [
      'src/features/catalogue/CategorySidebar.tsx',
      'src/features/catalogue/CatalogueWorkspace.tsx',
      'src/hooks/useCategoryFilter.ts',
      'src/types/category.ts',
      'src/features/catalogue/category-sidebar.css',
      'src/test/category-sidebar.test.tsx'
    ]) expect(included.has(path), path).toBe(true);
    expect(included.has('src/features/catalogue/CatalogueHeader.tsx')).toBe(false);
    expect(first.excludedChanges.find(item => item.path === 'src/features/catalogue/CatalogueHeader.tsx')).toMatchObject({ classification: 'proven-unrelated', proof: 'proven' });
    const tests = first.testFileSlices.find(item => item.path === 'src/test/category-sidebar.test.tsx')!;
    expect(tests.includedUnits.map(item => item.title)).toEqual(['collapses, expands, and filters categories']);
    expect(tests.excludedUnits.map(item => item.title)).toEqual(['keeps the unrelated promotion visible only on branch A']);
    expect(second).toEqual(first);
  });

  test('maps ProductQuickViewShelf, its target configuration, and excludes the inventory sibling', async () => {
    const source = selection('branch-b', 'src/features/catalogue/ProductQuickViewShelf.tsx', 9, 'ProductQuickViewShelf', 'right');
    const first = await analyze('branch-b', source);
    const second = await analyze('branch-b', source);
    const included = paths(first);
    expect(first.status, JSON.stringify(first.unresolvedDependencies, null, 2)).toBe('resolved');
    for (const path of [
      'src/features/catalogue/ProductQuickView.tsx',
      'src/hooks/useSelectedProduct.ts',
      'src/features/catalogue/ProductQuickViewShelf.tsx',
      'src/features/catalogue/ProductGrid.tsx',
      'src/config/quickViewTargets.ts',
      'src/features/catalogue/quick-view.css',
      'src/test/quick-view.test.tsx'
    ]) expect(included.has(path), path).toBe(true);
    expect(included.has('src/utils/inventorySummary.ts')).toBe(false);
    expect(included.has('src/features/catalogue/CatalogueHeader.tsx')).toBe(false);
    const tests = first.testFileSlices.find(item => item.path === 'src/test/quick-view.test.tsx')!;
    expect(tests.includedUnits.map(item => item.title)).toEqual(['enables quick view only for configured stable product IDs', 'opens, focuses, and closes quick view']);
    expect(tests.excludedUnits.map(item => item.title)).toEqual(['keeps the inventory summary as a separate branch change']);
    expect(second).toEqual(first);
  });

  test('refuses stale branch commits and stale source locations', async () => {
    const source = selection('branch-a', 'src/features/catalogue/CategorySidebar.tsx', 10, 'CategorySidebar', 'left');
    const analyzer = new FeatureSliceAnalyzer(fixture);
    expect((await analyzer.analyze({ baseRef: 'main', branchRef: 'branch-a', expectedBranchCommit: '0'.repeat(40), selection: source })).slice.status).toBe('refused');
    expect((await analyzer.analyze({ baseRef: 'main', branchRef: 'branch-a', expectedBranchCommit: await repository.resolveRef('branch-a'), selection: { ...source, line: 999 } })).slice.status).toBe('refused');
  });
});
