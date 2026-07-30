import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePublicShowcaseReport } from '../../packages/showcase-evidence/src/schema';
import { canonicalArtifactBytes, generatedManifestPath, hashArtifactBytes, hashDirectory, manifestHash, publicRoot, readAndValidateReport } from '../../scripts/showcase-lib';

describe('prepared Showcase package', () => {
  it('validates the sanitized report, generated manifest, commits, and four artifact hashes', () => {
    const report = readAndValidateReport();
    expect(report.selectedFeatureIds).toEqual(['category-sidebar', 'quick-view']);
    expect(report.refusal).toMatchObject({ status: 'refused', conflictKind: 'changed-dependency-contract', contractPath: 'src/types/product.ts' });
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
  it('canonically hashes text artifact line endings while preserving content changes', () => {
    const lf = Buffer.from('<main>Showcase</main>\n');
    const crlf = Buffer.from('<main>Showcase</main>\r\n');
    expect(hashArtifactBytes('index.html', crlf)).toBe(hashArtifactBytes('index.html', lf));
    expect(hashArtifactBytes('index.html', Buffer.from('<main>Changed</main>\n'))).not.toBe(hashArtifactBytes('index.html', lf));
  });
  it('does not newline-normalize binary artifacts', () => {
    const binary = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(canonicalArtifactBytes('preview.png', binary)).toEqual(binary);
    expect(hashArtifactBytes('preview.png', binary)).not.toBe(hashArtifactBytes('preview.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0a, 0x1a, 0x0a])));
  });
});
