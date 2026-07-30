import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generatedManifestPath, hashDirectory, normalizedJson, publicRoot, readAndValidateReport } from './showcase-lib';

export function validateShowcasePackage() {
  const report = readAndValidateReport();
  for (const artifact of [...report.artifacts, ...report.candidates.map(item => item.artifact)]) {
    const path = resolve(publicRoot, artifact.path.replace(/^\/+/, ''));
    const actual = hashDirectory(path);
    if (actual !== artifact.sha256) throw new Error(`Stale or tampered artifact ${artifact.id}: expected ${artifact.sha256}, received ${actual}.`);
  }
  if (!existsSync(generatedManifestPath)) throw new Error('Missing generated Showcase manifest.');
  const generatedManifest = JSON.parse(readFileSync(generatedManifestPath, 'utf8')) as unknown;
  if (normalizedJson(generatedManifest) !== normalizedJson(report)) throw new Error('Stale generated Showcase manifest. Run npm run showcase:prepare.');
  console.log(`PASS: Showcase package ${report.runId} validated (${report.candidates.length} candidates).`);
  return report;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) validateShowcasePackage();
