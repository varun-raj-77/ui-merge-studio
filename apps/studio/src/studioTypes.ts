import type { CandidateGenerationReport, CandidatePreflight } from '../../../packages/candidate-generation/src/types';
import type { IntegrationFoundation } from '../../../packages/integration-plan/src/integrationPlan';
import type { PreviewSession } from '../../../packages/preview-runtime/src/previewController';
import type { RepositoryDiscovery } from '../../../packages/repository-controller/src/repositoryDiscovery';

export interface RepositoryResponse {
  repositoryId: string;
  discovery: RepositoryDiscovery;
  foundation: IntegrationFoundation;
  branches: string[];
  preferredBranches?: string[];
  candidateBranch?: string;
  clean: boolean;
  sessions: PreviewSession[];
}

export type EvidenceTab = 'selection' | 'dependencies' | 'plan' | 'verification';

export interface CandidateUiState {
  preflight: CandidatePreflight | null;
  report: CandidateGenerationReport | null;
  busy: boolean;
  progress: string;
  stage: string | null;
  error: string | null;
  unknownOutcome: boolean;
}

export const emptyCandidateUiState: CandidateUiState = {
  preflight: null,
  report: null,
  busy: false,
  progress: 'Waiting for a visual selection.',
  stage: null,
  error: null,
  unknownOutcome: false
};
