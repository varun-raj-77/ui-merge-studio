import { describe, expect, it } from 'vitest';
import {
  CategorySidebarConfigurationRefusal,
  categorySidebarConfigurationIdentity,
  categorySidebarCandidateSourceConfiguration,
  categorySidebarRepositoryMetadata,
  configuredCategoryPreviewContext,
  createCategorySidebarConfigurationSelection,
  normalizeCategorySidebarConfiguration
} from '../../apps/studio/src/categorySidebarConfiguration';
import { defaultPreviewContext } from '../../apps/studio/src/previewContext';
import { candidateKey, categorySidebarDecision, emptyShowcaseSelection, showcaseSelectionReducer } from '../../apps/studio/src/showcaseSelection';
import { catalogueCapabilityFromRuntime, catalogueScopesForCapability } from '../../apps/studio/src/catalogueSelectionCapabilities';
import { initialSelectionHistory, selectionHistoryReducer } from '../../apps/studio/src/selectionHistory';

const proof = { enabledCategoryIds: ['travel', 'audio', 'desk'], defaultCategoryId: 'desk' };

function sidebarSelection() {
  const scope = catalogueScopesForCapability(catalogueCapabilityFromRuntime('category-sidebar', 'branch-a'))[0];
  return showcaseSelectionReducer(emptyShowcaseSelection, { type: 'toggle-scope', scope });
}

describe('category sidebar permanent configuration', () => {
  it('normalizes duplicates and click order to repository order and one canonical identity', () => {
    const first = normalizeCategorySidebarConfiguration(proof);
    const second = normalizeCategorySidebarConfiguration({ enabledCategoryIds: ['desk', 'audio', 'travel', 'audio'], defaultCategoryId: 'desk' });
    expect(first).toEqual({ enabledCategoryIds: ['audio', 'desk', 'travel'], defaultCategoryId: 'desk' });
    expect(second).toEqual(first);
    expect(categorySidebarConfigurationIdentity(first)).toBe('categories-audio_desk_travel--default-desk');
    expect(categorySidebarConfigurationIdentity(second)).toBe(categorySidebarConfigurationIdentity(first));
  });

  it.each([
    [{ enabledCategoryIds: [], defaultCategoryId: 'desk' }, 'Keep at least one category in the sidebar.'],
    [{ enabledCategoryIds: ['audio'], defaultCategoryId: 'desk' }, 'Choose a default category from the categories you kept.'],
    [{ enabledCategoryIds: ['audio', 'unknown'], defaultCategoryId: 'audio' }, 'One or more categories are not available for this sidebar.']
  ])('refuses invalid configuration %#', (value, message) => {
    expect(() => normalizeCategorySidebarConfiguration(value)).toThrow(CategorySidebarConfigurationRefusal);
    try { normalizeCategorySidebarConfiguration(value); } catch (error) {
      expect((error as CategorySidebarConfigurationRefusal).productMessage).toBe(message);
    }
  });

  it('retains ownership and keeps configuration identity separate from the candidate key', () => {
    const selected = sidebarSelection();
    const configured = showcaseSelectionReducer(selected, { type: 'configure-category-sidebar', configuration: createCategorySidebarConfigurationSelection(proof) });
    expect(categorySidebarDecision(configured)).toMatchObject({
      capabilityId: 'category-sidebar',
      branch: 'branch-a',
      route: '/catalogue',
      pageId: 'product-catalogue',
      configuration: {
        capabilityId: 'category-sidebar:options',
        sourceBranch: 'branch-a',
        identity: 'categories-audio_desk_travel--default-desk'
      }
    });
    expect(configured).not.toHaveProperty('categorySidebarConfiguration');
    expect(candidateKey(configured)).toBe(candidateKey(selected));
    expect(categorySidebarRepositoryMetadata.source).toEqual({ path: 'src/config/categorySidebarConfiguration.ts', declaration: 'categorySidebarConfiguration' });
    expect(categorySidebarCandidateSourceConfiguration({
      sliceId: 'category-slice',
      sidebarSelected: true,
      selection: categorySidebarDecision(configured)?.configuration
    }).value).toEqual({ enabledCategoryIds: ['audio', 'desk', 'travel'], defaultCategoryId: 'desk' });
  });

  it('keeps supported temporary context and explains fallback without mutating it', () => {
    const audio = { ...defaultPreviewContext, catalogue: { ...defaultPreviewContext.catalogue, categoryId: 'audio' as const } };
    expect(configuredCategoryPreviewContext(audio, normalizeCategorySidebarConfiguration(proof))).toEqual({ context: audio, notices: [] });
    const fallback = configuredCategoryPreviewContext(defaultPreviewContext, normalizeCategorySidebarConfiguration(proof));
    expect(fallback.context.catalogue.categoryId).toBe('desk');
    expect(defaultPreviewContext.catalogue.categoryId).toBe('all');
    expect(fallback.notices[0].message).toBe('All is not included in this result. Showing the default category, Desk.');
  });

  it('records customization as one atomic history decision', () => {
    const selected = sidebarSelection();
    const before = selectionHistoryReducer(initialSelectionHistory, { type: 'commit', selection: selected, label: 'Added Category sidebar' });
    const configured = showcaseSelectionReducer(selected, { type: 'configure-category-sidebar', configuration: createCategorySidebarConfigurationSelection(proof) });
    const applied = selectionHistoryReducer(before, { type: 'commit', selection: configured, label: 'Customized Category sidebar' });
    expect(applied.past).toHaveLength(2);
    const undone = selectionHistoryReducer(applied, { type: 'undo' });
    expect(categorySidebarDecision(undone.present)?.configuration).toBeFalsy();
    expect(categorySidebarDecision(selectionHistoryReducer(undone, { type: 'redo' }).present)?.configuration?.identity).toBe('categories-audio_desk_travel--default-desk');
  });

  it('atomically creates a configured sidebar and cannot be duplicated or downgraded by a stale Add', () => {
    const configured = showcaseSelectionReducer(emptyShowcaseSelection, { type: 'configure-category-sidebar', configuration: createCategorySidebarConfigurationSelection(proof) });
    const decision = categorySidebarDecision(configured);
    expect(configured.scopes).toHaveLength(1);
    expect(decision?.configuration?.identity).toBe('categories-audio_desk_travel--default-desk');
    const stalePlainAdd = showcaseSelectionReducer(configured, {
      type: 'toggle-scope',
      scope: catalogueScopesForCapability(catalogueCapabilityFromRuntime('category-sidebar', 'branch-a'))[0]
    });
    expect(stalePlainAdd).toBe(configured);
    expect(stalePlainAdd.scopes).toHaveLength(1);
    expect(categorySidebarDecision(stalePlainAdd)?.configuration?.identity).toBe(decision?.configuration?.identity);
    expect(categorySidebarCandidateSourceConfiguration({
      sliceId: 'slice',
      sidebarSelected: Boolean(decision),
      selection: decision?.configuration
    }).value).toEqual({ enabledCategoryIds: ['audio', 'desk', 'travel'], defaultCategoryId: 'desk' });
  });
});
