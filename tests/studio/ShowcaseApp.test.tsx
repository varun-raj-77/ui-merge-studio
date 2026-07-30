import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogueShowcase } from '../../apps/studio/src/CatalogueShowcase';
import { catalogueEvidence } from '../../apps/studio/src/catalogueEvidence';

const scrollIntoView = vi.fn();
beforeEach(() => {
  history.replaceState({}, '', '?mode=showcase');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
  scrollIntoView.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Try interactive sample' }));
const selectSidebar = () => fireEvent.click(screen.getByRole('button', { name: 'Select category sidebar' }));
const branchB = () => fireEvent.click(screen.getByRole('tab', { name: 'Branch B' }));
const selectQuickView = () => fireEvent.click(screen.getByRole('button', { name: 'Select quick-view inspector' }));
const createButton = () => screen.getByRole('button', { name: /Create combined version/ });

describe('Product Catalogue landing', () => {
  it('states the product promise and hosted/local boundary', () => {
    render(<CatalogueShowcase />);
    expect(screen.getByRole('heading', { name: 'Compare React branches. Keep the best parts.' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try interactive sample' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Run locally' })).not.toHaveLength(0);
    expect(screen.getByText('Interactive sample — no Git operations run in your browser.')).toBeVisible();
  });
});

describe('guided catalogue combination', () => {
  it('starts with an explicit four-step workflow and a disabled primary action', () => {
    render(<CatalogueShowcase />); open();
    expect(screen.getByRole('list', { name: 'Showcase workflow' })).toHaveTextContent('Compare branches');
    expect(screen.getByText('0 of 2 required features selected')).toBeVisible();
    expect(createButton()).toBeDisabled();
    expect(screen.getByText(/Select Category sidebar from Branch A and Product quick view from Branch B/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /promotional banner|inventory summary/i })).not.toBeInTheDocument();
    expect(screen.queryByText(catalogueEvidence['category-sidebar'].sourceFile)).not.toBeInTheDocument();
  });

  it('confirms one selection, identifies its branch, and explains what remains', () => {
    render(<CatalogueShowcase />); open(); selectSidebar();
    expect(screen.getByRole('status')).toHaveTextContent('Selected Category sidebar from Branch A');
    expect(screen.getByText('1 of 2 required features selected')).toBeVisible();
    expect(screen.getByText('Next, select Product quick view from Branch B.')).toBeVisible();
    expect(createButton()).toBeDisabled();
  });

  it('enables only the recorded pair and creates the combined result once', async () => {
    render(<CatalogueShowcase />); open(); selectSidebar(); branchB(); selectQuickView();
    expect(screen.getByRole('status')).toHaveTextContent('Selected Product quick view from Branch B');
    expect(screen.getByText('2 of 2 required features selected')).toBeVisible();
    const button = createButton();
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('button', { name: 'Selected' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Combined result' })).toBeVisible());
    const result = screen.getByRole('heading', { name: 'Combined result' }).closest('section')!;
    expect(result).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(screen.getByText('2 of 2 required features selected')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Combined version created' })).toBeDisabled();
    expect(screen.getByText('Success. Your combined version includes both selected features.')).toBeVisible();
    expect(screen.getAllByLabelText('Combined result product catalogue')).toHaveLength(1);
  });

  it('keeps technical evidence behind a secondary disclosure', () => {
    render(<CatalogueShowcase />); open(); selectSidebar();
    expect(screen.queryByText(catalogueEvidence['category-sidebar'].sourceFile)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View technical evidence' }));
    expect(screen.getByText(catalogueEvidence['category-sidebar'].sourceFile)).toBeVisible();
    expect(screen.getAllByText(/useCategoryFilter/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Hide technical evidence' }));
    expect(screen.queryByText(catalogueEvidence['category-sidebar'].sourceFile)).not.toBeInTheDocument();
  });

  it('presents the incompatible Product-ID proof as a separate disclosure', () => {
    render(<CatalogueShowcase />); open();
    fireEvent.click(screen.getByRole('button', { name: 'View refusal example' }));
    const refusal = screen.getByRole('heading', { name: /refused an unsafe Product-ID combination/ }).closest('section')!;
    expect(refusal).toHaveTextContent('string-based Product ID contract');
    expect(refusal).toHaveTextContent('No broken candidate branch was generated');
    fireEvent.click(within(refusal).getByText('View refusal evidence'));
    expect(refusal).toHaveTextContent('src/types/product.ts#Product');
  });

  it('preserves catalogue interactions and native keyboard controls', () => {
    render(<CatalogueShowcase />); open();
    const collapse = screen.getByRole('button', { name: 'Collapse category sidebar' });
    collapse.focus();
    fireEvent.click(collapse);
    expect(screen.getByRole('button', { name: 'Expand category sidebar' })).toBeVisible();
    branchB();
    fireEvent.click(screen.getAllByRole('button', { name: /^Quick view/ })[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Close quick view' })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
