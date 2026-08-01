import { screen } from '@testing-library/react';
import { products } from '../fixtures/products';
import { categoryLabel, getPreviewContext } from '../state/previewContext';
import { renderApp } from './renderApp';
test('renders stable catalogue data for the active default category', () => {
  renderApp();
  expect(screen.getByRole('heading', { name: 'Objects for focused work.' })).toBeVisible();
  const category = categoryLabel(getPreviewContext().catalogue.categoryId);
  const expected = category === 'All' ? products : products.filter(product => product.category === category);
  expect(screen.getAllByRole('article')).toHaveLength(expected.length);
  for (const product of expected) expect(screen.getByText(product.name)).toBeVisible();
});
