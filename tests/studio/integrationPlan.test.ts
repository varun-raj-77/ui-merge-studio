import { describe, expect, it } from 'vitest';
import {
  IntegrationPlanRefusal,
  parseIntegrationPlan,
  serializeIntegrationPlan,
  type IntegrationPlanV1
} from '../../packages/integration-plan/src/integrationPlan';
import { catalogueManifest } from '../../apps/studio/src/catalogueEvidence';
import {
  catalogueIntegrationPlanAdapter,
  cataloguePlanIdentity,
  canonicalizeCatalogueIntegrationPlan,
  emptyCatalogueIntegrationPlan,
  historicalCandidateKeyForPlan,
  integrationPlanToEvidenceSummary,
  integrationPlanToGenerationRequest,
  integrationPlanToPreviewModel,
  integrationPlanToVerificationExpectations,
  quickViewPlanDecision,
  replacePlanSelection,
  sidebarPlanDecision
} from '../../apps/studio/src/catalogueIntegrationPlan';
import { completeCategorySidebarConfiguration, type CategorySidebarConfiguration } from '../../apps/studio/src/categorySidebarConfiguration';
import type { CatalogueProductId } from '../../apps/studio/src/catalogueProducts';
import { defaultPreviewContext } from '../../apps/studio/src/previewContext';

const proofConfiguration: CategorySidebarConfiguration = {
  enabledCategoryIds: ['travel', 'audio', 'desk'],
  defaultCategoryId: 'desk',
  showHeading: false,
  showProductCounts: true
};

function planFor(options: {
  sidebar?: CategorySidebarConfiguration;
  quickViews?: CatalogueProductId[];
} = {}) {
  let plan = emptyCatalogueIntegrationPlan;
  if (options.sidebar) plan = replacePlanSelection(plan, sidebarPlanDecision(options.sidebar));
  for (const productId of options.quickViews ?? []) {
    plan = replacePlanSelection(plan, quickViewPlanDecision(productId));
  }
  return plan;
}

