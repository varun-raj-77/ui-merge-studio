import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ShowcaseApp } from '../../apps/studio/src/ShowcaseApp';
import { showcaseManifest } from '../../apps/studio/src/showcaseManifest';

beforeEach(() => history.replaceState({}, '', '?mode=showcase'));
afterEach(cleanup);
const openLab = () => fireEvent.click(screen.getAllByRole('button', { name: /open (the )?merge lab/i })[0]);
const selectFocus = () => fireEvent.click(screen.getByRole('button', { name: /select focus mode/i }));
const openActivity = () => fireEvent.click(screen.getByRole('tab', { name: /version b/i }));
const selectActivity = () => fireEvent.click(screen.getByRole('button', { name: /select activity lens/i }));
const selectBoth = () => { selectFocus(); openActivity(); selectActivity(); };

describe('recruiter-facing landing', () => {
  it('communicates the product in the first view without loading an iframe', () => {
    render(<ShowcaseApp />);
    expect(screen.getByRole('heading', { name: /take the best ui from every branch/i })).toBeVisible();
    expect(screen.getByText(/run multiple react implementations/i)).toBeVisible();
    expect(screen.getByText(/interactive replay of a real verified local run/i)).toBeVisible();
    expect(screen.queryByTitle(/compiled support desk application/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view github/i })).toHaveAttribute('target', '_blank');
  });

  it('shows the visible-selection, dependency, exclusion, verification, and refusal story', () => {
    render(<ShowcaseApp />);
    for (const heading of ['Choose visible features, not filenames.', 'Carry the source that feature needs.', 'Exclude changes you did not choose.', 'Verify the result—or refuse it.']) expect(screen.getByRole('heading', { name: heading })).toBeVisible();
    expect(screen.getAllByText('Operations Command Center heading')).not.toHaveLength(0);
    expect(screen.getByText('Newest-first ticket sorting')).toBeVisible();
  });
});

describe('interactive Merge Lab', () => {
  it('uses one large active artifact and parent-page feature selection', () => {
    render(<ShowcaseApp />); openLab();
    expect(screen.getAllByTitle(/compiled support desk application/i)).toHaveLength(1);
    expect(screen.getByRole('tab', { name: /version a/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /version b/i })).toBeVisible();
    const navigationCallout = screen.getByText('Mapped React boundary: AppSidebar').closest('.behavior-callout');
    expect(navigationCallout).toHaveTextContent('Collapsible navigation');
    selectFocus();
    expect(screen.getByRole('button', { name: /selected from version a/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/focus mode source evidence/i)).toHaveTextContent(showcaseManifest.features[0].sourceFile);
    openActivity();
    expect(screen.getByRole('tab', { name: /version b/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTitle(/branch b compiled support desk application/i)).toBeInTheDocument();
    const activityCallout = screen.getByText('Mapped React boundary: ActivityFilters').closest('.behavior-callout');
    expect(activityCallout).toHaveTextContent('Activity filters');
  });

  it('preserves both selections while switching versions and enables the real candidate replay', () => {
    render(<ShowcaseApp />); openLab();
    const build = screen.getByRole('button', { name: /build combined result/i });
    expect(build).toBeDisabled();
    selectFocus();
    expect(build).toBeDisabled();
    openActivity();
    selectActivity();
    expect(screen.getByText('2 / 2')).toBeVisible();
    expect(build).toBeEnabled();
    fireEvent.click(screen.getByRole('tab', { name: /version a/i }));
    expect(screen.getByRole('button', { name: /selected from version a/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(build);
    expect(screen.getByRole('heading', { name: /selected source in/i })).toBeVisible();
    expect(screen.getAllByText('Operations Command Center heading')).not.toHaveLength(0);
    expect(screen.getAllByText('Newest-first sorting change')).not.toHaveLength(0);
    expect(screen.getByText('src/features/navigation/AppSidebar.tsx')).toBeVisible();
    expect(screen.getByText('src/features/tickets/ActivityFilters.tsx')).toBeVisible();
    const resultProof = screen.getByLabelText('Combined result composition');
    expect(resultProof).toHaveTextContent('Collapsible navigation');
    expect(resultProof).toHaveTextContent('Activity filters');
    expect(resultProof).toHaveTextContent('Operations Command Center heading');
    expect(resultProof).toHaveTextContent('Newest-first sorting change');
    expect(screen.getByRole('heading', { name: /one app. both selected features/i }).closest('.combined-section')).toBeTruthy();
    expect(screen.getByTitle(/combined result compiled support desk application/i)).toBeInTheDocument();
  });

  it('renders only recorded verification gates and technical evidence on demand', () => {
    render(<ShowcaseApp />); openLab(); selectBoth(); fireEvent.click(screen.getByRole('button', { name: /build combined result/i }));
    expect(screen.getAllByText('Passed')).toHaveLength(4);
    expect(screen.queryByText(/accessibility checks|visual diff/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /view full verification evidence/i }));
    fireEvent.click(screen.getByText('typecheck'));
    expect(screen.getByText('npm run typecheck')).toBeVisible();
  });

  it('replays the separately tested route-contract refusal without claiming generation ran', () => {
    render(<ShowcaseApp />); openLab(); selectBoth(); fireEvent.click(screen.getByRole('button', { name: /build combined result/i }));
    fireEvent.click(screen.getByRole('button', { name: /try an unsafe combination/i }));
    expect(screen.getByText('These versions represent the selected ticket in different URL formats.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /check compatibility/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Preview synchronization refused');
    expect(screen.getByRole('alert')).toHaveTextContent('No candidate was attempted or created');
    expect(screen.getByRole('alert')).toHaveTextContent('incompatible URL formats');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/ticket-query-v1|ticket-path-v1/);
    expect(screen.getByRole('alert')).not.toHaveTextContent(/candidate generation failed|merge conflict/i);
    fireEvent.click(screen.getByText('Technical details'));
    expect(screen.getByText('ticket-query-v1')).toBeVisible();
    expect(screen.getByText('ticket-path-v1')).toBeVisible();
    expect(screen.getByText(/Route synchronization unavailable: contracts differ/)).toBeVisible();
  });

  it('restores valid history state and restart resets the lab', () => {
    render(<ShowcaseApp />); openLab(); selectFocus();
    const prior = history.state;
    openActivity();
    fireEvent(window, new PopStateEvent('popstate', { state: prior }));
    expect(screen.getByRole('tab', { name: /version a/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /selected from version a/i })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /restart lab/i }));
    expect(screen.getByRole('button', { name: /select focus mode/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('0 / 2')).toBeVisible();
  });
});
