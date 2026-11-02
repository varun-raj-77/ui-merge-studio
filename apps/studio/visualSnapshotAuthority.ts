import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { CandidateGenerationReport } from '../../packages/candidate-generation/src/types';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { formatVerifiedCandidateHandoff } from './src/candidateHandoff';
import type { ComparisonSource } from './src/candidateLiveComparison';
import type { VisualSnapshotCapture, VisualSnapshotState } from './src/visualSnapshotTypes';
import { VisualReviewAuthority, VisualReviewError } from './visualReviewAuthority';

const generationPattern = /^[a-f0-9]{16}$/;
const commitPattern = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;
const pngHeader = Buffer.from('89504e470d0a1a0a', 'hex');
const viewport = { width: 1280, height: 800 } as const;
const maxPngBytes = 8 * 1024 * 1024;

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
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 });
        // HMR websockets can prevent an absolute network-idle guarantee.
        await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);
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
function validatePng(image: Buffer) {
  if (!Buffer.isBuffer(image) || image.length > maxPngBytes || image.length < pngHeader.length
    || !image.subarray(0, pngHeader.length).equals(pngHeader)) {
    throw new VisualReviewError(409, 'The browser did not produce a bounded PNG screenshot.');
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

  private async storedCapture(id: string, source: ComparisonSource, pins: GenerationPins): Promise<StoredCapture | null> {
    let capture: StoredCapture;
    try { capture = JSON.parse(await readFile(this.capturePath(id, source), 'utf8')) as StoredCapture; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new VisualReviewError(409, 'Local screenshot metadata cannot be read.');
    }
    const pin = pins.sources[source];
    if (capture.version !== 1 || capture.source !== source || capture.generationId !== id
      || capture.planIdentity !== pins.planIdentity || capture.sourceBranch !== pin.branch
      || capture.sourceCommit !== pin.commit || capture.candidateCommit !== pins.candidateCommit
      || capture.candidateTree !== pins.candidateTree || capture.viewport?.width !== viewport.width
      || capture.viewport?.height !== viewport.height || !/^[0-9a-f-]+\.png$/.test(capture.sourceFile)
      || !/^[0-9a-f-]+\.png$/.test(capture.candidateFile)) {
      throw new VisualReviewError(409, 'Local screenshots do not match the pinned source and candidate.');
    }
    return capture;
  }

  async get(id: string): Promise<VisualSnapshotState> {
    const review = await this.reviews.get(id);
    const pins = await this.verifiedPins(id);
    if (!pins) return { status: 'unavailable', captures: { A: null, B: null }, reason: 'Generation-time source pins were not saved for this candidate.' };
    const [a, b] = await Promise.all([this.storedCapture(id, 'A', pins), this.storedCapture(id, 'B', pins)]);
    return {
      status: review.status === 'stale' ? 'stale' : 'ready',
      candidateCommit: pins.candidateCommit,
      sourcePins: pins.sources,
      captures: { A: a, B: b },
      reason: review.status === 'stale' ? review.reason : undefined
    };
  }

  async capture(id: string, input: unknown): Promise<VisualSnapshotState> {
    if (!input || typeof input !== 'object' || Array.isArray(input)
      || Object.keys(input).join(',') !== 'source' || !validSource((input as { source?: unknown }).source)) {
      throw new VisualReviewError(400, 'Only Source A or B may be requested; URLs and commit identities are server-owned.');
    }
    const source = (input as { source: ComparisonSource }).source;
    const before = await this.get(id);
    if (before.status !== 'ready') throw new VisualReviewError(409, before.reason ?? 'The candidate is no longer current.');
    if (before.captures[source]) return before;
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
      const pair = await this.capturePair(safePreviewUrl(left), safePreviewUrl(right));
      validatePng(pair.source);
      validatePng(pair.candidate);
      // The preview may have restarted or the branch may have moved during capture.
      const after = await this.get(id);
      if (after.status !== 'ready' || this.previews.session('left') !== left
        || this.previews.session('right') !== right || !this.previews.isAlive('left')
        || !this.previews.isAlive('right')) throw new VisualReviewError(409, 'Preview identity changed during capture. Retry with the pinned previews.');
      if (after.captures[source]) return after;
      const folder = join(this.directory(id), source);
      await mkdir(folder, { recursive: true });
      const sourceFile = randomUUID() + '.png';
      const candidateFile = randomUUID() + '.png';
      await writeFile(join(folder, sourceFile), pair.source, { flag: 'wx', mode: 0o600 });
      await writeFile(join(folder, candidateFile), pair.candidate, { flag: 'wx', mode: 0o600 });
      const capture: StoredCapture = {
        version: 1, generationId: id, source, planIdentity: pins.planIdentity,
        sourceBranch: sourcePin.branch, sourceCommit: sourcePin.commit,
        candidateCommit: pins.candidateCommit, candidateTree: pins.candidateTree,
        capturedAt: new Date().toISOString(), viewport, sourceFile, candidateFile
      };
      try {
        await writeFile(this.capturePath(id, source), JSON.stringify(capture, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
      return await this.get(id);
    } finally {
      this.activeCaptures.delete(key);
    }
  }

  async image(id: string, sourceValue: unknown, kind: 'source' | 'candidate') {
    if (!validSource(sourceValue)) throw new VisualReviewError(400, 'Source A or B is required.');
    const pins = await this.verifiedPins(id);
    if (!pins) throw new VisualReviewError(404, 'No snapshot pins are available.');
    const capture = await this.storedCapture(id, sourceValue, pins);
    if (!capture) throw new VisualReviewError(404, 'No local screenshot was captured.');
    return await readFile(join(this.directory(id), sourceValue, kind === 'source' ? capture.sourceFile : capture.candidateFile));
  }
}
