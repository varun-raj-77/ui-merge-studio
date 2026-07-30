import type { Product } from '../../types/product';
import { useSelectedProduct } from '../../hooks/useSelectedProduct';
import { ProductCard } from './ProductCard';
import { ProductQuickView } from './ProductQuickView';

export function ProductCardWithQuickView({ product }: { product: Product }) {
  const selection = useSelectedProduct();
  return <div className="quick-view-scope" data-ums-scope={`product-quick-view:${product.id}`} data-ums-label={`Quick View on ${product.name}`}><ProductCard product={product} onQuickView={() => selection.openProduct(product)} /><ProductQuickView product={selection.selectedId === product.id ? product : null} onClose={selection.closeProduct} /></div>;
}
