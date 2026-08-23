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
  fireEvent.click(screen.getByRole('button', { name: 'Try interactive demo' }));
}

function selectParts() {
  fireEvent.click(screen.getByRole('button', { name: 'Select parts' }));
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

function openDropdown(name: string) {
  const trigger = screen.getByRole('button', { name });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
}

describe('public landing', () => {
  it('communicates the outcome and keeps technical evidence out of the hero', () => {
    render(<CatalogueShowcase />);
    expect(screen.getByRole('heading', { name: 'Build the version you actually want.' })).toBeVisible();
    expect(screen.getByText('Compare parallel implementations, select the parts you prefer, and create one verified branch.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try interactive demo' })).toBeVisible();
    const demo = screen.getByLabelText('Illustration of two source versions converging into one verified result');
    expect(demo).toHaveTextContent('Sidebar A');
    expect(demo).toHaveTextContent('Quick View B');
    expect(demo).toHaveTextContent('Verified');
    expect(screen.queryByText(/candidate ID|AST|operation ID/i)).not.toBeInTheDocument();
  });

  it('keeps hosted and local product boundaries truthful', () => {
    render(<CatalogueShowcase />);
    const hosted = screen.getByRole('note', { name: 'Hosted showcase boundary' });
    expect(hosted).toHaveTextContent('Controlled, recorded proof');
    expect(hosted).toHaveTextContent('No repository access in the browser');
    expect(screen.getByRole('region', { name: 'The real workspace stays local.' })).toHaveTextContent('React · TypeScript · Vite · Local Git');
    expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute('href', 'https://github.com/varun-raj-77/ui-merge-studio#run-locally');
  });
});

