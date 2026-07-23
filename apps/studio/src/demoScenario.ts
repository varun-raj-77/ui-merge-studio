import type { FeatureSliceArtifact } from '../../../packages/source-analysis/src/types';
import type { SourceIdentity } from '../../../packages/shared/src/sourceIdentity';

export const demoScenario = {
  productName: 'UI Merge Studio',
  sampleAppName: 'Sample Support Dashboard',
  sampleAppDescription: 'A local ticket-management fixture used to prove two independent UI changes can be selected and combined safely.',
  task: 'Choose one useful change from each version, then create a verified combined result.',
  versions: {
    left: { eyebrow: 'Version A', branch: 'branch-sidebar', title: 'Collapsible Sidebar Variant', description: 'A navigation treatment that gives support agents more room for ticket work.' },
    right: { eyebrow: 'Version B', branch: 'branch-inspector', title: 'Activity Filters Variant', description: 'A focused ticket-activity filter for faster investigation.' }
  },
  featureLabels: {
    AppSidebar: 'Collapsible Sidebar',
    SidebarNavItem: 'Collapsible Sidebar',
    ActivityFilters: 'Activity Filters',
    TicketInspector: 'Activity Filters'
  } as Record<string, string>
} as const;

export function featureLabel(value: SourceIdentity | FeatureSliceArtifact | null | undefined) {
  const component = value && 'slice' in value
    ? value.slice.boundary.analyzed
    : value?.componentName;
  return component ? demoScenario.featureLabels[component] ?? component.replace(/([a-z])([A-Z])/g, '$1 $2') : 'No feature selected';
}
