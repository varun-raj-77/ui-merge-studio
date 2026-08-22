import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { branches, generated, git } from './fixture-lib';

export function verifyFixture(repo = generated) {
  const failures: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  check(existsSync(resolve(repo, '.git')), 'generated fixture repository is missing');
  if (failures.length) throw new Error(failures.join('\n'));

  check(git(repo, ['status', '--porcelain']) === '', 'working tree must be clean');
  const existing = git(repo, ['branch', '--format=%(refname:short)']).split(/\r?\n/);
  for (const branch of branches) check(existing.includes(branch), `missing branch: ${branch}`);
  check(git(repo, ['tag', '--list']) === '', 'tags are forbidden in the controlled fixture');
  if (failures.length) throw new Error(failures.join('\n'));

  const base = git(repo, ['rev-parse', 'main']);
  for (const branch of branches.slice(1)) {
    check(git(repo, ['merge-base', 'main', branch]) === base, `${branch} does not use the exact main base`);
    check(git(repo, ['rev-list', '--count', `main..${branch}`]) === '1', `${branch} must be exactly one commit ahead`);
  }

  const branchADiff = git(repo, ['show', '--format=', 'branch-a']);
  check(branchADiff.includes('CategorySidebar'), 'branch-a lacks the selected category sidebar');
  check(branchADiff.includes('useCategoryFilter'), 'branch-a lacks its category state dependency');
  check(branchADiff.includes('filters categories'), 'branch-a lacks its focused behavior test');
  check(branchADiff.includes('PromotionalBanner'), 'branch-a lacks the unrelated promotion change used to prove exclusion');

  const branchBDiff = git(repo, ['show', '--format=', 'branch-b']);
  check(branchBDiff.includes('ProductQuickView'), 'branch-b lacks the selected quick-view panel');
  check(branchBDiff.includes('ProductQuickViewShelf'), 'branch-b lacks the direct-child quick-view integration');
  check(branchBDiff.includes('useSelectedProduct'), 'branch-b lacks its selection state dependency');
  check(branchBDiff.includes('opens, focuses, and closes quick view'), 'branch-b lacks its focused behavior test');
  const branchBHeader = git(repo, ['show', 'branch-b:src/features/catalogue/CatalogueHeader.tsx']);
  const branchBTree = git(repo, ['ls-tree', '-r', '--name-only', 'branch-b']).split(/\r?\n/);
  check(branchBHeader.includes('inventorySummary') && branchBTree.includes('src/utils/inventorySummary.ts'), 'branch-b lacks the unrelated inventory change used to prove exclusion');

  const incompatibleDiff = git(repo, ['show', '--format=', 'branch-incompatible']);
  check(incompatibleDiff.includes('id: number'), 'branch-incompatible lacks the conflicting Product.id contract');
  check(incompatibleDiff.includes('ProductIdentityBadge'), 'branch-incompatible lacks its visible identity badge');

  const trackedNames = branches.flatMap(branch =>
    git(repo, ['ls-tree', '-r', '--name-only', branch]).split(/\r?\n/)
  );
  const forbidden = trackedNames.filter(name =>
    /(?:\.patch$|combined-result|feature-manifest|selected-slice|node_modules|^dist\/)/i.test(name)
  );
  check(forbidden.length === 0, `forbidden prepared artifacts: ${forbidden.join(', ')}`);

  const branchANames = git(repo, ['diff', '--name-only', 'main..branch-a']);
  const branchBNames = git(repo, ['diff', '--name-only', 'main..branch-b']);
  check(
    branchANames.includes('src/hooks/useCategoryFilter.ts') &&
      branchANames.includes('src/test/category-sidebar.test.tsx'),
    'branch-a lacks required supporting source or test'
  );
  check(
    branchBNames.includes('src/hooks/useSelectedProduct.ts') &&
      branchBNames.includes('src/test/quick-view.test.tsx'),
    'branch-b lacks required supporting source or test'
  );
  check(!branchANames.includes('src/features/catalogue/ProductQuickView.tsx'), 'branch-a contains branch-b behavior');
  check(!branchBNames.includes('src/features/catalogue/CategorySidebar.tsx'), 'branch-b contains branch-a behavior');

  const hasCandidate = existing.includes('combined-result');
  if (hasCandidate) {
    check(git(repo, ['merge-base', 'main', 'combined-result']) === base, 'combined-result must start at main');
    check(git(repo, ['rev-list', '--count', 'main..combined-result']) === '1', 'combined-result must be one commit ahead');
    check(git(repo, ['rev-parse', 'combined-result^']) === base, 'combined-result parent must be main');

    const names = git(repo, ['diff', '--name-only', 'main..combined-result']).split(/\r?\n/);
    const workspace = git(repo, ['show', 'combined-result:src/features/catalogue/CatalogueWorkspace.tsx']);
    const grid = git(repo, ['show', 'combined-result:src/features/catalogue/ProductGrid.tsx']);
    const header = git(repo, ['show', 'combined-result:src/features/catalogue/CatalogueHeader.tsx']);
    const categoryTest = git(repo, ['show', 'combined-result:src/test/category-sidebar.test.tsx']);
    const quickViewTest = git(repo, ['show', 'combined-result:src/test/quick-view.test.tsx']);
    const categoryConfiguration = git(repo, ['show', 'combined-result:src/config/categorySidebarConfiguration.ts']);
    const quickViewConfiguration = git(repo, ['show', 'combined-result:src/config/quickViewTargets.ts']);
    check(workspace.includes('CategorySidebar') && grid.includes('ProductQuickViewShelf'), 'candidate lacks both selected features');
    check(names.includes('src/hooks/useCategoryFilter.ts'), 'candidate lacks category dependency');
    check(names.includes('src/hooks/useSelectedProduct.ts'), 'candidate lacks quick-view dependency');
    check(!header.includes('PromotionalBanner'), 'candidate contains branch-a unrelated promotion');
    check(!names.includes('src/utils/inventorySummary.ts'), 'candidate contains branch-b unrelated inventory utility');
    check(!quickViewTest.includes('inventory summary'), 'candidate contains unrelated inventory test');
    check(categoryTest.includes('filters categories'), 'candidate lacks category behavior test');
    check(quickViewTest.includes('opens, focuses, and closes quick view'), 'candidate lacks quick-view behavior test');
    check(
      categoryConfiguration.includes('"enabledCategoryIds": ["audio", "desk", "travel"]')
        && categoryConfiguration.includes('"defaultCategoryId": "desk"')
        && !categoryConfiguration.includes('"all"'),
      'candidate lacks the exact configured category subset and Desk default'
    );
    check(
      quickViewConfiguration.includes('["p-105"]') && !quickViewConfiguration.includes('p-101'),
      'candidate lacks the exact Desk Stand Quick View configuration'
    );
  }

  if (failures.length) throw new Error(failures.join('\n'));
  console.log(`PASS: product catalogue fixture contract verified at ${repo}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) verifyFixture();
