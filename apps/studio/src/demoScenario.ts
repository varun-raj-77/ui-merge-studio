import type { FeatureSliceArtifact } from '../../../packages/source-analysis/src/types';
import type { SourceIdentity } from '../../../packages/shared/src/sourceIdentity';

export const demoScenario = {
  productName: 'UI Merge Studio',
  sampleAppName: 'Sample Support Dashboard',
  promise: 'Combine preferred UI features from different React branches.',
  description: 'UI Merge Studio runs multiple versions of the same React application, lets you click the visible features you prefer, finds their required source code, and creates one tested combined Git branch.',
  sampleAppDescription: 'A fake customer-support application with sample ticket data. “Beacon Ops” is the fictional company shown inside the sample; the tickets and brand are demonstration content, not the product.',
  task: 'Choose the navigation improvement from Version A and the activity-filter improvement from Version B.',
  examples: ['Forms', 'Tables', 'Charts', 'Checkout flows', 'Search', 'Editors', 'Modals', 'Loading states', 'Validation', 'Accessibility improvements'],
  branchRelationship: {
    base: { ref: 'main', label: 'Shared starting branch' },
    experiments: [
      { ref: 'branch-sidebar', label: 'Navigation experiment' },
      { ref: 'branch-inspector', label: 'Activity-filter experiment' }
    ],
    result: { ref: 'combined-result', label: 'Verified combined result' }
  },
  versions: {
    left: {
      eyebrow: 'Version A',
      branch: 'branch-sidebar',
      branchLabel: 'Navigation experiment',
      title: 'Collapsible Sidebar Variant',
      description: 'The shared support app plus a navigation improvement that gives agents more room.',
      selectionPrompt: 'Choose the collapsible navigation.',
      allowedSelectionComponents: ['AppSidebar', 'SidebarNavItem']
    },
    right: {
      eyebrow: 'Version B',
      branch: 'branch-inspector',
      branchLabel: 'Activity-filter experiment',
      title: 'Activity Filters Variant',
      description: 'The same shared support app plus focused activity filters for faster investigation.',
      selectionPrompt: 'Choose the activity-filter controls.',
      allowedSelectionComponents: ['ActivityFilters']
    }
  },
  featureLabels: {
    AppSidebar: 'Collapsible Sidebar',
    SidebarNavItem: 'Collapsible Sidebar',
    ActivityFilters: 'Activity Filters',
    TicketInspector: 'Activity Filters'
  } as Record<string, string>
} as const;

export function branchLabel(branch: string) {
  if (branch === demoScenario.branchRelationship.base.ref) return demoScenario.branchRelationship.base.label;
  if (branch === demoScenario.branchRelationship.result.ref) return demoScenario.branchRelationship.result.label;
  return demoScenario.branchRelationship.experiments.find(item => item.ref === branch)?.label
    ?? branch.replace(/^branch-/, '').replace(/-/g, ' ').replace(/\b\w/g, value => value.toUpperCase());
}

export function guidedSelectionDecision(previewId: keyof typeof demoScenario.versions, artifact: FeatureSliceArtifact) {
  const version = demoScenario.versions[previewId];
  if (artifact.slice.repository.branchRef !== version.branch) return { allowed: true as const, message: null };
  const selected = artifact.slice.selection.componentName;
  const allowed = (version.allowedSelectionComponents as readonly string[]).includes(selected ?? '');
  return allowed
    ? { allowed: true as const, message: null }
    : {
        allowed: false as const,
        message: `That area is broader than this guided demo can verify safely. ${version.selectionPrompt} No combined branch was created, and both original versions are unchanged.`
      };
}

export function featureLabel(value: SourceIdentity | FeatureSliceArtifact | null | undefined) {
  const component = value && 'slice' in value
    ? value.slice.boundary.analyzed
    : value?.componentName;
  return component ? demoScenario.featureLabels[component] ?? component.replace(/([a-z])([A-Z])/g, '$1 $2') : 'No feature selected';
}
