// @vitest-environment jsdom
import '../setup';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ShowcaseApp } from '../../apps/studio/src/ShowcaseApp';

afterEach(cleanup);

function launch() {
  fireEvent.click(screen.getByRole('button', { name: /launch interactive demo/i }));
}

function selectBoth() {
  fireEvent.click(screen.getByRole('button', { name: /select collapsible navigation feature/i }));
  fireEvent.click(screen.getByRole('button', { name: /select activity filters feature/i }));
}

async function generate() {
  fireEvent.click(screen.getByRole('button', { name: /^generate candidate/i }));
  await waitFor(() => expect(screen.getByRole('heading', { name: /inspect the combined result/i })).toBeInTheDocument(), { timeout: 2500 });
}

describe('ShowcaseApp', () => {
  it('starts on the landing page and keeps illustrative controls non-interactive', () => {
    render(<ShowcaseApp />);
    expect(screen.getByRole('heading', { name: /choose the best ui/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /launch interactive demo/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /new ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^generate candidate$/i })).not.toBeInTheDocument();
  });

  it('completes the happy path, opens evidence, and restarts at landing', async () => {
    render(<ShowcaseApp />);
    launch();
    expect(screen.getByRole('heading', { name: /compare two ui experiments/i })).toBeInTheDocument();
    selectBoth();
    expect(screen.getByRole('button', { name: /^generate candidate/i })).toBeEnabled();
    await generate();

    fireEvent.click(screen.getByRole('button', { name: /view evidence/i }));
    expect(screen.getByRole('heading', { name: /what the hosted result proves/i })).toBeInTheDocument();
    expect(screen.getByText(/no branch, worktree, test process/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view source on github/i })).toHaveAttribute('href', expect.stringContaining('github.com'));
    expect(screen.getByRole('link', { name: /run locally/i })).toHaveAttribute('href', expect.stringContaining('#run-the-controlled-demo'));

    fireEvent.click(screen.getByRole('button', { name: /restart demo/i }));
    expect(screen.getByRole('heading', { name: /choose the best ui/i })).toBeInTheDocument();
  });

  it('preserves selections for revision, supports removal, and regenerates', async () => {
    render(<ShowcaseApp />);
    launch();
    selectBoth();
    await generate();
    fireEvent.click(screen.getByRole('button', { name: /back to selections/i }));

    expect(screen.getByRole('button', { name: /remove collapsible navigation feature/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /remove activity filters feature/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /remove collapsible navigation feature/i }));
    expect(screen.getByRole('button', { name: /^generate candidate/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /select collapsible navigation feature/i }));
    expect(screen.getByRole('button', { name: /^generate candidate/i })).toBeEnabled();
    await generate();
    expect(screen.getByText(/previously verified candidate/i)).toBeInTheDocument();
  });

  it('keeps incomplete selection invalid and inspection tabs do not mutate the candidate', async () => {
    render(<ShowcaseApp />);
    launch();
    expect(screen.getByRole('button', { name: /^generate candidate/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /select collapsible navigation feature/i }));
    expect(screen.getByRole('button', { name: /^generate candidate/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /select activity filters feature/i }));
    await generate();

    fireEvent.click(screen.getByRole('button', { name: /base/i }));
    fireEvent.click(screen.getByRole('button', { name: /activity source/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to selections/i }));
    expect(screen.getByRole('button', { name: /remove collapsible navigation feature/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /remove activity filters feature/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not restore a stale demo state after a default re-entry', async () => {
    const first = render(<ShowcaseApp />);
    launch();
    selectBoth();
    await generate();
    first.unmount();

    render(<ShowcaseApp />);
    expect(screen.getByRole('heading', { name: /choose the best ui/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /inspect the combined result/i })).not.toBeInTheDocument();
  });
});
