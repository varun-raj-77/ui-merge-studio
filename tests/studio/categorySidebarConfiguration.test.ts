import { describe, expect, it } from 'vitest';
import {
  CategorySidebarConfigurationRefusal,
  categorySidebarConfigurationIdentity,
  categorySidebarCandidateSourceConfiguration,
  categoryProductCounts,
  categorySidebarRepositoryMetadata,
  completeCategorySidebarConfiguration,
  configuredCategoryPreviewContext,
  createCategorySidebarConfigurationSelection,
  normalizeCategorySidebarConfiguration
} from '../../apps/studio/src/categorySidebarConfiguration';
import { defaultPreviewContext } from '../../apps/studio/src/previewContext';
import { candidateKey, categorySidebarDecision, emptyShowcaseSelection, showcaseSelectionReducer } from '../../apps/studio/src/showcaseSelection';
import { catalogueCapabilityFromRuntime, catalogueScopesForCapability } from '../../apps/studio/src/catalogueSelectionCapabilities';
import { initialSelectionHistory, selectionHistoryReducer } from '../../apps/studio/src/selectionHistory';

const proof = { enabledCategoryIds: ['travel', 'audio', 'desk'], defaultCategoryId: 'desk', showHeading: false, showProductCounts: true };

function sidebarSelection() {
  const scope = catalogueScopesForCapability(catalogueCapabilityFromRuntime('category-sidebar', 'branch-a'))[0];
  return showcaseSelectionReducer(emptyShowcaseSelection, { type: 'toggle-scope', scope });
}

describe('category sidebar permanent configuration', () => {
  it('preserves the existing sidebar as the canonical default appearance', () => {
    expect(completeCategorySidebarConfiguration).toEqual({
      enabledCategoryIds: ['all', 'audio', 'desk', 'travel'],
      defaultCategoryId: 'all',
      showHeading: true,
      showProductCounts: false
    });
  });

  it('normalizes duplicates and click order to repository order and one canonical identity', () => {
    const first = normalizeCategorySidebarConfiguration(proof);
    const second = normalizeCategorySidebarConfiguration({ ...proof, enabledCategoryIds: ['desk', 'audio', 'travel', 'audio'] });
    expect(first).toEqual({ enabledCategoryIds: ['audio', 'desk', 'travel'], defaultCategoryId: 'desk', showHeading: false, showProductCounts: true });
    expect(second).toEqual(first);
    expect(categorySidebarConfigurationIdentity(first)).toBe('categories-audio_desk_travel--default-desk--heading-hidden--counts-shown');
    expect(categorySidebarConfigurationIdentity(second)).toBe(categorySidebarConfigurationIdentity(first));
  });

  it.each([
    [{ ...proof, enabledCategoryIds: [] }, 'Keep at least one category in the sidebar.'],
    [{ ...proof, enabledCategoryIds: ['audio'] }, 'Choose a default category from the categories you kept.'],
    [{ ...proof, enabledCategoryIds: ['audio', 'unknown'], defaultCategoryId: 'audio' }, 'One or more categories are not available for this sidebar.'],
    [{ enabledCategoryIds: ['audio'], defaultCategoryId: 'audio', showProductCounts: true } as never, 'Choose valid sidebar appearance options.'],
    [{ ...proof, showHeading: 'no' } as never, 'Choose valid sidebar appearance options.']
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
        identity: 'categories-audio_desk_travel--default-desk--heading-hidden--counts-shown'
      }
    });
    expect(configured).not.toHaveProperty('categorySidebarConfiguration');
    expect(candidateKey(configured)).toBe(candidateKey(selected));
    expect(categorySidebarRepositoryMetadata.source).toEqual({ path: 'src/config/categorySidebarConfiguration.ts', declaration: 'categorySidebarConfiguration' });
    expect(categorySidebarCandidateSourceConfiguration({
      sliceId: 'category-slice',
      sidebarSelected: true,
      selection: categorySidebarDecision(configured)?.configuration
    }).value).toEqual({ enabledCategoryIds: ['audio', 'desk', 'travel'], defaultCategoryId: 'desk', showHeading: false, showProductCounts: true });
    expect(categoryProductCounts()).toEqual({ all: 5, audio: 2, desk: 2, travel: 1 });
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
    expect(categorySidebarDecision(undone.present)?.configuration?.identity).toBe('categories-all_audio_desk_travel--default-all--heading-shown--counts-hidden');
    expect(categorySidebarDecision(selectionHistoryReducer(undone, { type: 'redo' }).present)?.configuration?.identity).toBe('categories-audio_desk_travel--default-desk--heading-hidden--counts-shown');
  });

  it('atomically creates a configured sidebar and cannot be duplicated or downgraded by a stale Add', () => {
    const configured = showcaseSelectionReducer(emptyShowcaseSelection, { type: 'configure-category-sidebar', configuration: createCategorySidebarConfigurationSelection(proof) });
    const decision = categorySidebarDecision(configured);
    expect(configured.selections).toHaveLength(1);
    expect(decision?.configuration?.identity).toBe('categories-audio_desk_travel--default-desk--heading-hidden--counts-shown');
    const stalePlainAdd = showcaseSelectionReducer(configured, {
      type: 'toggle-scope',
      scope: catalogueScopesForCapability(catalogueCapabilityFromRuntime('category-sidebar', 'branch-a'))[0]
    });
    expect(stalePlainAdd).toBe(configured);
    expect(stalePlainAdd.selections).toHaveLength(1);
    expect(categorySidebarDecision(stalePlainAdd)?.configuration?.identity).toBe(decision?.configuration?.identity);
    expect(categorySidebarCandidateSourceConfiguration({
      sliceId: 'slice',
      sidebarSelected: Boolean(decision),
      selection: decision?.configuration
    }).value).toEqual({ enabledCategoryIds: ['audio', 'desk', 'travel'], defaultCategoryId: 'desk', showHeading: false, showProductCounts: true });
    expect(() => categorySidebarCandidateSourceConfiguration({
      sliceId: 'slice',
      sidebarSelected: true,
      selection: {
        ...decision!.configuration!,
        configuration: { enabledCategoryIds: ['audio'], defaultCategoryId: 'audio', showHeading: false } as never
      }
    })).toThrow('showHeading and showProductCounts must both be boolean values');
  });
});
