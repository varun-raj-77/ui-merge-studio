import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { validatePublicShowcaseReport, type PublicArtifact, type PublicShowcaseReport } from '../packages/showcase-evidence/src/schema';
import {
  canonicalPublicPackageRoot,
  canonicalPublicPathPrefix,
  generatedManifestPath,
  hashDirectory,
  manifestHash,
  normalizedJson,
  publicRoot,
  reportPath,
  repositoryRoot
} from './showcase-lib';

function canonicalPath(path: string, runId: string) {
  const generatedPrefix = `/showcase-runs/${runId}/`;
  if (path.startsWith(generatedPrefix)) return `${canonicalPublicPathPrefix}${path.slice(generatedPrefix.length)}`;
  if (path.startsWith(canonicalPublicPathPrefix)) return path;
  throw new Error(`Artifact path is outside generated run ${runId}: ${path}`);
}

function canonicalArtifact(artifact: PublicArtifact, runId: string): PublicArtifact {
  return { ...artifact, path: canonicalPath(artifact.path, runId) };
}

function artifactSuffix(path: string) {
  if (!path.startsWith(canonicalPublicPathPrefix)) throw new Error(`Artifact is outside the canonical package: ${path}`);
  return path.slice(canonicalPublicPathPrefix.length).replace(/\/$/, '');
}

export function promoteShowcasePackage(input: PublicShowcaseReport) {
  const sourceRoot = resolve(publicRoot, 'showcase-runs', input.runId);
  if (!existsSync(sourceRoot)) throw new Error(`Missing prepared Showcase run: ${relative(repositoryRoot, sourceRoot)}`);
  const canonicalWithoutHash: PublicShowcaseReport = {
    ...input,
    artifacts: input.artifacts.map(item => canonicalArtifact(item, input.runId)) as PublicShowcaseReport['artifacts'],
    candidates: input.candidates.map(item => ({ ...item, artifact: canonicalArtifact(item.artifact, input.runId) }))
  };
  const canonical = validatePublicShowcaseReport({ ...canonicalWithoutHash, manifestSha256: manifestHash(canonicalWithoutHash) });
  const artifacts = [...canonical.artifacts, ...canonical.candidates.map(item => item.artifact)];
  for (const artifact of artifacts) {
    const actual = hashDirectory(resolve(sourceRoot, artifactSuffix(artifact.path)));
    if (actual !== artifact.sha256) throw new Error(`Prepared artifact ${artifact.id} failed promotion validation.`);
  }

  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'ui-merge-showcase-promotion-'));
  const stagedPackage = resolve(temporaryRoot, 'showcase');
  try {
    cpSync(sourceRoot, stagedPackage, { recursive: true });
    for (const artifact of artifacts) {
      const actual = hashDirectory(resolve(stagedPackage, artifactSuffix(artifact.path)));
      if (actual !== artifact.sha256) throw new Error(`Copied artifact ${artifact.id} failed promotion validation.`);
    }
    rmSync(canonicalPublicPackageRoot, { recursive: true, force: true });
    cpSync(stagedPackage, canonicalPublicPackageRoot, { recursive: true });
    mkdirSync(dirname(reportPath), { recursive: true });
    mkdirSync(dirname(generatedManifestPath), { recursive: true });
    writeFileSync(reportPath, normalizedJson(canonical));
    writeFileSync(generatedManifestPath, normalizedJson(canonical));
    console.log(`PASS: promoted Showcase package ${canonical.runId} to ${relative(repositoryRoot, canonicalPublicPackageRoot)}.`);
    return canonical;
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const report = validatePublicShowcaseReport(JSON.parse(readFileSync(reportPath, 'utf8')));
  promoteShowcasePackage(report);
}
