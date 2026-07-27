import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePublicShowcaseReport } from '../../packages/showcase-evidence/src/schema';
import { generatedManifestPath, hashDirectory, manifestHash, publicRoot, readAndValidateReport } from '../../scripts/showcase-lib';

describe('prepared Showcase package', () => {
  it('validates the sanitized report, generated manifest, commits, and four artifact hashes', () => {
    const report = readAndValidateReport();
    expect(report.selectedFeatureIds).toEqual(['navigation', 'activity']);
    expect(report.repository.candidateCommit).toMatch(/^[a-f0-9]{40}$/);
    expect(report.verification.every(item => item.result === 'passed' && item.exitCode === 0)).toBe(true);
    for (const artifact of report.artifacts) {
      const path = resolve(publicRoot, artifact.path.replace(/^\/+/, ''));
      expect(existsSync(resolve(path, 'index.html'))).toBe(true);
      expect(hashDirectory(path)).toBe(artifact.sha256);
    }
    expect(JSON.parse(readFileSync(generatedManifestPath, 'utf8'))).toEqual(report);
  });
  it('refuses malformed, absolute-path, missing-commit, and stale-manifest evidence', () => {
    const report = readAndValidateReport();
    expect(() => validatePublicShowcaseReport({ ...report, repository: { ...report.repository, candidateCommit: '' } })).toThrow(/commit/i);
    expect(() => validatePublicShowcaseReport({ ...report, fixture: 'C:\\Users\\person\\fixture' })).toThrow();
    expect(manifestHash({ ...report, repository: { ...report.repository, candidateBranch: 'stale-result' } })).not.toBe(report.manifestSha256);
  });
});
