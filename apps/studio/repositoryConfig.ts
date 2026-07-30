import { resolve } from 'node:path';
import type { VerificationCommand } from '../../packages/candidate-generation/src/candidateGenerator';

type Environment = Record<string, string | undefined>;

function verificationCommands(value: string | undefined): VerificationCommand[] | undefined {
  if (!value) return undefined;
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(item =>
    item && typeof item === 'object'
    && typeof (item as VerificationCommand).name === 'string'
    && typeof (item as VerificationCommand).executable === 'string'
    && Array.isArray((item as VerificationCommand).args)
    && (item as VerificationCommand).args.every(argument => typeof argument === 'string')
  )) throw new Error('UI_MERGE_VERIFICATION_COMMANDS must be a non-empty JSON array of name, executable, and string args.');
  return parsed as VerificationCommand[];
}

export function loadRepositoryConfiguration(workspaceRoot: string, environment: Environment = process.env) {
  return {
    repositoryPath: environment.UI_MERGE_REPOSITORY_PATH ?? environment.UI_MERGE_FIXTURE_PATH ?? resolve(workspaceRoot, 'fixtures/generated/product-catalogue'),
    baseRef: environment.UI_MERGE_BASE_REF ?? 'main',
    previewPath: environment.UI_MERGE_PREVIEW_ROUTE ?? '/catalogue',
    preferredBranches: [environment.UI_MERGE_LEFT_BRANCH, environment.UI_MERGE_RIGHT_BRANCH].filter((value): value is string => Boolean(value)),
    candidateBranch: environment.UI_MERGE_CANDIDATE_BRANCH ?? 'combined-result',
    verificationCommands: verificationCommands(environment.UI_MERGE_VERIFICATION_COMMANDS)
  };
}
