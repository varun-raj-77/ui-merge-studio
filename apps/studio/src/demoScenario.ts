import type { FeatureSliceArtifact } from '../../../packages/source-analysis/src/types';
import type { SourceIdentity } from '../../../packages/shared/src/sourceIdentity';

export const demoScenario = {
  productName: 'UI Merge Studio',
  sampleAppName: 'Sample Support Dashboard',
  promise: 'Combine the best UI changes from different React branches.',
  description: 'Run branches as real interactive applications, click the visible changes you want, and create one tested combined Git branch.',
  sampleAppDescription: 'Demo application · Fake ticket data. Sample Support Desk is the fictional workspace shown inside the sample, not the product.',
  task: 'Choose the navigation improvement from the Navigation experiment and the activity-filter improvement from the Activity-filter experiment.',
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
      eyebrow: 'Navigation experiment',
      branch: 'branch-sidebar',
      branchLabel: 'Navigation experiment',
      title: 'Navigation experiment',
      description: 'A branch containing a navigation change and other edits.',
      selectionPrompt: 'Choose the collapsible navigation change.',
      allowedSelectionComponents: ['AppSidebar', 'SidebarNavItem']
    },
    right: {
      eyebrow: 'Activity-filter experiment',
      branch: 'branch-inspector',
      branchLabel: 'Activity-filter experiment',
      title: 'Activity-filter experiment',
      description: 'A branch containing an activity-filter change and other edits.',
      selectionPrompt: 'Choose the activity-filter controls.',
      allowedSelectionComponents: ['ActivityFilters']
    }
  },
  featureLabels: {
    AppSidebar: 'Collapsible navigation',
    SidebarNavItem: 'Collapsible navigation',
    ActivityFilters: 'Activity filters',
    TicketInspector: 'Activity filters'
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
        message: `That area is broader than this guided demo can verify safely. ${version.selectionPrompt} No combined branch was created, and both source branches are unchanged.`
      };
}

export function featureLabel(value: SourceIdentity | FeatureSliceArtifact | null | undefined) {
  const component = value && 'slice' in value
    ? value.slice.boundary.analyzed
    : value?.componentName;
  return component ? demoScenario.featureLabels[component] ?? component.replace(/([a-z])([A-Z])/g, '$1 $2') : 'No feature selected';
}
