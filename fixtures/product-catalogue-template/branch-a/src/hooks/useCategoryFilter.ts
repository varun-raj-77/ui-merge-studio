import { useEffect, useMemo, useState } from 'react';
import type { Product } from '../types/product';
import type { CategoryChoice } from '../types/category';
import {
  categoryId,
  categoryLabel,
  setPreviewCategoryFromUser,
  useCataloguePreviewContext
} from '../state/previewContext';
import { categorySidebarConfiguration } from '../config/categorySidebarConfiguration';
export function useCategoryFilter(products: Product[]) {
  const preview = useCataloguePreviewContext();
  const activeCategoryId = categorySidebarConfiguration.enabledCategoryIds.includes(
    preview.catalogue.categoryId as typeof categorySidebarConfiguration.enabledCategoryIds[number]
  ) ? preview.catalogue.categoryId : categorySidebarConfiguration.defaultCategoryId;
  const category = categoryLabel(activeCategoryId) as CategoryChoice;
  useEffect(() => {
    if (activeCategoryId !== preview.catalogue.categoryId) {
      setPreviewCategoryFromUser(activeCategoryId);
    }
  }, [activeCategoryId, preview.catalogue.categoryId]);
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
