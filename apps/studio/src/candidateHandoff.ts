import type { CandidateGenerationReport } from '../../../packages/candidate-generation/src/types';

// Export a minimal, allowlisted developer handoff. Never serialize the report
// directly: verification output, commands, worktree paths and local diagnostics
// can include private repository data or secrets.
export function formatVerifiedCandidateHandoff(report: CandidateGenerationReport): string | null {
  const repository = report.repository;
  const identity = report.integrationPlan?.identity;
  const sha = (value: string | undefined) => Boolean(value && /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i.test(value));
  if (report.status !== 'succeeded'
    || report.plan.status !== 'ready'
    || !identity
    || identity !== repository.provenance?.planIdentity
    || report.generationId !== repository.provenance?.generationId
    || !sha(repository.baseCommit)
    || !sha(repository.candidateCommit)
    || !sha(repository.candidateTree)
    || !repository.candidateBranch
    || repository.baseCommit !== report.plan.repository.baseCommit
    || repository.candidateBranch !== report.plan.repository.candidateBranch
    || report.plan.conflicts.length > 0
    || report.plan.unresolved.length > 0
    || report.verification.length === 0
    || !report.verification.every(check => check.status === 'passed' && check.exitCode === 0)
    || !report.cleanup.worktreeRemoved
    || !report.cleanup.processesStopped) return null;

  // Explicitly describe a verified LOCAL Git candidate. Nothing here asserts
  // that a branch was pushed, reviewed, merged, or deployed.
  return JSON.stringify({
    format: 'ui-merge-studio/verified-candidate-handoff/v1',
    scope: 'local-git-candidate',
    delivery: 'not-pushed-or-deployed',
    branch: repository.candidateBranch,
    candidateCommit: repository.candidateCommit,
    candidateTree: repository.candidateTree,
    baseCommit: repository.baseCommit,
    planIdentity: identity,
    generationId: report.generationId,
    profile: repository.provenance.profile,
    sourceSlices: report.sliceIds.length,
    plannedOperations: report.plan.operations.length,
    verification: report.verification.map(check => ({ name: check.name, status: 'passed' as const })),
    cleanup: { worktreeRemoved: true, processesStopped: true }
  }, null, 2);
}
