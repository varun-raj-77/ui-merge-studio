export type ShowcaseFeatureId = 'navigation' | 'activity';

export interface ShowcaseLink {
  label: string;
  href: string;
}

export interface ShowcaseFeature {
  id: ShowcaseFeatureId;
  branchLabel: 'Branch A' | 'Branch B';
  branch: string;
  name: string;
  summary: string;
  boundary: string;
  sourceFile: string;
  supportingFiles: readonly { path: string; reason: string }[];
  excludedFiles: readonly { path: string; reason: string }[];
}

export interface ShowcaseGate {
  id: string;
  name: string;
  checks: string;
  status: 'passed';
  evidenceSource: string;
}

export interface ShowcaseManifest {
  schemaVersion: 1;
  evidenceRun: string;
  repository: {
    baseRef: string;
    commonBaseCommit: string;
    candidateBranch: string;
    candidateCommit: string;
    compatibility: 'compatible';
  };
  features: readonly [ShowcaseFeature, ShowcaseFeature];
  gates: readonly ShowcaseGate[];
  links: {
    source: ShowcaseLink;
    architecture: ShowcaseLink;
    evaluation: ShowcaseLink;
    localSetup: ShowcaseLink;
    limitations: ShowcaseLink;
    candidateEvidence: ShowcaseLink;
    developmentHistory: ShowcaseLink;
  };
}

const repositoryUrl = 'https://github.com/varun-raj-77/ui-merge-studio';

export const rawShowcaseManifest: ShowcaseManifest = {
  schemaVersion: 1,
  evidenceRun: '.ums/generation/045c4d7fbcadd33b/candidate-report.json',
  repository: {
    baseRef: 'main',
    commonBaseCommit: 'dc2f93c7e6b9bec4d47e3d71e1ba768c6ac3631b',
    candidateBranch: 'combined-result',
    candidateCommit: 'f5b0e72834d6ca1e87a62e78abb5d934a618f3ce',
    compatibility: 'compatible'
  },
  features: [
    {
      id: 'navigation',
      branchLabel: 'Branch A',
      branch: 'branch-sidebar',
      name: 'Collapsible navigation',
      summary: 'Adds a persistent collapse control and compact navigation state.',
      boundary: 'AppSidebar',
      sourceFile: 'src/features/navigation/AppSidebar.tsx',
      supportingFiles: [
        { path: 'src/features/navigation/SidebarNavItem.tsx', reason: 'Rendered navigation item dependency' },
        { path: 'src/hooks/useSidebarState.ts', reason: 'Persists collapsed navigation state' },
        { path: 'src/styles/app.css', reason: 'Statically imported, slice-owned presentation' },
        { path: 'src/test/sidebar.test.tsx', reason: 'Focused feature test reconstructed from owned units' },
        { path: 'src/types/navigation.ts', reason: 'Required navigation type declarations' }
      ],
      excludedFiles: [
        { path: 'src/features/tickets/TicketPage.tsx', reason: 'Existing base connection; branch delta did not create the feature edge' },
        { path: 'src/types/navigation.ts#SidebarState', reason: 'Changed symbol was outside the supported feature graph' }
      ]
    },
    {
      id: 'activity',
      branchLabel: 'Branch B',
      branch: 'branch-inspector',
      name: 'Activity filters',
      summary: 'Adds visible All, Notes, and Replies filtering to the ticket activity stream.',
      boundary: 'ActivityFilters',
      sourceFile: 'src/features/tickets/ActivityFilters.tsx',
      supportingFiles: [
        { path: 'src/features/tickets/TicketActivityList.tsx', reason: 'Integration boundary that renders the selected component' },
        { path: 'src/hooks/useActivityFilter.ts', reason: 'Owns the selected filter state' },
        { path: 'src/styles/inspector.css', reason: 'Statically imported, slice-owned presentation' },
        { path: 'src/test/inspector.test.tsx', reason: 'Focused feature test reconstructed from owned units' },
        { path: 'src/types/inspector.ts', reason: 'Required activity-filter types' }
      ],
      excludedFiles: [
        { path: 'src/features/tickets/TicketList.tsx', reason: 'Changed symbol was outside the supported feature graph' },
        { path: 'src/utils/sortTickets.ts', reason: 'Unrelated ticket sorting change was not reachable from the selected boundary' }
      ]
    }
  ],
  gates: [
    { id: 'install', name: 'Deterministic install', checks: 'The candidate dependencies install from the committed lockfile.', status: 'passed', evidenceSource: 'candidate report · verification.install' },
    { id: 'typecheck', name: 'TypeScript', checks: 'The combined React source passes tsc --noEmit.', status: 'passed', evidenceSource: 'candidate report · verification.typecheck' },
    { id: 'tests', name: 'Full tests', checks: 'The complete controlled-fixture test suite passes.', status: 'passed', evidenceSource: 'candidate report · verification.tests' },
    { id: 'focused-tests', name: 'Feature tests', checks: 'Navigation and activity-filter focused tests both pass.', status: 'passed', evidenceSource: 'candidate report · verification.focused-feature-tests' },
    { id: 'build', name: 'Production build', checks: 'The verified candidate completes its TypeScript and Vite production build.', status: 'passed', evidenceSource: 'candidate report · verification.production-build' }
  ],
  links: {
    source: { label: 'Source code', href: repositoryUrl },
    architecture: { label: 'Architecture', href: `${repositoryUrl}/tree/main/docs/adr` },
    evaluation: { label: 'Evaluation evidence', href: `${repositoryUrl}/blob/main/docs/evaluation.md` },
    localSetup: { label: 'Local setup', href: `${repositoryUrl}#run-the-controlled-demo` },
    limitations: { label: 'Limitations', href: `${repositoryUrl}/blob/main/docs/limitations.md` },
    candidateEvidence: { label: 'Candidate-generation evidence', href: `${repositoryUrl}/blob/main/.ums/generation/045c4d7fbcadd33b/candidate-report.json` },
    developmentHistory: { label: 'Development history', href: `${repositoryUrl}/tree/main/docs/codex-prompts` }
  }
};

export function validateShowcaseManifest(value: ShowcaseManifest): ShowcaseManifest {
  const fail = (message: string): never => { throw new Error(`Invalid showcase evidence manifest: ${message}`); };
  if (value.schemaVersion !== 1) fail('unsupported schema version');
  if (!value.evidenceRun || !value.repository.commonBaseCommit || !value.repository.candidateBranch) fail('missing repository evidence');
  if (value.features.length !== 2) fail('exactly two controlled features are required');
  for (const feature of value.features) {
    if (!feature.branch || !feature.name || !feature.boundary || !feature.sourceFile) fail(`feature ${feature.id} is incomplete`);
    if (!feature.sourceFile.startsWith('src/')) fail(`feature ${feature.id} has an invalid source path`);
    if (!feature.supportingFiles.length || !feature.excludedFiles.length) fail(`feature ${feature.id} lacks dependency or exclusion evidence`);
  }
  if (!value.gates.length || value.gates.some(gate => gate.status !== 'passed' || !gate.checks || !gate.evidenceSource)) fail('verification evidence is incomplete');
  for (const link of Object.values(value.links)) {
    if (!link.label || !link.href.startsWith(repositoryUrl)) fail('public repository link is invalid');
  }
  return value;
}

export const showcaseManifest = validateShowcaseManifest(rawShowcaseManifest);
