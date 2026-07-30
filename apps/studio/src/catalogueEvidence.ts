import manifestJson from './generated/showcaseRun.json';
import { validatePublicShowcaseReport, type PublicCandidate, type PublicFeature } from '../../../packages/showcase-evidence/src/schema';
import type { ShowcaseScope } from './showcaseSelection';

export const catalogueManifest = validatePublicShowcaseReport(manifestJson);
export const catalogueFeatures = Object.fromEntries(catalogueManifest.features.map(feature => [feature.id, feature])) as Record<PublicFeature['id'], PublicFeature>;
export const catalogueCandidates = new Map(catalogueManifest.candidates.map(candidate => [candidate.key, candidate]));
export const recordedRefusal = catalogueManifest.refusal;

export function resolveCatalogueCandidate(key: string): PublicCandidate {
  const candidate = catalogueCandidates.get(key);
  if (!candidate) throw new Error(`Generated Showcase candidate ${key} is missing.`);
  return candidate;
}

export function evidenceForScope(scope: ShowcaseScope) {
  const feature = catalogueFeatures[scope.featureId === 'product-quick-view' ? 'quick-view' : 'category-sidebar'];
  return {
    ...feature,
    instanceId: scope.kind === 'feature-instance' ? scope.instanceId : null,
    configuration: scope.kind === 'feature-instance'
      ? { path: 'src/config/quickViewTargets.ts', declaration: 'quickViewTargetIds' }
      : null
  };
}
