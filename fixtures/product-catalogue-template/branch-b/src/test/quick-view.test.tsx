import { fireEvent, render, screen } from '@testing-library/react';
import { CatalogueHeader } from '../features/catalogue/CatalogueHeader';
import { ProductCardWithQuickView } from '../features/catalogue/ProductCardWithQuickView';
import { products } from '../fixtures/products';
test('opens, focuses, and closes quick view', () => { render(<ProductCardWithQuickView product={products[0]} />); fireEvent.click(screen.getByRole('button', { name: 'Quick view' })); expect(screen.getByRole('dialog')).toBeVisible(); expect(screen.getByRole('button', { name: 'Close quick view' })).toHaveFocus(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); });
test('keeps the inventory summary as a separate branch change', () => { render(<CatalogueHeader />); expect(screen.getByText('5 products ready')).toBeVisible(); });
