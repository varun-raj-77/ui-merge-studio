import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogueShowcase } from '../../apps/studio/src/CatalogueShowcase';

beforeEach(() => history.replaceState({}, '', '?mode=showcase'));
afterEach(cleanup);

function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Open comparison workspace' }));
}

describe('Product Catalogue landing', () => {
  it('states the product promise and honest hosted/local boundary', () => {
    render(<CatalogueShowcase />);
    expect(screen.getByRole('heading', { name: 'Compare React branches. Keep the best parts.' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open comparison workspace' })).toBeVisible();
    expect(screen.getByText(/Hosted candidates are pre-generated/)).toBeVisible();
  });
});

describe('free-selection workspace', () => {
  it('opens with live play mode, three previews, and no prescribed selection', () => {
    render(<CatalogueShowcase />); open();
    expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('Branch A live application')).toBeVisible();
    expect(screen.getByTitle('Branch B live application')).toBeVisible();
    expect(screen.getByTitle('Combined live application')).toBeVisible();
    expect(screen.getByText('Baseline · no feature scopes selected')).toBeVisible();
    expect(screen.queryByText(/Step|Next, select|of 2 required/i)).not.toBeInTheDocument();
  });

  it('switches explicitly between play and select without prescribing a feature pair', () => {
    render(<CatalogueShowcase />); open();
    const play = screen.getByRole('button', { name: 'Play' });
    const select = screen.getByRole('button', { name: 'Select' });
    fireEvent.click(select);
    expect(select).toHaveAttribute('aria-pressed', 'true');
    expect(play).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Select mode exposes only engine-supported source scopes.')).toBeVisible();
    expect(screen.queryByText(/Next, select|of 2 required/i)).not.toBeInTheDocument();
  });

  it('explains the local/hosted execution boundary in a keyboard-closeable dialog', () => {
    render(<CatalogueShowcase />); open();
    fireEvent.click(screen.getByRole('button', { name: 'About local and hosted execution' }));
    expect(screen.getByRole('dialog', { name: 'Local engine, hosted replay' })).toHaveTextContent('64 artifacts pre-generated');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the incompatible source unavailable until a conflicting Quick View scope exists', () => {
    render(<CatalogueShowcase />); open();
    const incompatible = screen.getByRole('button', { name: 'Try incompatible Product ID' });
    expect(incompatible).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clear all restores the canonical baseline state', () => {
    render(<CatalogueShowcase />); open();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled();
    expect(screen.getByText('Baseline · no feature scopes selected')).toBeVisible();
  });
});
