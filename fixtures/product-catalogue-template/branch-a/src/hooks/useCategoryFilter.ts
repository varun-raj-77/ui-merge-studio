import { useMemo, useState } from 'react';
import type { Product } from '../types/product';
import type { CategoryChoice } from '../types/category';
export function useCategoryFilter(products: Product[]) {
  const [category, setCategory] = useState<CategoryChoice>('All');
  const [collapsed, setCollapsed] = useState(false);
  const filteredProducts = useMemo(() => category === 'All' ? products : products.filter(product => product.category === category), [category, products]);
  return { category, setCategory, collapsed, toggleCollapsed: () => setCollapsed(value => !value), filteredProducts };
}
