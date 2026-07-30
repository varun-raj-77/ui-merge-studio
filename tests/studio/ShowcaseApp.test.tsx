import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogueShowcase } from '../../apps/studio/src/CatalogueShowcase';
import { catalogueEvidence } from '../../apps/studio/src/catalogueEvidence';

beforeEach(() => history.replaceState({}, '', '?mode=showcase'));
afterEach(cleanup);
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Try interactive sample' }));
const selectSidebar = () => fireEvent.click(screen.getByRole('button', { name: 'Select category sidebar' }));
const branchB = () => fireEvent.click(screen.getByRole('tab', { name: 'Branch B' }));
const selectInspector = () => fireEvent.click(screen.getByRole('button', { name: 'Select quick-view inspector' }));

describe('Product Catalogue landing', () => {
  it('uses a compact, honest first viewport with both primary actions', () => {
    render(<CatalogueShowcase />);
    expect(screen.getByRole('heading', { name: 'Compare React branches. Keep the best parts.' })).toBeVisible();
    expect(screen.getByText(/run implementations side by side/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try interactive sample' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Run locally' })).not.toHaveLength(0);
    expect(screen.getByText('Interactive sample — no Git operations run in your browser.')).toBeVisible();
    expect(screen.queryByText(/support desk|focus mode|activity lens/i)).not.toBeInTheDocument();
  });
});

describe('free catalogue comparison', () => {
  it('starts empty with baseline visible and supports free select/deselect', () => {
    render(<CatalogueShowcase />); open();
    expect(screen.getByLabelText('Baseline product catalogue')).toBeVisible();
    expect(screen.getByLabelText('Branch A product catalogue')).toBeVisible();
    expect(screen.getByText('Nothing selected yet')).toBeVisible();
    selectSidebar();
    expect(screen.getByText(catalogueEvidence['category-sidebar'].sourceFile)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Remove Collapsible category sidebar' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Collapsible category sidebar' }));
    expect(screen.getByText('Nothing selected yet')).toBeVisible();
  });

  it('keeps catalogue features interactive', () => {
    render(<CatalogueShowcase />); open();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse category sidebar' }));
    expect(screen.getByRole('button', { name: 'Expand category sidebar' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Expand category sidebar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Desk' }));
    expect(screen.getByLabelText('Branch A product catalogue')).toHaveTextContent('2 products');
    branchB();
    fireEvent.click(screen.getAllByRole('button', { name: /quick view/i })[0]);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close quick view' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('builds only the recorded safe pair and exposes selection-driven evidence', () => {
    render(<CatalogueShowcase />); open(); selectSidebar(); branchB(); selectInspector();
    expect(screen.getByText(catalogueEvidence['quick-view'].sourceFile)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate selected combination' }));
    expect(screen.getByRole('heading', { name: 'Combined result' })).toBeVisible();
    expect(screen.getByText(/excluded: promotional banner and inventory summary/i)).toBeVisible();
    expect(screen.getByLabelText('Combined result product catalogue')).toBeVisible();
  });

  it('naturally refuses the incompatible product-id pair before mutation', () => {
    render(<CatalogueShowcase />); open();
    fireEvent.click(screen.getByRole('button', { name: 'Replay Product-ID refusal proof' }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('existing Product contract');
    expect(alert).toHaveTextContent('No candidate was attempted or created');
  });

  it('does not fabricate unrecorded hosted combinations', () => {
    render(<CatalogueShowcase />); open();
    fireEvent.click(screen.getByRole('button', { name: 'Select promotional banner' }));
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate selected combination' }));
    expect(screen.getByRole('status')).toHaveTextContent('no recorded engine result');
    expect(screen.getByRole('status')).toHaveTextContent('Run locally');
  });
});
