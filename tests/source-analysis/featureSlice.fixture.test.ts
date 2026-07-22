import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';

const fixture = resolve(import.meta.dirname, '../../fixtures/generated/support-dashboard');
const repository = new GitSourceRepository(fixture);
function selection(branch: string, path: string, line: number, componentName: string, previewId: string): SourceIdentity { return { boundaryId: `${componentName}-boundary`, instanceId: `${componentName}-instance`, repositoryRelativePath: path, line, column: 8, componentName, exportName: componentName, branch, previewId, sessionId: `${previewId}-session`, generation: 1, confidence: 'exact' }; }
async function analyze(branch: string, source: SourceIdentity) { return (await new FeatureSliceAnalyzer(fixture).analyze({ baseRef: 'main', branchRef: branch, expectedBranchCommit: await repository.resolveRef(branch), selection: source })).slice; }
function paths(slice: Awaited<ReturnType<typeof analyze>>) { return new Set(slice.includedChanges.map(item => item.path)); }

describe('controlled fixture feature slices', () => {
  test('extracts the sidebar graph while proving the mixed heading delta unrelated', async () => {
    const source = selection('branch-sidebar', 'src/features/navigation/AppSidebar.tsx', 4, 'AppSidebar', 'left');
    const first = await analyze('branch-sidebar', source); const second = await analyze('branch-sidebar', source); const included = paths(first);
    expect(first.status).toBe('resolved'); expect(first.boundary).toMatchObject({ original: 'AppSidebar', analyzed: 'AppSidebar', status: 'selected-boundary-sufficient' });
    for (const path of ['src/features/navigation/AppSidebar.tsx','src/features/navigation/SidebarNavItem.tsx','src/hooks/useSidebarState.ts','src/types/navigation.ts','src/styles/app.css','src/test/sidebar.test.tsx']) expect(included.has(path), path).toBe(true);
    const heading = first.excludedChanges.find(item => item.path === 'src/features/tickets/TicketPage.tsx'); expect(heading).toMatchObject({ classification: 'proven-unrelated', proof: 'proven' });
    expect(first.evidence).toContainEqual(expect.objectContaining({ type: 'existing-base-edge', to: 'src/features/tickets/TicketPage.tsx#TicketPage', baseState: 'existing' }));
    expect(first.includedChanges.some(item => item.path === 'src/features/tickets/TicketPage.tsx')).toBe(false);
    const sidebarTests = first.testFileSlices.find(item => item.path === 'src/test/sidebar.test.tsx')!; expect(sidebarTests.mode).toBe('test-units'); expect(sidebarTests.includedUnits).toHaveLength(1); expect(sidebarTests.excludedUnits).toEqual([]); expect(sidebarTests.includedUnits[0].title).toContain('collapses accessibly');
    expect(first.includedChanges.find(item => item.path === 'src/test/sidebar.test.tsx')).toMatchObject({ wholeFile: false, confidence: 'exact' });
    expect(second).toEqual(first);
  });
  test('escalates ActivityFilters to the existing inspector boundary and excludes sorting', async () => {
    const source = selection('branch-inspector', 'src/features/tickets/ActivityFilters.tsx', 3, 'ActivityFilters', 'right');
    const first = await analyze('branch-inspector', source); const second = await analyze('branch-inspector', source); const included = paths(first);
    expect(first.status).toBe('resolved'); expect(first.boundary).toMatchObject({ original: 'ActivityFilters', analyzed: 'TicketInspector', status: 'expanded-to-integration-boundary' });
    for (const path of ['src/features/tickets/ActivityFilters.tsx','src/features/tickets/TicketActivityList.tsx','src/features/tickets/TicketHeader.tsx','src/hooks/useActivityFilter.ts','src/hooks/useCopyReference.ts','src/types/inspector.ts','src/utils/severitySummary.ts','src/styles/inspector.css','src/main.tsx','src/test/inspector.test.tsx']) expect(included.has(path), path).toBe(true);
    for (const path of ['src/features/tickets/TicketList.tsx','src/utils/sortTickets.ts']) { expect(included.has(path), path).toBe(false); expect(first.excludedChanges.find(item => item.path === path)).toMatchObject({ classification: 'proven-unrelated', proof: 'proven' }); }
    const inspectorTests = first.testFileSlices.find(item => item.path === 'src/test/inspector.test.tsx')!; expect(inspectorTests.mode).toBe('test-units');
    expect(inspectorTests.includedUnits.map(item => item.title)).toEqual(['filters activity and reports clipboard failure']); expect(inspectorTests.excludedUnits.map(item => item.title)).toEqual(['sorts ticket list newest first']);
    expect(inspectorTests.requiredImports.map(item => item.local)).toEqual(['renderApp','fireEvent','screen']); expect(inspectorTests.excludedImports).toEqual([]);
    expect(first.includedChanges.find(item => item.path === 'src/test/inspector.test.tsx')).toMatchObject({ wholeFile: false, confidence: 'exact' });
    expect(first.includedChanges.some(item => item.path.includes('navigation'))).toBe(false);
    expect(second).toEqual(first);
  });
  test('refuses stale branch commit and stale source location', async () => {
    const source = selection('branch-sidebar', 'src/features/navigation/AppSidebar.tsx', 4, 'AppSidebar', 'left');
    const analyzer = new FeatureSliceAnalyzer(fixture);
    expect((await analyzer.analyze({ baseRef: 'main', branchRef: 'branch-sidebar', expectedBranchCommit: '0'.repeat(40), selection: source })).slice).toMatchObject({ status: 'refused' });
    expect((await analyzer.analyze({ baseRef: 'main', branchRef: 'branch-sidebar', expectedBranchCommit: await repository.resolveRef('branch-sidebar'), selection: { ...source, line: 999 } })).slice).toMatchObject({ status: 'refused' });
  });
});
