import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { CandidateGenerationReport } from '../../packages/candidate-generation/src/types';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { formatVerifiedCandidateHandoff } from './src/candidateHandoff';
import type { VisualReviewDecision, VisualReviewReceipt, VisualReviewSnapshot } from './src/visualReviewTypes';

const generationIdPattern = /^[a-f0-9]{16}$/;
const decisions = new Set<VisualReviewDecision>(['looks-as-intended', 'needs-changes']);

interface VerifiedHandoff {
  branch: string;
  candidateCommit: string;
  candidateTree: string;
  planIdentity: string;
  generationId: string;
}

export class VisualReviewError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
    this.name = 'VisualReviewError';
  }
}

/**
 * Local developer self-attestation only. A receipt is neither screenshot proof
 * nor permission to merge or relax the external candidate grammar.
 * The server derives all Git/plan fields from its verified report on disk.
 */
export class VisualReviewAuthority {
  private repository: GitSourceRepository;
  private artifactRoot: string;

  constructor(repositoryRoot: string, artifactRoot: string) {
    this.repository = new GitSourceRepository(resolve(repositoryRoot));
    this.artifactRoot = resolve(artifactRoot);
  }

  private receiptPath(id: string) {
    if (!generationIdPattern.test(id)) throw new VisualReviewError(400, 'A valid generation identity is required.');
    return join(this.artifactRoot, '.ums', 'visual-reviews', id, 'receipt.json');
  }

  private async verifiedHandoff(id: string): Promise<VerifiedHandoff> {
    this.receiptPath(id);
    let content: string;
    try {
      content = await readFile(join(this.artifactRoot, '.ums', 'generation', id, 'candidate-report.json'), 'utf8');
    } catch {
      throw new VisualReviewError(404, 'The server has no candidate report for this generation.');
    }
    try {
      const report = JSON.parse(content) as CandidateGenerationReport;
      const verified = formatVerifiedCandidateHandoff(report);
      if (!verified || report.generationId !== id) throw new Error('Incomplete verified report');
      return JSON.parse(verified) as VerifiedHandoff;
    } catch {
      throw new VisualReviewError(409, 'The candidate report does not prove an exact verified Git result.');
    }
  }

  private async currentHead(handoff: VerifiedHandoff): Promise<boolean> {
    try {
      const head = await this.repository.resolveRef('refs/heads/' + handoff.branch);
      if (head !== handoff.candidateCommit) return false;
      return await this.repository.git(['rev-parse', '--verify', head + '^{tree}']) === handoff.candidateTree;
    } catch {
      return false;
    }
  }

  private async storedReceipt(id: string): Promise<VisualReviewReceipt | null> {
    try {
      const text = await readFile(this.receiptPath(id), 'utf8');
      return JSON.parse(text) as VisualReviewReceipt;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new VisualReviewError(409, 'The stored visual review cannot be read or validated.');
    }
  }

  async get(id: string): Promise<VisualReviewSnapshot> {
    const handoff = await this.verifiedHandoff(id);
    const receipt = await this.storedReceipt(id);
    if (receipt && (receipt.version !== 1 || receipt.scope !== 'local-self-attested-visual-review'
      || receipt.generationId !== handoff.generationId
      || receipt.planIdentity !== handoff.planIdentity
      || receipt.candidateBranch !== handoff.branch
      || receipt.candidateCommit !== handoff.candidateCommit
      || receipt.candidateTree !== handoff.candidateTree
      || !decisions.has(receipt.decision))) {
      throw new VisualReviewError(409, 'Stored review identity no longer matches the verified candidate report.');
    }
    if (!await this.currentHead(handoff)) {
      return { status: 'stale', receipt, reason: 'The candidate branch no longer points to the verified commit and tree. Reverify before reviewing.' };
    }
    return { status: receipt ? 'recorded' : 'pending', receipt };
  }

  async record(id: string, input: unknown): Promise<VisualReviewSnapshot> {
    if (!input || typeof input !== 'object' || Array.isArray(input)
      || Object.keys(input).sort().join(',') !== 'decision,notes') {
      throw new VisualReviewError(400, 'Only a review decision and observation notes are accepted.');
    }
    const raw = input as { decision?: unknown; notes?: unknown };
    if (!decisions.has(raw.decision as VisualReviewDecision)
      || typeof raw.notes !== 'string' || raw.notes.trim().length < 8 || raw.notes.trim().length > 400) {
      throw new VisualReviewError(400, 'Choose a review decision and provide 8–400 characters of observations.');
    }
    const decision = raw.decision as VisualReviewDecision;
    const notes = raw.notes.trim();
    const state = await this.get(id);
    if (state.status === 'stale') throw new VisualReviewError(409, state.reason!);
    if (state.receipt) {
      if (state.receipt.decision === decision && state.receipt.notes === notes) return state;
      throw new VisualReviewError(409, 'This candidate already has a different review. Produce a new candidate to revise the attestation.');
    }
    const handoff = await this.verifiedHandoff(id);
    const receipt: VisualReviewReceipt = {
      version: 1, scope: 'local-self-attested-visual-review',
      generationId: handoff.generationId, planIdentity: handoff.planIdentity,
      candidateBranch: handoff.branch, candidateCommit: handoff.candidateCommit,
      candidateTree: handoff.candidateTree, decision, notes, recordedAt: new Date().toISOString()
    };
    const path = this.receiptPath(id);
    await mkdir(join(this.artifactRoot, '.ums', 'visual-reviews', id), { recursive: true });
    try {
      await writeFile(path, JSON.stringify(receipt, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        const latest = await this.get(id);
        if (latest.status === 'recorded' && latest.receipt?.decision === decision && latest.receipt.notes === notes) return latest;
        throw new VisualReviewError(409, 'A review was already recorded for this exact candidate.');
      }
      throw error;
    }
    return { status: 'recorded', receipt };
  }
}
