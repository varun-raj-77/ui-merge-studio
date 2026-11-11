import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { CandidateGenerationReport } from '../../packages/candidate-generation/src/types';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { formatVerifiedCandidateHandoff } from './src/candidateHandoff';
import type { ComparisonSource } from './src/candidateLiveComparison';
import { isSafeCaptureRoute, matchesCaptureLocation } from './src/visualSnapshotRoutes';
import type { VisualSnapshotCapture, VisualSnapshotState } from './src/visualSnapshotTypes';
import { VisualReviewAuthority, VisualReviewError } from './visualReviewAuthority';

const generationPattern = /^[a-f0-9]{16}$/;
const commitPattern = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;
const pngHeader = Buffer.from('89504e470d0a1a0a', 'hex');
const viewport = { width: 1280, height: 800 } as const;
const maxPngBytes = 8 * 1024 * 1024;
const maxRoutesPerSource = 3;
const routeKeyPattern = /^[a-f0-9]{16}$/;
function routeKey(route: string) { return createHash('sha256').update(route).digest('hex').slice(0, 16); }

interface SourcePin { branch: string; commit: string }
interface GenerationPins {
  version: 1;
  generationId: string;
  planIdentity: string;
  candidateBranch: string;
  candidateCommit: string;
  candidateTree: string;
  sources: { A: SourcePin; B: SourcePin };
}
interface StoredCapture extends VisualSnapshotCapture {
  sourceFile: string;
  candidateFile: string;
}

type CapturePair = (sourceUrl: string, candidateUrl: string) => Promise<{ source: Buffer; candidate: Buffer }>;
type PreviewAccess = {
  session: (slot: 'left' | 'right') => PreviewSession | null;
  isAlive: (slot: 'left' | 'right') => boolean;
};

/** Explicit local-only capture. No browser-supplied URLs, commits, filesystem paths, or image bytes. */
async function browserCapturePair(sourceUrl: string, candidateUrl: string) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    async function screenshot(url: string) {
      const page = await context.newPage();
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        if (response && !response.ok()) throw new VisualReviewError(409, 'The selected preview route did not return a successful response.');
        await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 });
        // HMR websockets can prevent an absolute network-idle guarantee.
        await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);
        if (!matchesCaptureLocation(url, page.url())) {
          throw new VisualReviewError(409, 'The preview redirected away from the exact requested route. Capture refused.');
        }
        return await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide', timeout: 20_000 });
      } finally {
        await page.close();
      }
    }
    return { source: await screenshot(sourceUrl), candidate: await screenshot(candidateUrl) };
  } finally {
    await browser.close();
  }
}

function validSource(value: unknown): value is ComparisonSource { return value === 'A' || value === 'B'; }
function validPin(value: SourcePin | null): value is SourcePin {
  return Boolean(value && value.branch && commitPattern.test(value.commit));
}
function safePreviewUrl(session: PreviewSession): string {
  const url = new URL(session.url);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1'
    || url.port !== String(session.port) || url.origin !== session.origin
    || session.port < 1024 || session.port > 65535 || url.username || url.password
    || url.hash || url.search) {
    throw new VisualReviewError(409, 'The managed preview URL is not a local loopback URL.');
  }
  return url.href;
}
function localCaptureUrl(session: PreviewSession, route: string) {
  const trusted = new URL(safePreviewUrl(session));
  const capture = new URL(route, trusted.origin);
  if (capture.origin !== trusted.origin || capture.pathname !== route || capture.search || capture.hash) {
    throw new VisualReviewError(400, 'Capture route must be a normalized same-origin pathname.');
  }
  return capture.href;
}
function validatePng(image: Buffer) {
  if (!Buffer.isBuffer(image) || image.length > maxPngBytes || image.length < pngHeader.length
    || !image.subarray(0, pngHeader.length).equals(pngHeader)) {
    throw new VisualReviewError(409, 'The browser did not produce a bounded PNG screenshot.');
  }
}
function pngSha256(image: Buffer) { return createHash('sha256').update(image).digest('hex'); }
async function verifiedImage(path: string, expectedSha256: string, label: string) {
  try {
    // Do not read arbitrarily large files or follow a replaced screenshot symlink.
    const info = await lstat(path);
    if (!info.isFile() || info.size > maxPngBytes || info.size < pngHeader.length) throw new Error('Unbounded PNG');
    const image = await readFile(path);
    validatePng(image);
    if (pngSha256(image) !== expectedSha256) throw new Error('SHA-256 mismatch');
    return image;
  } catch {
    throw new VisualReviewError(409, 'Local ' + label + ' screenshot is missing or has failed PNG SHA-256 verification. This image is not valid evidence.');
  }
}