describe('canonical Integration Plan', () => {
  it('has an explicit empty, versioned foundation plan', () => {
    expect(emptyCatalogueIntegrationPlan).toEqual({
      version: 1,
      foundation: { branchRef: 'main', role: 'base' },
      selections: []
    });
  });

  it('round-trips stable serialization and canonicalizes selection, category, and target order', () => {
    const forward = planFor({ sidebar: proofConfiguration, quickViews: ['p-105', 'p-103'] });
    const reverse = planFor({
      sidebar: { ...proofConfiguration, enabledCategoryIds: ['desk', 'travel', 'audio'] },
      quickViews: ['p-103', 'p-105']
    });
    const serialized = serializeIntegrationPlan(forward, catalogueIntegrationPlanAdapter);
    expect(parseIntegrationPlan(serialized, catalogueIntegrationPlanAdapter)).toEqual(forward);
    expect(reverse).toEqual(forward);
    expect(cataloguePlanIdentity(reverse)).toBe(cataloguePlanIdentity(forward));
    expect(integrationPlanToPreviewModel(reverse)).toEqual(integrationPlanToPreviewModel(forward));
    expect(integrationPlanToGenerationRequest(reverse)).toEqual(integrationPlanToGenerationRequest(forward));
    expect(integrationPlanToVerificationExpectations(reverse)).toEqual(integrationPlanToVerificationExpectations(forward));
  });

  it('normalizes exact duplicates but refuses conflicting duplicate decisions', () => {
    const sidebar = sidebarPlanDecision(proofConfiguration);
    expect(canonicalizeCatalogueIntegrationPlan({
      version: 1,
      foundation: { branchRef: 'main', role: 'base' },
      selections: [sidebar, sidebar]
    })).toEqual(planFor({ sidebar: proofConfiguration }));
    expect(() => canonicalizeCatalogueIntegrationPlan({
      version: 1,
      foundation: { branchRef: 'main', role: 'base' },
      selections: [sidebar, sidebarPlanDecision(completeCategorySidebarConfiguration)]
    })).toThrow(/conflicting decisions/i);
  });

  it.each([
    ['unsupported version', { ...emptyCatalogueIntegrationPlan, version: 2 }, /version/i],
    ['unknown capability', { ...emptyCatalogueIntegrationPlan, selections: [{ capabilityId: 'unknown', capabilityKind: 'whole-feature', sourceBranch: 'branch-a', route: '/catalogue', pageId: 'product-catalogue' }] }, /not supported/i],
    ['wrong branch', { ...emptyCatalogueIntegrationPlan, selections: [{ ...sidebarPlanDecision(), sourceBranch: 'branch-b' }] }, /different source version/i],
    ['relocated route', { ...emptyCatalogueIntegrationPlan, selections: [{ ...sidebarPlanDecision(), route: '/elsewhere' }] }, /cannot be moved/i],
    ['orphan configuration', { ...emptyCatalogueIntegrationPlan, selections: [{ capabilityId: 'category-sidebar:options', capabilityKind: 'configurable-subset', sourceBranch: 'branch-a', route: '/catalogue', pageId: 'product-catalogue' }] }, /Add the Category sidebar/i],
    ['no categories', { ...emptyCatalogueIntegrationPlan, selections: [{ ...sidebarPlanDecision(), configuration: { ...sidebarPlanDecision().configuration, enabledCategoryIds: [] } }] }, /at least one category/i],
    ['invalid default', { ...emptyCatalogueIntegrationPlan, selections: [{ ...sidebarPlanDecision(), configuration: { ...sidebarPlanDecision().configuration, enabledCategoryIds: ['audio'], defaultCategoryId: 'desk' } }] }, /default category/i],
    ['unknown category', { ...emptyCatalogueIntegrationPlan, selections: [{ ...sidebarPlanDecision(), configuration: { ...sidebarPlanDecision().configuration, enabledCategoryIds: ['audio', 'bogus'] } }] }, /not available/i],
    ['unknown product', { ...emptyCatalogueIntegrationPlan, selections: [{ ...quickViewPlanDecision('p-101'), capabilityId: 'product-quick-view:p-999', targetIds: ['p-999'] }] }, /stable product ID/i],
    ['duplicated Quick View target', { ...emptyCatalogueIntegrationPlan, selections: [{ ...quickViewPlanDecision('p-101'), targetIds: ['p-101', 'p-101'] }] }, /target one product once/i],
    ['incompatible adapter schema', { ...emptyCatalogueIntegrationPlan, selections: [{ ...sidebarPlanDecision(), configuration: { ...sidebarPlanDecision().configuration, schemaVersion: 9 } }] }, /unsupported version/i]
  ])('refuses %s before projection', (_label, value, message) => {
    expect(() => canonicalizeCatalogueIntegrationPlan(value as IntegrationPlanV1)).toThrow(message);
  });

  it('uses product-language refusals with technical details', () => {
    try {
      canonicalizeCatalogueIntegrationPlan({ ...emptyCatalogueIntegrationPlan, version: 9 } as unknown as IntegrationPlanV1);
      throw new Error('Expected refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(IntegrationPlanRefusal);
      expect((error as IntegrationPlanRefusal).productMessage).toMatch(/version/i);
      expect((error as IntegrationPlanRefusal).technicalDetail).toMatch(/Expected plan version 1/i);
    }
  });

  it('keeps identity independent from temporary browsing context', () => {
    const plan = planFor({ sidebar: proofConfiguration, quickViews: ['p-103', 'p-105'] });
    const identity = cataloguePlanIdentity(plan);
    const browsing = {
      ...defaultPreviewContext,
      catalogue: { ...defaultPreviewContext.catalogue, categoryId: 'audio' as const }
    };
    expect(browsing.catalogue.categoryId).toBe('audio');
    expect(cataloguePlanIdentity(plan)).toBe(identity);
  });
});

describe('Product Catalogue projections', () => {
  it('derives preview, generation, verification, and evidence from the same plan', () => {
    const plan = planFor({ sidebar: proofConfiguration, quickViews: ['p-105', 'p-103'] });
    const identity = cataloguePlanIdentity(plan);
    const preview = integrationPlanToPreviewModel(plan);
    const generation = integrationPlanToGenerationRequest(plan);
    const verification = integrationPlanToVerificationExpectations(plan);
    const evidence = integrationPlanToEvidenceSummary(plan);
    expect([preview.planIdentity, generation.planIdentity, verification.planIdentity, evidence.planIdentity]).toEqual([
      identity, identity, identity, identity
    ]);
    expect(preview.sidebar).toEqual({ enabledCategoryIds: ['audio', 'desk', 'travel'], defaultCategoryId: 'desk', showHeading: false, showProductCounts: true });
    expect(preview.quickViewProductIds).toEqual(['p-103', 'p-105']);
    expect(generation.foundation).toEqual({ branchRef: 'main', role: 'base' });
    expect(generation.sourceConfigurations).toEqual(expect.arrayContaining([
      expect.objectContaining({ declaration: 'categorySidebarConfiguration', value: preview.sidebar }),
      expect.objectContaining({ declaration: 'quickViewTargetIds', value: ['p-103', 'p-105'] })
    ]));
    expect(verification).toMatchObject({ sidebarPresent: true, defaultCategoryId: 'desk', headingVisible: false, countsVisible: true });
    expect(verification.categories).toEqual({ all: false, audio: true, desk: true, travel: true });
    expect(verification.categoryCounts).toEqual({ all: 5, audio: 2, desk: 2, travel: 1 });
    expect(verification.quickViewByProductId).toEqual({ 'p-101': false, 'p-102': false, 'p-103': true, 'p-104': false, 'p-105': true });
    expect(evidence.groups[0].rows).toEqual([
      { capabilityId: 'category-sidebar', label: 'Category sidebar', sourceBranch: 'branch-a', sourceLabel: 'Version A', details: ['Audio, Desk, Travel', 'Default: Desk', 'Heading: Hidden', 'Counts: Shown'] },
      { capabilityId: 'product-quick-view', label: 'Quick View', sourceBranch: 'branch-b', sourceLabel: 'Version B', details: ['Task Lamp', 'Desk Stand'] }
    ]);
  });

  it('supports a non-matrix configuration without a historical artifact dependency', () => {
    const plan = planFor({
      sidebar: { enabledCategoryIds: ['audio', 'travel'], defaultCategoryId: 'travel', showHeading: false, showProductCounts: true },
      quickViews: ['p-101', 'p-104']
    });
    const preview = integrationPlanToPreviewModel(plan);
    expect(preview.sidebar?.enabledCategoryIds).toEqual(['audio', 'travel']);
    expect(preview.quickViewProductIds).toEqual(['p-101', 'p-104']);
    expect(integrationPlanToGenerationRequest(plan).planIdentity).toBe(preview.planIdentity);
    expect(integrationPlanToVerificationExpectations(plan)).toMatchObject({
      planIdentity: preview.planIdentity,
      categories: { all: false, audio: true, desk: false, travel: true },
      quickViewByProductId: { 'p-101': true, 'p-102': false, 'p-103': false, 'p-104': true, 'p-105': false }
    });
  });

  it('refuses generation for the Product-ID conflict while preserving a renderable plan model', () => {
    const safe = planFor({ quickViews: ['p-105'] });
    const conflicted = canonicalizeCatalogueIntegrationPlan({
      ...safe,
      selections: [...safe.selections, {
        capabilityId: 'experimental-product-id', capabilityKind: 'whole-feature', sourceBranch: 'branch-incompatible', route: '/catalogue', pageId: 'product-catalogue'
      }]
    });
    expect(integrationPlanToPreviewModel(conflicted).refused).toBe(true);
    expect(() => integrationPlanToGenerationRequest(conflicted)).toThrow(/unsafe/i);
  });
});

describe('64-candidate historical parity oracle', () => {
  it('preserves every historical key and derives matching structured behavior for all 64 candidates', () => {
    const mismatches: string[] = [];
    expect(catalogueManifest.candidates).toHaveLength(64);
    for (const candidate of catalogueManifest.candidates) {
      const plan = planFor({
        ...(candidate.selection.sidebar ? { sidebar: completeCategorySidebarConfiguration } : {}),
        quickViews: candidate.selection.quickViewProductIds as CatalogueProductId[]
      });
      const preview = integrationPlanToPreviewModel(plan);
      if (historicalCandidateKeyForPlan(plan) !== candidate.key) mismatches.push(`${candidate.key}: key`);
      if (Boolean(preview.sidebar) !== candidate.selection.sidebar) mismatches.push(`${candidate.key}: sidebar`);
      if (preview.quickViewProductIds.join(',') !== candidate.selection.quickViewProductIds.join(',')) mismatches.push(`${candidate.key}: Quick View targets`);
      if (Object.keys(integrationPlanToVerificationExpectations(plan).quickViewByProductId).join(',') !== catalogueManifest.productIds.join(',')) mismatches.push(`${candidate.key}: product IDs`);
      for (const productId of catalogueManifest.productIds) {
        const expected = candidate.selection.quickViewProductIds.includes(productId);
        if (integrationPlanToVerificationExpectations(plan).quickViewByProductId[productId as keyof ReturnType<typeof integrationPlanToVerificationExpectations>['quickViewByProductId']] !== expected) {
          mismatches.push(`${candidate.key}: ${productId}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
    expect(new Set(catalogueManifest.candidates.map(candidate => candidate.key))).toHaveLength(64);
  });
});
