import type { PreviewSlot } from './comparisonState';

export type ComparisonSource = 'A' | 'B';
export type SourcePreviewPins = Record<ComparisonSource, LivePreviewPin | null>;

export interface LivePreviewPin {
  branch: string;
  commit: string;
}

/**
 * Browser UX fence only, not a security attestation. A preview is ready for
 * comparison only if its actual session matches the pinned branch and commit.
 * The server separately rechecks the candidate ref before persisting a receipt.
 */
export function matchesPinnedLivePreview(
  preview: Pick<PreviewSlot, 'branch' | 'status'> & {
    session: Pick<NonNullable<PreviewSlot['session']>, 'branch' | 'branchCommit'> | null;
  },
  pin: LivePreviewPin | null
): boolean {
  return Boolean(pin?.branch && pin.commit
    && preview.status === 'ready'
    && preview.branch === pin.branch
    && preview.session?.branch === pin.branch
    && preview.session?.branchCommit === pin.commit);
}
