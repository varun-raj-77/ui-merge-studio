// @vitest-environment jsdom
import '../setup';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShowcaseApp } from '../../apps/studio/src/ShowcaseApp';

describe('ShowcaseApp', () => {
  it('guides a visitor from landing page to a verified interactive result', async () => {
    render(<ShowcaseApp />);
    fireEvent.click(screen.getByRole('button', { name: /launch interactive demo/i }));
    expect(screen.getByRole('heading', { name: /compare two ui experiments/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /collapse/i }));
    fireEvent.click(screen.getByRole('button', { name: /all notes replies/i }));
    const generate = screen.getByRole('button', { name: /generate verified candidate/i });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);
    await waitFor(() => expect(screen.getByRole('heading', { name: /inspect the combined result/i })).toBeInTheDocument(), { timeout: 4000 });
    expect(screen.getByText(/evidence, not a browser simulation/i)).toBeInTheDocument();
  });
});
