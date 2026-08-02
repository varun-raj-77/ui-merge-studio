import { GitSourceRepository } from '../../source-analysis/src/gitModel';
import {
  refuseIntegrationPlan,
  type IntegrationFoundation
} from './integrationPlan';

export interface ResolvedIntegrationRepository {
  repositoryId: string;
  foundation: IntegrationFoundation;
  sourceCommits: Record<string, string>;
}

export async function resolveIntegrationRepository(
  repository: GitSourceRepository,
  repositoryId: string,
  foundationRef: string,
  sourceRefs: readonly string[]
): Promise<ResolvedIntegrationRepository> {
  let foundationCommit: string;
  try {
    foundationCommit = await repository.resolveRef(foundationRef);
  } catch {
    refuseIntegrationPlan(
      'The selected foundation branch is not available.',
      `Git could not resolve ${foundationRef}.`
    );
  }
  const sourceCommits: Record<string, string> = {};
  const ancestors = new Set<string>();
  for (const sourceRef of [...new Set(sourceRefs)].sort()) {
    try {
      sourceCommits[sourceRef] = await repository.resolveRef(sourceRef);
      ancestors.add(await repository.mergeBase(foundationRef, sourceRef));
    } catch {
      refuseIntegrationPlan(
        'These versions do not share a usable history.',
        `Git could not resolve a common ancestor for ${foundationRef} and ${sourceRef}.`
      );
    }
  }
  if (ancestors.size > 1) {
    refuseIntegrationPlan(
      'The selected versions do not share one verified starting point.',
      `Foundation/source merge bases differ: ${[...ancestors].sort().join(', ')}.`
    );
  }
  const commonAncestorCommit = ancestors.values().next().value ?? foundationCommit;
  return {
    repositoryId,
    foundation: {
      repositoryId,
      branchRef: foundationRef,
      commitSha: foundationCommit,
      commonAncestorCommit,
      role: 'base'
    },
    sourceCommits
  };
}

export async function validatePinnedIntegrationRepository(
  repository: GitSourceRepository,
  foundation: IntegrationFoundation,
  sourceCommits: Readonly<Record<string, string>>
) {
  let currentFoundation: string;
  try {
    currentFoundation = await repository.resolveRef(foundation.branchRef);
  } catch {
    refuseIntegrationPlan(
      'The selected foundation branch is not available.',
      `Git could not resolve ${foundation.branchRef}.`
    );
  }
  if (currentFoundation !== foundation.commitSha) {
    refuseIntegrationPlan(
      `${foundation.branchRef} changed after this plan was created. Re-analyze the branches before generating the result.`,
      `Expected ${foundation.commitSha}; current ${currentFoundation}.`
    );
  }
  for (const [sourceRef, expectedCommit] of Object.entries(sourceCommits).sort(([a], [b]) => a.localeCompare(b))) {
    let currentSource: string;
    try {
      currentSource = await repository.resolveRef(sourceRef);
    } catch {
      refuseIntegrationPlan(
        'A selected source branch is no longer available.',
        `Git could not resolve ${sourceRef}.`
      );
    }
    if (currentSource !== expectedCommit) {
      refuseIntegrationPlan(
        `${sourceRef} changed after this plan was created. Re-analyze the branches before generating the result.`,
        `Expected ${expectedCommit}; current ${currentSource}.`
      );
    }
    let ancestor: string;
    try {
      ancestor = await repository.mergeBase(foundation.branchRef, sourceRef);
    } catch {
      refuseIntegrationPlan(
        'These versions do not share a usable history.',
        `Git could not resolve a common ancestor for ${foundation.branchRef} and ${sourceRef}.`
      );
    }
    if (ancestor !== foundation.commonAncestorCommit) {
      refuseIntegrationPlan(
        'The branch relationship changed after this plan was created.',
        `Expected common ancestor ${foundation.commonAncestorCommit}; current ${ancestor}.`
      );
    }
  }
}
