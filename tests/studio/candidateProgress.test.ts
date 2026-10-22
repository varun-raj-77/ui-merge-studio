import { describe, expect, test } from 'vitest';
import { CandidateProgressTracker } from '../../apps/studio/candidateProgress';

describe('local candidate generation progress ownership', () => {
  test('keeps the running generation intact while an independent preflight completes', async () => {
    const tracker = new CandidateProgressTracker();
    const attempt = tracker.begin('plan-v2-original');
    tracker.update(attempt, { stage: 'verification', message: 'Running typecheck.', verification: 'typecheck' });
    const before = tracker.get();
    const unrelatedPreflight = Promise.resolve({ planIdentity: 'plan-v2-new-selection', status: 'refused' });
    expect((await unrelatedPreflight).status).toBe('refused');
    expect(tracker.get()).toEqual(before);
    expect(tracker.get()).toMatchObject({
      status: 'running', planIdentity: 'plan-v2-original', stage: 'verification', verification: 'typecheck'
    });
  });

  test('preserves the completed attempt for status recovery when other plans are preflighted', async () => {
    const tracker = new CandidateProgressTracker();
    const attempt = tracker.begin('plan-v2-original');
    tracker.finish(attempt, { status: 'succeeded', stage: 'complete', message: 'Verified candidate registered.' });
    await Promise.resolve({ planIdentity: 'plan-v2-other', status: 'ready' });
    expect(tracker.get()).toEqual({
      status: 'succeeded', stage: 'complete', message: 'Verified candidate registered.', planIdentity: 'plan-v2-original'
    });
  });

  test('a late callback from an old attempt cannot rewrite a newer attempt', () => {
    const tracker = new CandidateProgressTracker();
    const previous = tracker.begin('plan-v2-same');
    tracker.update(previous, { stage: 'transform', message: 'Applying code.' });
    const current = tracker.begin('plan-v2-same');
    tracker.update(previous, { stage: 'verification', message: 'Stale verification.' });
    tracker.finish(previous, { status: 'succeeded', stage: 'complete', message: 'Stale result.' });
    tracker.fail(previous, new Error('Stale failure.'));
    expect(tracker.get()).toEqual({
      status: 'running', planIdentity: 'plan-v2-same', stage: 'validate',
      message: 'Candidate generation is running: validate.'
    });
    tracker.update(current, { stage: 'verification', message: 'Current verification.', verification: 'typecheck' });
    tracker.finish(current, { status: 'failed', stage: 'verify', message: 'Current typecheck failed.' });
    expect(tracker.get()).toEqual({
      status: 'failed', stage: 'verify', message: 'Current typecheck failed.', planIdentity: 'plan-v2-same'
    });
  });

  test('status reads are copies and failed attempts cannot retain obsolete progress metadata', () => {
    const tracker = new CandidateProgressTracker();
    expect(tracker.get()).toEqual({
      status: 'idle', stage: null, message: 'No candidate generation is running.'
    });
    const attempt = tracker.begin('plan-v2-test');
    tracker.update(attempt, { stage: 'verification', message: 'Running tests.', path: 'src/App.tsx', sliceId: 'slice-a' });
    const snapshot = tracker.get();
    snapshot.message = 'Forged success.';
    expect(tracker.get().message).toBe('Running tests.');
    tracker.fail(attempt, new Error('Verification failed.'));
    expect(tracker.get()).toEqual({
      status: 'failed', stage: 'verification', message: 'Verification failed.', planIdentity: 'plan-v2-test'
    });
    tracker.update(attempt, { stage: 'complete', message: 'Late success.' });
    expect(tracker.get().status).toBe('failed');
  });
});
