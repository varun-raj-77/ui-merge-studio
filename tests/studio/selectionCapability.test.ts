import { describe, expect, it } from 'vitest';
import {
  catalogueCapabilityForScope,
  catalogueCapabilityFromRuntime,
  cataloguePageId,
  catalogueRoute,
  catalogueScopesForCapability,
  catalogueSelectionCapabilities,
  categorySubsetCapabilityId,
  quickViewAllCapabilityId
} from '../../apps/studio/src/catalogueSelectionCapabilities';
import {
  candidateKey,
  emptyShowcaseSelection,
  showcaseSelectionReducer
} from '../../apps/studio/src/showcaseSelection';
import {
  createUnsupportedCapability,
  groupSelectionCapabilitiesByRoute,
  selectionCapabilityCompatibility,
  type SelectionCapability,
  type SelectionCapabilityKind
} from '../../apps/studio/src/selectionCapability';

describe('generic selection capability model', () => {
  it('represents every supported granularity with route and page identity', () => {
    const kinds = new Set<SelectionCapabilityKind>(
      catalogueSelectionCapabilities.map(capability => capability.kind)
    );
    expect(kinds).toEqual(new Set([
      'whole-feature',
      'feature-instance',
      'all-instances',
      'configurable-subset'
    ]));
    for (const capability of catalogueSelectionCapabilities) {
      expect(capability.route).toBe(catalogueRoute);
      expect(capability.pageId).toBe(cataloguePageId);
      expect(capability.sourceBranch).toMatch(/^branch-[ab]$/);
      expect(capability.label).not.toMatch(/\.(tsx?|jsx?)$|sidebar-\d--quick/);
    }
  });

  it('represents configurable category subsets with repository-owned targets', () => {
    const capability = catalogueCapabilityFromRuntime(
      categorySubsetCapabilityId,
      'branch-a'
    );
    expect(capability).toMatchObject({
      kind: 'configurable-subset',
      label: 'Customize categories',
      parentCapabilityId: 'category-sidebar',
      supported: true,
      targetIds: ['all', 'audio', 'desk', 'travel'],
      sourceEvidenceId: 'category-sidebar'
    });
    expect(catalogueScopesForCapability(capability)).toEqual([]);
  });

  it('maps all Quick View instances atomically to the existing canonical candidate', () => {
    const capability = catalogueCapabilityFromRuntime(
      quickViewAllCapabilityId,
      'branch-b'
    );
    const scopes = catalogueScopesForCapability(capability);
    expect(capability).toMatchObject({
      kind: 'all-instances',
      supported: true,
      sourceEvidenceId: 'quick-view'
    });
    expect(capability).not.toHaveProperty('parentCapabilityId');
    expect(scopes).toHaveLength(5);

    const fromCapability = scopes.reduce(
      (state, scope) => showcaseSelectionReducer(state, { type: 'toggle-scope', scope }),
      emptyShowcaseSelection
    );
    const individuallySelected = [...scopes].reverse().reduce(
      (state, scope) => showcaseSelectionReducer(state, { type: 'toggle-scope', scope }),
      emptyShowcaseSelection
    );
    expect(candidateKey(fromCapability)).toBe(candidateKey(individuallySelected));
    expect(candidateKey(fromCapability)).toBe('sidebar-0--quick-p-101_p-102_p-103_p-104_p-105');
  });

  it('round-trips current whole-feature and feature-instance scopes through capabilities', () => {
    const sidebar = catalogueScopesForCapability(
      catalogueCapabilityFromRuntime('category-sidebar', 'branch-a')
    )[0];
    const deskStand = catalogueScopesForCapability(
      catalogueCapabilityFromRuntime('product-quick-view:p-105', 'branch-b')
    )[0];
    expect(catalogueCapabilityForScope(sidebar)).toMatchObject({
      id: 'category-sidebar',
      kind: 'whole-feature',
      sourceEvidenceId: 'category-sidebar'
    });
    expect(catalogueCapabilityForScope(deskStand)).toMatchObject({
      id: 'product-quick-view:p-105',
      kind: 'feature-instance',
      parentCapabilityId: quickViewAllCapabilityId,
      targetIds: ['p-105']
    });
  });

  it('returns an explained unsupported capability for an undeclared visible boundary', () => {
    expect(catalogueCapabilityFromRuntime(
      'catalogue-heading',
      'branch-a',
      'Catalogue heading'
    )).toEqual({
      id: 'catalogue-heading',
      label: 'Catalogue heading',
      kind: 'unsupported',
      sourceBranch: 'branch-a',
      route: catalogueRoute,
      pageId: cataloguePageId,
      supported: false,
      unsupportedReason: 'Catalogue heading has no independently verified source boundary.'
    });
  });

  it('refuses unsupported selections and groups supported selections by original route', () => {
    const catalogue = catalogueCapabilityFromRuntime('category-sidebar', 'branch-a');
    const settings: SelectionCapability = {
      id: 'settings-panel',
      label: 'Settings panel',
      kind: 'whole-feature',
      sourceBranch: 'branch-b',
      route: '/settings',
      pageId: 'settings',
      supported: true
    };
    expect(selectionCapabilityCompatibility([catalogue, settings])).toMatchObject({
      compatible: true,
      groups: [
        { route: '/catalogue', pageId: 'product-catalogue' },
        { route: '/settings', pageId: 'settings' }
      ]
    });
    expect(groupSelectionCapabilitiesByRoute([settings, catalogue])).toMatchObject([
      { route: '/catalogue', pageId: 'product-catalogue' },
      { route: '/settings', pageId: 'settings' }
    ]);

    const unsupported = createUnsupportedCapability(
      'summary',
      'Summary',
      'branch-b',
      '/catalogue',
      'product-catalogue',
      'No safe declaration boundary.'
    );
    expect(selectionCapabilityCompatibility([catalogue, unsupported])).toEqual({
      compatible: false,
      reason: 'No safe declaration boundary.'
    });
  });
});
