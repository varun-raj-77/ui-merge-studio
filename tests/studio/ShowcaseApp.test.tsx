import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogueShowcase } from '../../apps/studio/src/CatalogueShowcase';

beforeEach(() => history.replaceState({}, '', '?mode=showcase'));
afterEach(() => {
  cleanup();
  document.querySelectorAll('[data-test-frame]').forEach(element => element.remove());
  vi.restoreAllMocks();
});

function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Try the interactive example' }));
}

function attachDocument(frame: HTMLIFrameElement) {
  const host = document.createElement('div');
  host.dataset.testFrame = '';
  document.body.append(host);
  Object.defineProperty(frame, 'contentDocument', { configurable: true, value: document });
  return host;
}

function installScope(frameTitle: string, scope: string, label: string, content = '<button>Quick view</button>') {
  const frame = screen.getByTitle(frameTitle) as HTMLIFrameElement;
  const host = attachDocument(frame);
  host.innerHTML = `<div data-ums-scope="${scope}" data-ums-label="${label}">${content}</div>`;
  fireEvent.load(frame);
  return host;
}

describe('Product Catalogue landing', () => {
  it('explains the outcome in five seconds without implementation terminology', () => {
    render(<CatalogueShowcase />);
    expect(screen.getByRole('heading', { name: 'Combine the best parts of parallel React implementations.' })).toBeVisible();
    expect(screen.getByText('Compare working versions, pick visible features, and generate one verified branch.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try the interactive example' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'How it works' })).toBeVisible();
    expect(screen.queryByText(/Branch A|Branch B|candidate ID|AST|Product Catalogue/i)).not.toBeInTheDocument();
  });
});

