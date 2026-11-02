import type { CandidatePlan } from '../../../packages/candidate-generation/src/types';

/** Present the server-owned stylesheet operations; this is not visual-impact proof. */
export function transferredStylesheets(plan: Pick<CandidatePlan, 'operations'>): string[] {
  return [...new Set(plan.operations
    .filter(operation => operation.kind === 'add-style-file' || operation.kind === 'replace-style-file')
    .map(operation => operation.target.path))].sort();
}
