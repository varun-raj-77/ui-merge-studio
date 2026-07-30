import manifestJson from './generated/showcaseRun.json';
import { validatePublicShowcaseReport } from '../../../packages/showcase-evidence/src/schema';

export type CatalogueFeatureId = 'category-sidebar' | 'quick-view';
export type CatalogueBranch = 'Branch A' | 'Branch B';
export interface CatalogueFeatureEvidence {
  id: CatalogueFeatureId; name: string; branch: CatalogueBranch; declaration: string; sourceFile: string;
  dependencies: { path: string; reason: string }[]; inclusionReason: string; siblingExclusion: string;
  compatibility: 'recorded-safe' | 'unrecorded';
}

const manifest = validatePublicShowcaseReport(manifestJson);
const generatedFeature = (id: 'category-sidebar' | 'quick-view', siblingExclusion: string): CatalogueFeatureEvidence => {
  const feature = manifest.features.find(item => item.id === id)!;
  return {
    id, name: feature.name, branch: feature.branchLabel, declaration: feature.selectedBoundary, sourceFile: feature.sourceFile,
    dependencies: feature.supportingFiles, inclusionReason: `Captured from the rendered ${feature.branchLabel} boundary at line ${feature.sourceLine}.`,
    siblingExclusion, compatibility: 'recorded-safe'
  };
};

export const catalogueEvidence: Record<CatalogueFeatureId, CatalogueFeatureEvidence> = {
  'category-sidebar': generatedFeature('category-sidebar', 'Promotional banner'),
  'quick-view': generatedFeature('quick-view', 'Inventory summary')
};
export const recordedSafePair: CatalogueFeatureId[] = ['category-sidebar','quick-view'];
export const recordedRefusal = manifest.refusal;
export function combinationOutcome(selected: CatalogueFeatureId[]) {
  const ids=new Set(selected);
  return selected.length===2&&recordedSafePair.every(id=>ids.has(id))?'recorded-safe' as const:'unrecorded' as const;
}
