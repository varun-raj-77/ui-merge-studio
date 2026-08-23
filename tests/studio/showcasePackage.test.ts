import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalSelectionKey, validatePublicShowcaseReport } from '../../packages/showcase-evidence/src/schema';
import { canonicalArtifactBytes, canonicalPublicPackageRoot, canonicalPublicPathPrefix, generatedManifestPath, hashArtifactBytes, hashDirectory, manifestHash, readAndValidateReport, repositoryRoot, resolveCanonicalArtifactPath } from '../../scripts/showcase-lib';

function packageFiles(root: string): string[] {
  return readdirSync(root).flatMap(name => {
    const path = resolve(root, name);
    return statSync(path).isDirectory() ? packageFiles(path) : [relative(repositoryRoot, path).replaceAll('\\', '/')];
  });
}

describe('prepared Showcase candidate matrix', () => {
  it('validates every canonical state, artifact hash, and verification record', () => {
    const report = readAndValidateReport();
    expect(report.candidates).toHaveLength(2 ** report.productIds.length * 2);
    expect(report.refusal).toMatchObject({ status: 'refused', conflictKind: 'changed-dependency-contract', contractPath: 'src/types/product.ts' });
    for (const candidate of report.candidates) {
      expect(candidate.key).toBe(canonicalSelectionKey(candidate.selection));
      expect(candidate.candidateCommit).toMatch(/^[a-f0-9]{40}$/);
      expect(candidate.verification.every(item => item.result === 'passed' && item.exitCode === 0)).toBe(true);
      expect(candidate.artifact.path.startsWith(canonicalPublicPathPrefix)).toBe(true);
      const path = resolveCanonicalArtifactPath(candidate.artifact.path);
      expect(existsSync(resolve(path, 'index.html'))).toBe(true);
      expect(hashDirectory(path)).toBe(candidate.artifact.sha256);
    }
    expect(JSON.parse(readFileSync(generatedManifestPath, 'utf8'))).toEqual(report);
  }, 60_000);

  it('represents the build-required canonical package in non-ignored repository inputs', () => {
    const relativeRoot = relative(repositoryRoot, canonicalPublicPackageRoot).replaceAll('\\', '/');
    const git = (...args: string[]) => execFileSync('git', ['-c', `safe.directory=${repositoryRoot.replaceAll('\\', '/')}`, ...args], { cwd: repositoryRoot, encoding: 'utf8' });
    expect(() => git('check-ignore', '--no-index', '-q', relativeRoot)).toThrow();
    const represented = new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '--', relativeRoot).trim().split(/\r?\n/));
    const files = packageFiles(canonicalPublicPackageRoot);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every(file => represented.has(file))).toBe(true);
  });

  it('is click-order independent and records exact instance configuration', () => {
    const report = readAndValidateReport();
    const key = canonicalSelectionKey({ sidebar: true, quickViewProductIds: ['p-104', 'p-102', 'p-104'] });
    expect(key).toBe(canonicalSelectionKey({ sidebar: true, quickViewProductIds: ['p-102', 'p-104'] }));
    const candidate = report.candidates.find(item => item.key === key)!;
    expect(candidate.configuredSource).toEqual({ path: 'src/config/quickViewTargets.ts', declaration: 'quickViewTargetIds', productIds: ['p-102', 'p-104'] });
    expect(candidate.excludedChanges.some(item => /Promotional|inventory/i.test(`${item.path} ${item.symbol} ${item.reason}`))).toBe(true);
    expect(candidate.sliceIds).toHaveLength(2);
    expect(candidate.artifact.kind).toBe('candidate');
    expect(candidate.verification.map(item => item.id)).toEqual(expect.arrayContaining([
      'typecheck', 'focused-feature-tests', 'production-build'
    ]));
  });

  it('refuses malformed, absolute-path, incomplete-matrix, and stale-manifest evidence', () => {
    const report = readAndValidateReport();
    expect(() => validatePublicShowcaseReport({ ...report, candidates: report.candidates.slice(1) })).toThrow(/matrix/i);
    expect(() => validatePublicShowcaseReport({ ...report, fixture: 'C:\\Users\\person\\fixture' })).toThrow();
    expect(manifestHash({ ...report, productIds: [...report.productIds, 'p-999'] })).not.toBe(report.manifestSha256);
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

  it('ships explicit reduced-motion and narrow responsive treatment for the public surface', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../apps/studio/src/catalogue-public.css'), 'utf8');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation-duration: .001ms !important');
    expect(css).toContain('@media (max-width: 700px)');
    expect(css).toContain('.hero-demo-previews { grid-template-columns: 1fr; }');
    expect(css).toContain('.showcase-result-summary { grid-template-columns: 1fr; }');
  });
});
