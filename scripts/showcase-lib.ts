import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { validatePublicShowcaseReport, type PublicShowcaseReport } from '../packages/showcase-evidence/src/schema';

export const repositoryRoot = resolve(import.meta.dirname, '..');
export const publicRoot = resolve(repositoryRoot, 'apps/studio/public');
export const reportPath = resolve(repositoryRoot, 'docs/evidence/showcase/latest/run-report.json');
export const generatedManifestPath = resolve(repositoryRoot, 'apps/studio/src/generated/showcaseRun.json');

export function normalizedJson(value: unknown) { return `${JSON.stringify(value, null, 2)}\n`; }
export function hashBuffer(value: Buffer | string) { return createHash('sha256').update(value).digest('hex'); }
export function hashDirectory(root: string) {
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`Missing artifact directory: ${relative(repositoryRoot, root)}`);
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const name of readdirSync(directory).sort()) {
      const path = resolve(directory, name);
      if (statSync(path).isDirectory()) visit(path); else files.push(path);
    }
  };
  visit(root);
  if (!files.some(path => path.endsWith('index.html'))) throw new Error(`Artifact has no index.html: ${relative(repositoryRoot, root)}`);
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(relative(root, path).replaceAll('\\', '/')); hash.update('\0'); hash.update(readFileSync(path)); hash.update('\0');
  }
  return hash.digest('hex');
}
export function manifestHash(report: Omit<PublicShowcaseReport, 'manifestSha256'> | PublicShowcaseReport) {
  const clone = structuredClone(report) as PublicShowcaseReport;
  delete (clone as Partial<PublicShowcaseReport>).manifestSha256;
  delete (clone as Partial<PublicShowcaseReport>).generatedAt;
  return hashBuffer(normalizedJson(clone));
}
export function readAndValidateReport() {
  if (!existsSync(reportPath)) throw new Error('Missing public Showcase report. Run npm run showcase:prepare.');
  const report = validatePublicShowcaseReport(JSON.parse(readFileSync(reportPath, 'utf8')));
  if (manifestHash(report) !== report.manifestSha256) throw new Error('Stale manifest hash in public Showcase report.');
  return report;
}
