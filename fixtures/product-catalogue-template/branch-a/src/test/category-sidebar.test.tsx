import { fireEvent, render, screen } from '@testing-library/react';
import { CatalogueHeader } from '../features/catalogue/CatalogueHeader';
import { CatalogueWorkspace } from '../features/catalogue/CatalogueWorkspace';
import { products } from '../fixtures/products';
test('collapses, expands, and filters categories', () => { render(<CatalogueWorkspace products={products} />); fireEvent.click(screen.getByRole('button', { name: 'Desk' })); expect(screen.getAllByRole('article')).toHaveLength(2); fireEvent.click(screen.getByRole('button', { name: 'Collapse category sidebar' })); expect(screen.getByRole('button', { name: 'Expand category sidebar' })).toBeVisible(); });
test('keeps the unrelated promotion visible only on branch A', () => { render(<CatalogueHeader />); expect(screen.getByText('Workspace essentials, 20% off')).toBeVisible(); });
