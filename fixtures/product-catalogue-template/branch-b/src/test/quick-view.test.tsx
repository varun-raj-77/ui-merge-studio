import { fireEvent, render, screen } from '@testing-library/react';
import { CatalogueHeader } from '../features/catalogue/CatalogueHeader';
import { ProductGrid } from '../features/catalogue/ProductGrid';
import { quickViewTargetIds } from '../config/quickViewTargets';
import { products } from '../fixtures/products';
test('enables quick view only for configured stable product IDs', () => { render(<ProductGrid products={products} />); const targets = new Set<string>(quickViewTargetIds); expect(screen.queryAllByRole('button', { name: 'Quick view' })).toHaveLength(targets.size); for (const product of products) { const card = screen.getByRole('heading', { name: product.name }).closest('article')!; expect(Boolean(card.querySelector('button'))).toBe(targets.has(String(product.id))); } });
test('opens, focuses, and closes quick view', () => { render(<ProductGrid products={products} />); fireEvent.click(screen.getAllByRole('button', { name: 'Quick view' })[0]); expect(screen.getByRole('dialog')).toBeVisible(); expect(screen.getByRole('button', { name: 'Close quick view' })).toHaveFocus(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); });
test('keeps the inventory summary as a separate branch change', () => { render(<CatalogueHeader />); expect(screen.getByText('5 products ready')).toBeVisible(); });