describe('three-act presentation', () => {
  it('opens in Compare with side-by-side canvases, explicit selection, and no premature evidence or island', () => {
    render(<CatalogueShowcase />); open();
    expect(screen.getByRole('heading', { name: 'Compare versions' })).toBeVisible();
    expect(screen.getByTitle('Version A live application')).toBeVisible();
    expect(screen.getByTitle('Version B live application')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Select parts' })).toBeVisible();
    expect(screen.queryByRole('complementary', { name: 'Current selections' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const compare = screen.getByRole('region', { name: 'Compare versions' });
    expect(within(compare).queryByText(/Pinned commit|Integration Plan|operation/i)).not.toBeInTheDocument();
  });

  it('keeps app interaction normal until Select mode and exits Select with Escape', () => {
    render(<CatalogueShowcase />); open();
    const appClick = vi.fn();
    const frame = screen.getByTitle('Version B live application') as HTMLIFrameElement;
    const host = attachDocument(frame);
    host.innerHTML = '<div data-ums-scope="product-quick-view:p-102" data-ums-label="Quick View on Studio Speaker"><button id="quick">Quick view</button></div>';
    host.querySelector('#quick')!.addEventListener('click', appClick);
    fireEvent.load(frame);
    fireEvent.click(host.querySelector('#quick')!);
    expect(appClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Keep Quick View on Studio Speaker from Version B' })).not.toBeInTheDocument();

    selectParts();
    expect(screen.getByRole('button', { name: /Selecting/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Keep Quick View on Studio Speaker from Version B' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Select parts' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Keep Quick View on Studio Speaker from Version B' })).not.toBeInTheDocument();
  });

  it('creates the compact action island only after a real selection', () => {
    render(<CatalogueShowcase />); open(); selectParts();
    installScope('Version A live application', 'category-sidebar', 'Category sidebar', '<aside>Categories</aside>');
    fireEvent.click(screen.getByRole('button', { name: 'Keep Category sidebar from Version A' }));
    const island = screen.getByRole('complementary', { name: 'Current selections' });
    expect(island).toHaveTextContent('1 selected');
    expect(within(island).getByRole('button', { name: 'Combine 1 part' })).toBeInTheDocument();
    expect(screen.queryByText('FoundationMain')).not.toBeInTheDocument();
  });

  it('preserves selected state while switching narrow Version tabs', () => {
    render(<CatalogueShowcase />); open(); selectParts();
    installScope('Version A live application', 'category-sidebar', 'Category sidebar', '<aside>Categories</aside>');
    fireEvent.click(screen.getByRole('button', { name: 'Keep Category sidebar from Version A' }));
    fireEvent.click(screen.getByRole('button', { name: /^Version B$/ }));
    expect(screen.getByRole('button', { name: /^Version B$/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('complementary', { name: 'Current selections' })).toHaveTextContent('1 selected');
  });

  it('keeps category customization contextual and undoable', () => {
    render(<CatalogueShowcase />); open(); selectParts();
    installScope('Version A live application', 'category-sidebar', 'Category sidebar', '<aside>Categories</aside>');
    openDropdown('More selection actions for Version A');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Customize Category sidebar' }));
    const dialog = screen.getByRole('dialog', { name: 'Category sidebar' });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'All' }));
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Desk' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add customized sidebar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Inspect Category sidebar selection' }));
    expect(screen.getByText(/Audio, Desk, Travel · Default Desk/)).toBeVisible();
    openDropdown('More workspace actions');
    fireEvent.click(screen.getByRole('menuitem', { name: /Undo/ }));
    expect(screen.getByRole('main')).toHaveAttribute('data-history-future', '1');
  });

  it('keeps the all-instances capability in the preview overflow', () => {
    render(<CatalogueShowcase />); open(); selectParts();
    openDropdown('More selection actions for Version B');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Keep Quick View for all products' }));
    expect(screen.getByRole('complementary', { name: 'Current selections' })).toHaveTextContent('5 selected');
    expect(screen.getByRole('button', { name: 'Combine 5 parts' })).toBeInTheDocument();
  });

  it('uses a micro-popover before the focus-trapped evidence sheet', async () => {
    render(<CatalogueShowcase />); open(); selectParts();
    installScope('Version B live application', 'product-quick-view:p-103', 'Quick View on Task Lamp');
    fireEvent.click(screen.getByRole('button', { name: 'Keep Quick View on Task Lamp from Version B' }));
    const token = screen.getByRole('button', { name: 'Inspect Quick View · Task Lamp selection' });
    fireEvent.click(token);
    expect(screen.getByText('Source resolved')).toBeVisible();
    expect(screen.queryByText('src/features/catalogue/ProductQuickViewShelf.tsx:9')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect evidence' }));

    const sheet = screen.getByRole('dialog', { name: 'Quick View · Task Lamp' });
    expect(sheet).toHaveTextContent('ProductQuickViewShelf');
    expect(sheet).toHaveTextContent('src/features/catalogue/ProductQuickViewShelf.tsx:9');
    expect(within(sheet).getByRole('tab', { name: 'overview' })).toHaveAttribute('data-state', 'active');
    fireEvent.focus(within(sheet).getByRole('tab', { name: 'dependencies' }));
    await waitFor(() => expect(sheet).toHaveTextContent('src/hooks/useSelectedProduct.ts'));
    fireEvent.focus(within(sheet).getByRole('tab', { name: 'integration' }));
    await waitFor(() => expect(sheet).toHaveTextContent('Add selected component'));
    fireEvent.focus(within(sheet).getByRole('tab', { name: 'verification' }));
    await waitFor(() => expect(sheet).toHaveTextContent('Check the generated candidate with TypeScript.'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('makes Result the payoff and hides comparison and redundant metadata', async () => {
    render(<CatalogueShowcase />); open(); selectParts();
    installScope('Version A live application', 'category-sidebar', 'Category sidebar', '<aside>Categories</aside>');
    fireEvent.click(screen.getByRole('button', { name: 'Keep Category sidebar from Version A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Combine 1 part' }));
    expect(screen.getByRole('heading', { name: 'Combined result' })).toBeInTheDocument();
    expect(screen.getByTitle('Combined result application')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('data-workspace-state', 'combined');
    expect(screen.queryByText(/plan-v2|tree hash|operation ID/i)).not.toBeInTheDocument();
    expect(screen.getByText('Preparing recorded candidate')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Compare again/ }));
    expect(screen.getByTitle('Version A live application')).toBeVisible();
  });

  it('presents refusal as a protected outcome and defers technical evidence', () => {
    render(<CatalogueShowcase />); open(); selectParts();
    installScope('Version B live application', 'product-quick-view:p-101', 'Quick View on Arc Headphones');
    fireEvent.click(screen.getByRole('button', { name: 'Keep Quick View on Arc Headphones from Version B' }));
    openDropdown('More workspace actions');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Experimental Product-ID change' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review refusal' }));
    const dialog = screen.getByRole('dialog', { name: 'Cannot combine safely' });
    expect(dialog).toHaveTextContent('No combined result was produced.');
    expect(dialog).not.toHaveTextContent('src/types/product.ts#Product');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Why?' }));
    expect(dialog).toHaveTextContent('src/types/product.ts#Product');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change selection' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Combine 1 part' })).toBeInTheDocument();
  });

  it('honors reduced-motion preference without removing state changes', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
      matches: query.includes('prefers-reduced-motion'), media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn()
    }));
    render(<CatalogueShowcase />); open(); selectParts();
    expect(screen.getByRole('button', { name: /Selecting/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Select parts' })).toBeVisible();
  });
});
