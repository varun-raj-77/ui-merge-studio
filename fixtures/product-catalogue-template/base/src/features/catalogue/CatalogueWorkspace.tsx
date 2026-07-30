import type { Product } from '../../types/product';
import {
  categoryLabel,
  setPreviewCategoryFromUser,
  useCataloguePreviewContext,
  type CatalogueCategoryId
} from '../../state/previewContext';
import { ProductGrid } from './ProductGrid';

export function CatalogueWorkspace({ products }: { products: Product[] }) {
  const preview = useCataloguePreviewContext();
  const selectedCategory = categoryLabel(preview.catalogue.categoryId);
  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(product => product.category === selectedCategory);
  return <div className="catalogue-context-workspace">
    <label className="catalogue-context-control">
      <span>Browse category</span>
      <select
        aria-label="Browse category"
        value={preview.catalogue.categoryId}
        onChange={event => setPreviewCategoryFromUser(event.target.value as CatalogueCategoryId)}
      >
        <option value="all">All</option>
        <option value="audio">Audio</option>
        <option value="desk">Desk</option>
        <option value="travel">Travel</option>
      </select>
    </label>
    <p className="result-count">{filteredProducts.length} products</p>
    <ProductGrid products={filteredProducts} />
  </div>;
}