describe('quiet comparison workspace', () => {
  it('opens two interactive versions with no mode toggle, combined panel, or empty review UI', () => {
    render(<CatalogueShowcase />); open();
    expect(screen.getByRole('heading', { name: 'Compare versions' })).toBeVisible();
    expect(screen.getByTitle('Version A live application')).toBeVisible();
    expect(screen.getByTitle('Version B live application')).toBeVisible();
    expect(screen.getByTitle('Combined result application')).not.toBeVisible();
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select' })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Current selections' })).not.toBeInTheDocument();
  });

  it('keeps normal app clicks independent from the nearby source-backed Add control', () => {
    render(<CatalogueShowcase />); open();
    const appClick = vi.fn();
    const frame = screen.getByTitle('Version B live application') as HTMLIFrameElement;
    const host = attachDocument(frame);
    host.innerHTML = '<div data-ums-scope="product-quick-view:p-102" data-ums-label="Quick View on Studio Speaker"><button id="quick">Quick view</button></div>';
    host.querySelector('#quick')!.addEventListener('click', appClick);
    fireEvent.load(frame);

    fireEvent.click(host.querySelector('#quick')!);
    expect(appClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('complementary', { name: 'Current selections' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add Quick View on Studio Speaker' }));
    expect(screen.getByRole('complementary', { name: 'Current selections' })).toHaveTextContent('Quick View · Studio Speaker');
  });

  it('offers customization before selection and changes to editing after the sidebar is selected', () => {
    render(<CatalogueShowcase />); open();
    installScope(
      'Version A live application',
      'category-sidebar',
      'Category sidebar',
      '<aside>Categories</aside>'
    );
    const customize = screen.getByRole('button', { name: 'Customize & add' });
    expect(customize).toBeEnabled();
    fireEvent.click(customize);
    expect(within(screen.getByRole('dialog', { name: 'Category sidebar' })).getByRole('button', { name: 'Add customized sidebar' })).toBeVisible();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Category sidebar' })).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Category sidebar' }));
    const edit = screen.getByRole('button', { name: 'Edit categories' });
    fireEvent.click(edit);
    expect(within(screen.getByRole('dialog', { name: 'Category sidebar' })).getByRole('button', { name: 'Save customization' })).toBeVisible();
  });

  it('applies category customization as one dock row and one undoable decision', () => {
    render(<CatalogueShowcase />); open();
    installScope('Version A live application', 'category-sidebar', 'Category sidebar', '<aside>Categories</aside>');
    fireEvent.click(screen.getByRole('button', { name: 'Add Category sidebar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit categories' }));
    const dialog = screen.getByRole('dialog', { name: 'Category sidebar' });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'All' }));
    expect(within(dialog).getByRole('button', { name: 'Save customization' })).toBeDisabled();
    expect(dialog).toHaveTextContent('Choose a default category from the categories you kept.');
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Desk' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save customization' }));
    const dock = screen.getByRole('complementary', { name: 'Current selections' });
    expect(dock).toHaveTextContent('Audio, Desk, Travel');
    expect(dock).toHaveTextContent('Default: Desk');
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByRole('region', { name: 'Selection history' })).toHaveTextContent('Customized Category sidebar');
    fireEvent.click(screen.getByRole('button', { name: /^Undo$/ }));
    expect(dock).not.toHaveTextContent('Default: Desk');
    fireEvent.click(screen.getByRole('button', { name: /^Redo$/ }));
    expect(dock).toHaveTextContent('Default: Desk');
  });

  it('adds all Quick View instances as one capability action without a new candidate shape', () => {
    render(<CatalogueShowcase />); open();

    const addAll = screen.getByRole('button', { name: 'Add Quick View to all products' });
    fireEvent.click(addAll);
    expect(screen.getByRole('complementary', { name: 'Current selections' })).toHaveTextContent('5 selections');
    expect(screen.getByRole('complementary', { name: 'Current selections' })).toHaveTextContent('Catalogue · /catalogue');
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByRole('region', { name: 'Selection history' })).toHaveTextContent(
      'Added Quick View to all products'
    );
  });

  it('describes sidebar ownership and the configurable category level', () => {
    render(<CatalogueShowcase />); open();
    installScope(
      'Version A live application',
      'category-sidebar',
      'Category sidebar',
      '<aside>Categories</aside>'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details for Category sidebar' }));
    const dialog = screen.getByRole('dialog', { name: 'Category sidebar' });
    expect(dialog).toHaveTextContent('Whole feature');
    expect(dialog).toHaveTextContent('Version A');
    expect(dialog).toHaveTextContent('/catalogue');
    expect(dialog).toHaveTextContent('product-catalogue');
    expect(dialog).toHaveTextContent('Customize categories');
    expect(dialog).toHaveTextContent('permanent default');
    expect(dialog).not.toHaveTextContent(/\.tsx?|src\//);
  });

  it('transitions to a distinct combined result and returns to comparison', async () => {
    render(<CatalogueShowcase />); open();
    const app = installScope('Version A live application', 'category-sidebar', 'Category sidebar', '<aside>Categories</aside>');
    fireEvent.click(screen.getByRole('button', { name: 'Add Category sidebar' }));
    fireEvent.click(screen.getByRole('button', { name: 'View combined' }));

    expect(screen.getByText('Combined result')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Built from 1 selection' })).toBeVisible();
    expect(screen.getByTitle('Combined result application')).toBeVisible();
    expect(screen.getByTitle('Version A live application')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '← Back to comparison' }));
    expect(screen.getByTitle('Version A live application')).toBeVisible();
    await waitFor(() => expect(screen.getByTitle('Combined result application')).not.toBeVisible());
  });

  it('opens optional evidence from a selected chip and returns focus on Escape', () => {
    render(<CatalogueShowcase />); open();
    const app = installScope('Version B live application', 'product-quick-view:p-103', 'Quick View on Task Lamp');
    fireEvent.click(screen.getByRole('button', { name: 'Add Quick View on Task Lamp' }));
    const evidenceButton = screen.getByRole('button', { name: 'Evidence for Quick View · Task Lamp' });
    fireEvent.click(evidenceButton);

    const dialog = screen.getByRole('dialog', { name: 'Quick View · Task Lamp' });
    expect(dialog).toHaveTextContent('ProductCardWithQuickView');
    expect(within(dialog).getByRole('tab', { name: 'source' })).toHaveAttribute('aria-selected', 'true');
    const closeButton = within(dialog).getByRole('button', { name: 'Close technical evidence' });
    const verificationTab = within(dialog).getByRole('tab', { name: 'verification' });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(verificationTab).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(evidenceButton).toHaveFocus();
  });

  it('reviews and recovers from the Product-ID conflict without clearing safe selections', () => {
    render(<CatalogueShowcase />); open();
    const app = installScope('Version B live application', 'product-quick-view:p-101', 'Quick View on Arc Headphones');
    fireEvent.click(screen.getByRole('button', { name: 'Add Quick View on Arc Headphones' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Experimental Product-ID change' }));

    expect(screen.getByRole('complementary', { name: 'Current selections' })).toHaveTextContent('Conflict');
    fireEvent.click(screen.getByRole('button', { name: 'Review conflict' }));
    const dialog = screen.getByRole('dialog', { name: 'Cannot combine these selections' });
    expect(dialog).toHaveTextContent('src/types/product.ts#Product');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove incompatible change' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Current selections' })).toHaveTextContent('Quick View · Arc Headphones');
    expect(screen.getByRole('button', { name: 'View combined' })).toBeVisible();
  });
});
