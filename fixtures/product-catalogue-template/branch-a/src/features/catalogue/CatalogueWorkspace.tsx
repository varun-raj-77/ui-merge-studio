import type { Product } from '../../types/product';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { CategorySidebar } from './CategorySidebar';
import { ProductGrid } from './ProductGrid';

export function CatalogueWorkspace({ products }: { products: Product[] }) {
  const filter = useCategoryFilter(products);
  return <div className={filter.collapsed ? 'catalogue-layout collapsed' : 'catalogue-layout'}><CategorySidebar category={filter.category} collapsed={filter.collapsed} onCategoryChange={filter.setCategory} onToggle={filter.toggleCollapsed} /><div><p className="result-count">{filter.filteredProducts.length} products</p><ProductGrid products={filter.filteredProducts} /></div></div>;
}
