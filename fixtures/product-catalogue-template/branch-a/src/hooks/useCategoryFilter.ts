import { useMemo, useState } from 'react';
import type { Product } from '../types/product';
import type { CategoryChoice } from '../types/category';
import {
  categoryId,
  categoryLabel,
  setPreviewCategoryFromUser,
  useCataloguePreviewContext
} from '../state/previewContext';
export function useCategoryFilter(products: Product[]) {
  const preview = useCataloguePreviewContext();
  const category = categoryLabel(preview.catalogue.categoryId) as CategoryChoice;
  const [collapsed, setCollapsed] = useState(false);
  const filteredProducts = useMemo(() => category === 'All' ? products : products.filter(product => product.category === category), [category, products]);
  return {
    category,
    setCategory: (value: CategoryChoice) => setPreviewCategoryFromUser(categoryId(value)),
    collapsed,
    toggleCollapsed: () => setCollapsed(value => !value),
    filteredProducts
  };
}