export class VisualSnapshotAuthority {
  private readonly artifactRoot: string;
  private readonly activeCaptures = new Set<string>();

  constructor(
    artifactRoot: string,
    private readonly reviews: VisualReviewAuthority,
    private readonly previews: PreviewAccess,
    private readonly capturePair: CapturePair = browserCapturePair
  ) { this.artifactRoot = resolve(artifactRoot); }

  private directory(id: string) {
    if (!generationPattern.test(id)) throw new VisualReviewError(400, 'A valid generation identity is required.');
    return join(this.artifactRoot, '.ums', 'visual-snapshots', id);
  }
  private capturePath(id: string, source: ComparisonSource) { return join(this.directory(id), source, 'manifest.json'); }
  private routeFolder(id: string, source: ComparisonSource, key: string) {
    if (!routeKeyPattern.test(key)) throw new VisualReviewError(400, 'Invalid screenshot route identity.');
    return join(this.directory(id), source, 'routes', key);
  }

  /** Called before the candidate displaces Source B in the right preview slot. */
  async register(report: CandidateGenerationReport) {
    const verified = formatVerifiedCandidateHandoff(report);
    if (!verified) throw new VisualReviewError(409, 'Snapshots require a verified candidate report.');
    const handoff = JSON.parse(verified) as GenerationPins & { branch: string };
    const left = this.previews.session('left');
    const right = this.previews.session('right');
    const a = left && { branch: left.branch, commit: left.branchCommit };
    const b = right && { branch: right.branch, commit: right.branchCommit };
    if (!validPin(a) || !validPin(b) || !this.previews.isAlive('left') || !this.previews.isAlive('right')
      || left?.status !== 'running' || right?.status !== 'running') {
      throw new VisualReviewError(409, 'Both source previews must be running when the candidate is generated.');
    }
    const pins: GenerationPins = {
      version: 1, generationId: report.generationId, planIdentity: handoff.planIdentity,
      candidateBranch: handoff.branch, candidateCommit: handoff.candidateCommit,
      candidateTree: handoff.candidateTree, sources: { A: a, B: b }
    };
    await mkdir(this.directory(report.generationId), { recursive: true });
    const path = join(this.directory(report.generationId), 'pins.json');
    try {
      await writeFile(path, JSON.stringify(pins, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = await this.readPins(report.generationId);
      if (JSON.stringify(existing) !== JSON.stringify(pins)) throw new VisualReviewError(409, 'Generation-time source pins cannot be replaced.');
    }
  }

  private async readPins(id: string): Promise<GenerationPins | null> {
    try {
      return JSON.parse(await readFile(join(this.directory(id), 'pins.json'), 'utf8')) as GenerationPins;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new VisualReviewError(409, 'The local snapshot pins cannot be read.');
    }
  }

  private async verifiedPins(id: string): Promise<GenerationPins | null> {
    const pins = await this.readPins(id);
    if (!pins) return null;
    let handoff: GenerationPins & { branch: string };
    try {
      const raw = JSON.parse(await readFile(join(this.artifactRoot, '.ums', 'generation', id, 'candidate-report.json'), 'utf8')) as CandidateGenerationReport;
      const formatted = formatVerifiedCandidateHandoff(raw);
      if (!formatted) throw new Error('Unverified candidate');
      handoff = JSON.parse(formatted) as GenerationPins & { branch: string };
    } catch { throw new VisualReviewError(409, 'The candidate report cannot verify the snapshot pins.'); }
    if (pins.version !== 1 || pins.generationId !== id || pins.planIdentity !== handoff.planIdentity
      || pins.candidateBranch !== handoff.branch || pins.candidateCommit !== handoff.candidateCommit
      || pins.candidateTree !== handoff.candidateTree
      || !validPin(pins.sources?.A) || !validPin(pins.sources?.B)) {
      throw new VisualReviewError(409, 'Snapshot pins no longer match the verified generation.');
    }
    return pins;
  }

  private async storedCapture(id: string, source: ComparisonSource, pins: GenerationPins, key?: string): Promise<StoredCapture | null> {
    const path = key ? join(this.routeFolder(id, source, key), 'manifest.json') : this.capturePath(id, source);
    let capture: StoredCapture;
    try { capture = JSON.parse(await readFile(path, 'utf8')) as StoredCapture; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' && !key) return null;
      throw new VisualReviewError(409, 'Local screenshot metadata cannot be read.');
    }
    const pin = pins.sources[source];
    const storedVersion = (capture as { version?: unknown } | null)?.version;
    if (storedVersion === 1 || storedVersion === 2) {
      throw new VisualReviewError(409, 'Legacy screenshots lack exact route provenance. Generate a new candidate before relying on screenshot evidence.');
    }
    if (storedVersion !== 3 || !isSafeCaptureRoute(capture.route) || capture.source !== source || capture.generationId !== id
      || capture.planIdentity !== pins.planIdentity || capture.sourceBranch !== pin.branch
      || capture.sourceCommit !== pin.commit || capture.candidateCommit !== pins.candidateCommit
      || capture.candidateTree !== pins.candidateTree || capture.viewport?.width !== viewport.width
      || capture.viewport?.height !== viewport.height || !/^[0-9a-f-]+\.png$/.test(capture.sourceFile)
      || !/^[0-9a-f-]+\.png$/.test(capture.candidateFile)
      || !/^[a-f0-9]{64}$/.test(capture.sourceSha256) || !/^[a-f0-9]{64}$/.test(capture.candidateSha256)
      || (capture.routeKey !== undefined && capture.routeKey !== routeKey(capture.route))
      || (key !== undefined && key !== routeKey(capture.route))) {
      throw new VisualReviewError(409, 'Local screenshots do not match the pinned source, candidate and route.');
    }
    const folder = dirname(path);
    await Promise.all([
      verifiedImage(join(folder, capture.sourceFile), capture.sourceSha256, 'source ' + source),
      verifiedImage(join(folder, capture.candidateFile), capture.candidateSha256, 'candidate ' + source)
    ]);
    return { ...capture, routeKey: routeKey(capture.route) };
  }

  private async additionalCaptures(id: string, source: ComparisonSource, pins: GenerationPins): Promise<StoredCapture[]> {
    const folder = join(this.directory(id), source, 'routes');
    let entries: import('node:fs').Dirent[];
    try { entries = await readdir(folder, { withFileTypes: true }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw new VisualReviewError(409, 'Additional screenshot route metadata cannot be read.');
    }
    if (entries.length > maxRoutesPerSource - 1 || entries.some(entry => !entry.isDirectory() || !routeKeyPattern.test(entry.name))) {
      throw new VisualReviewError(409, 'Local screenshot route metadata exceeds the allowed limit or contains unexpected entries.');
    }
    return await Promise.all(entries.map(entry => this.storedCapture(id, source, pins, entry.name).then(capture => {
      if (!capture) throw new VisualReviewError(409, 'A recorded screenshot route is missing.');
      return capture;
    })));
  }

  async get(id: string): Promise<VisualSnapshotState> {
    const review = await this.reviews.get(id);
    const pins = await this.verifiedPins(id);
    if (!pins) return { status: 'unavailable', captures: { A: null, B: null }, additionalCaptures: { A: [], B: [] }, reason: 'Generation-time source pins were not saved for this candidate.' };
    const [a, b, additionalA, additionalB] = await Promise.all([
      this.storedCapture(id, 'A', pins), this.storedCapture(id, 'B', pins),
      this.additionalCaptures(id, 'A', pins), this.additionalCaptures(id, 'B', pins)
    ]);
    if ((!a && additionalA.length) || (!b && additionalB.length)
      || (a && additionalA.some(capture => capture.route === a.route))
      || (b && additionalB.some(capture => capture.route === b.route))) {
      throw new VisualReviewError(409, 'Local screenshot routes have conflicting or missing original evidence.');
    }
    return {
      status: review.status === 'stale' ? 'stale' : 'ready',
      candidateCommit: pins.candidateCommit,
      sourcePins: pins.sources,
      captures: { A: a, B: b },
      additionalCaptures: { A: additionalA.sort((x, y) => x.route.localeCompare(y.route)), B: additionalB.sort((x, y) => x.route.localeCompare(y.route)) },
      reason: review.status === 'stale' ? review.reason : undefined
    };
  }

  async capture(id: string, input: unknown): Promise<VisualSnapshotState> {
    if (!input || typeof input !== 'object' || Array.isArray(input)
      || Object.keys(input).sort().join(',') !== 'route,source'
      || !validSource((input as { source?: unknown }).source)
      || !isSafeCaptureRoute((input as { route?: unknown }).route)) {
      throw new VisualReviewError(400, 'Only Source A/B and a safe local pathname are accepted. URLs and commit identities are server-owned.');
    }
    const { source, route } = input as { source: ComparisonSource; route: string };
    const before = await this.get(id);
    if (before.status !== 'ready') throw new VisualReviewError(409, before.reason ?? 'The candidate is no longer current.');
    const prior = [before.captures[source], ...(before.additionalCaptures?.[source] ?? [])].filter(Boolean);
    if (prior.some(capture => capture?.route === route)) return before;
    if (prior.length >= maxRoutesPerSource) throw new VisualReviewError(409, 'Maximum of three screenshot routes per source reached. Generate a new candidate for further routes.');
    const pins = (await this.verifiedPins(id))!;
    const left = this.previews.session('left');
    const right = this.previews.session('right');
    const sourcePin = pins.sources[source];
    if (!left || !right || left.status !== 'running' || right.status !== 'running'
      || !this.previews.isAlive('left') || !this.previews.isAlive('right')
      || left.branch !== sourcePin.branch || left.branchCommit !== sourcePin.commit
      || right.branch !== pins.candidateBranch || right.branchCommit !== pins.candidateCommit) {
      throw new VisualReviewError(409, 'Start the exact pinned source on the left and verified candidate on the right before capture.');
    }
    const key = id + ':' + source;
    if (this.activeCaptures.has(key)) throw new VisualReviewError(409, 'A capture of this source is already running.');
    this.activeCaptures.add(key);
    try {
      const pair = await this.capturePair(localCaptureUrl(left, route), localCaptureUrl(right, route));
      validatePng(pair.source);
      validatePng(pair.candidate);
      // The preview may have restarted or the branch may have moved during capture.
      const after = await this.get(id);
      if (after.status !== 'ready' || this.previews.session('left') !== left
        || this.previews.session('right') !== right || !this.previews.isAlive('left')
        || !this.previews.isAlive('right')) throw new VisualReviewError(409, 'Preview identity changed during capture. Retry with the pinned previews.');
      const existing = [after.captures[source], ...(after.additionalCaptures?.[source] ?? [])].filter(Boolean);
      if (existing.some(capture => capture?.route === route)) return after;
      if (existing.length >= maxRoutesPerSource) throw new VisualReviewError(409, 'Maximum of three screenshot routes per source reached.');
      const folder = after.captures[source]
        ? this.routeFolder(id, source, routeKey(route))
        : join(this.directory(id), source);
      await mkdir(folder, { recursive: true });
      const sourceFile = randomUUID() + '.png';
      const candidateFile = randomUUID() + '.png';
      await writeFile(join(folder, sourceFile), pair.source, { flag: 'wx', mode: 0o600 });
      await writeFile(join(folder, candidateFile), pair.candidate, { flag: 'wx', mode: 0o600 });
      const capture: StoredCapture = {
        version: 3, generationId: id, source, route, routeKey: routeKey(route), planIdentity: pins.planIdentity,
        sourceBranch: sourcePin.branch, sourceCommit: sourcePin.commit,
        candidateCommit: pins.candidateCommit, candidateTree: pins.candidateTree,
        sourceSha256: pngSha256(pair.source), candidateSha256: pngSha256(pair.candidate),
        capturedAt: new Date().toISOString(), viewport, sourceFile, candidateFile
      };
      try {
        await writeFile(join(folder, 'manifest.json'), JSON.stringify(capture, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
      return await this.get(id);
    } finally {
      this.activeCaptures.delete(key);
    }
  }

  async image(id: string, sourceValue: unknown, kind: 'source' | 'candidate', key?: unknown) {
    if (!validSource(sourceValue)) throw new VisualReviewError(400, 'Source A or B is required.');
    if (key !== undefined && (typeof key !== 'string' || !routeKeyPattern.test(key))) {
      throw new VisualReviewError(400, 'Invalid screenshot route identity.');
    }
    const state = await this.get(id);
    const first = state.captures[sourceValue];
    const capture = key === undefined ? first
      : [first, ...(state.additionalCaptures?.[sourceValue] ?? [])].find(item => item?.routeKey === key);
    if (!capture) throw new VisualReviewError(404, 'No local screenshot was captured for that route.');
    const folder = capture === first ? join(this.directory(id), sourceValue) : this.routeFolder(id, sourceValue, key as string);
    // File names are private manifest data, not returned in the public snapshot response.
    const pins = await this.verifiedPins(id);
    if (!pins) throw new VisualReviewError(404, 'No snapshot pins are available.');
    const stored = await this.storedCapture(id, sourceValue, pins, capture === first ? undefined : key as string);
    if (!stored) throw new VisualReviewError(404, 'No local screenshot was captured.');
    const expected = kind === 'source' ? stored.sourceSha256 : stored.candidateSha256;
    return await verifiedImage(join(folder, kind === 'source' ? stored.sourceFile : stored.candidateFile), expected, kind + ' ' + sourceValue);
  }
}
