import { describe, expect, test } from 'vitest';
import { CandidateProgressTracker } from '../../apps/studio/candidateProgress';

describe('local candidate generation progress ownership', () => {
  test('keeps the running generation intact while an independent preflight completes', async () => {
    const tracker = new CandidateProgressTracker();
    const attempt = tracker.begin('plan-v2-original', 'a'.repeat(16));
    tracker.update(attempt, { stage: 'verification', message: 'Running typecheck.', verification: 'typecheck' });
    const before = tracker.get();
    const unrelatedPreflight = Promise.resolve({ planIdentity: 'plan-v2-new-selection', status: 'refused' });
    expect((await unrelatedPreflight).status).toBe('refused');
    expect(tracker.get()).toEqual(before);
    expect(tracker.get()).toMatchObject({
      status: 'running', planIdentity: 'plan-v2-original', generationId: 'a'.repeat(16), stage: 'verification', verification: 'typecheck'
    });
  });

  test('preserves the completed attempt for status recovery when other plans are preflighted', async () => {
    const tracker = new CandidateProgressTracker();
    const attempt = tracker.begin('plan-v2-original', 'a'.repeat(16));
    tracker.finish(attempt, { generationId: 'a'.repeat(16), status: 'succeeded', stage: 'complete', message: 'Verified candidate registered.' });
    await Promise.resolve({ planIdentity: 'plan-v2-other', status: 'ready' });
    expect(tracker.get()).toEqual({
      status: 'succeeded', stage: 'complete', message: 'Verified candidate registered.', planIdentity: 'plan-v2-original', generationId: 'a'.repeat(16)
    });
  });

  test('a late callback from an old attempt cannot rewrite a newer attempt', () => {
    const tracker = new CandidateProgressTracker();
    const previous = tracker.begin('plan-v2-same', 'b'.repeat(16));
    tracker.update(previous, { stage: 'transform', message: 'Applying code.' });
    const current = tracker.begin('plan-v2-same', 'b'.repeat(16));
    tracker.update(previous, { stage: 'verification', message: 'Stale verification.' });
    tracker.finish(previous, { generationId: 'b'.repeat(16), status: 'succeeded', stage: 'complete', message: 'Stale result.' });
    tracker.fail(previous, new Error('Stale failure.'));
    expect(tracker.get()).toEqual({
      status: 'running', planIdentity: 'plan-v2-same', generationId: 'b'.repeat(16), stage: 'validate',
      message: 'Candidate generation is running: validate.'
    });
    tracker.update(current, { stage: 'verification', message: 'Current verification.', verification: 'typecheck' });
    tracker.finish(current, { generationId: 'b'.repeat(16), status: 'failed', stage: 'verify', message: 'Current typecheck failed.' });
    expect(tracker.get()).toEqual({
      status: 'failed', stage: 'verify', message: 'Current typecheck failed.', planIdentity: 'plan-v2-same', generationId: 'b'.repeat(16)
    });
  });

  test('refuses a report for a different generation even if the plan identity is unchanged', () => {
    const tracker = new CandidateProgressTracker();
    const attempt = tracker.begin('plan-v2-same', 'a'.repeat(16));
    expect(() => tracker.finish(attempt, {
      generationId: 'b'.repeat(16), status: 'succeeded', stage: 'complete', message: 'Wrong attempt succeeded.'
    })).toThrow('does not match the tracked generation');
    expect(tracker.get()).toMatchObject({
      status: 'running', planIdentity: 'plan-v2-same', generationId: 'a'.repeat(16)
    });
    tracker.fail(attempt, new Error('Returned report has different generation identity.'));
    expect(tracker.get()).toMatchObject({
      status: 'failed', planIdentity: 'plan-v2-same', generationId: 'a'.repeat(16)
    });
    expect(() => tracker.begin('plan-v2-same', '')).toThrow('valid generation identity');
  });

  test('updates preserve the owning generation ID across progress callbacks', () => {
    const tracker = new CandidateProgressTracker();
    const old = tracker.begin('plan-v2-first', 'a'.repeat(16));
    const latest = tracker.begin('plan-v2-second', 'b'.repeat(16));
    tracker.update(old, { stage: 'verification', message: 'OLD SECRET' });
    tracker.update(latest, { stage: 'verification', message: 'Running build.' });
    expect(tracker.get()).toMatchObject({
      status: 'running', planIdentity: 'plan-v2-second', generationId: 'b'.repeat(16), message: 'Running build.'
    });
    expect(JSON.stringify(tracker.get())).not.toContain('OLD SECRET');
  });

  test('status reads are copies and failed attempts cannot retain obsolete progress metadata', () => {
    const tracker = new CandidateProgressTracker();
    expect(tracker.get()).toEqual({
      status: 'idle', stage: null, message: 'No candidate generation is running.'
    });
    const attempt = tracker.begin('plan-v2-test', 'c'.repeat(16));
    tracker.update(attempt, { stage: 'verification', message: 'Running tests.', path: 'src/App.tsx', sliceId: 'slice-a' });
    const snapshot = tracker.get();
    snapshot.message = 'Forged success.';
    expect(tracker.get().message).toBe('Running tests.');
    tracker.fail(attempt, new Error('Verification failed.'));
    expect(tracker.get()).toEqual({
      status: 'failed', stage: 'verification', message: 'Verification failed.', planIdentity: 'plan-v2-test', generationId: 'c'.repeat(16)
    });
    tracker.update(attempt, { stage: 'complete', message: 'Late success.' });
    expect(tracker.get().status).toBe('failed');
  });
});
