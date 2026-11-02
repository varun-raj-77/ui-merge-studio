import { expect, test } from 'vitest';
import { matchesPinnedLivePreview } from '../../apps/studio/src/candidateLiveComparison';

const candidateCommit = 'a'.repeat(40);
const sourceCommit = 'b'.repeat(40);
const candidate = {
  branch: 'combined-result',
  status: 'ready' as const,
  session: { branch: 'combined-result', branchCommit: candidateCommit }
};
const pin = { branch: 'combined-result', commit: candidateCommit };

test('only an actually ready session at the pinned branch and exact commit qualifies for visual review', () => {
  expect(matchesPinnedLivePreview(candidate, pin)).toBe(true);
  expect(matchesPinnedLivePreview({ ...candidate, status: 'loading' }, pin)).toBe(false);
  expect(matchesPinnedLivePreview({ ...candidate, branch: 'source-b' }, pin)).toBe(false);
  expect(matchesPinnedLivePreview({ ...candidate, session: { ...candidate.session, branch: 'source-b' } }, pin)).toBe(false);
  expect(matchesPinnedLivePreview({ ...candidate, session: { ...candidate.session, branchCommit: sourceCommit } }, pin)).toBe(false);
  expect(matchesPinnedLivePreview({ ...candidate, session: null }, pin)).toBe(false);
  expect(matchesPinnedLivePreview(candidate, null)).toBe(false);
});

test('source comparison uses a separately pinned source commit, not the generated candidate identity', () => {
  const source = { branch: 'branch-a', status: 'ready' as const,
    session: { branch: 'branch-a', branchCommit: sourceCommit } };
  expect(matchesPinnedLivePreview(source, { branch: 'branch-a', commit: sourceCommit })).toBe(true);
  expect(matchesPinnedLivePreview(source, pin)).toBe(false);
});
