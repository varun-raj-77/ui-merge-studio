import type { Product } from '../../types/product';
import { ProductGrid } from './ProductGrid';

export function CatalogueWorkspace({ products }: { products: Product[] }) {
  return <ProductGrid products={products} />;
}
