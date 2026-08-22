import type { Product } from '../../types/product';
import { quickViewTargetIds } from '../../config/quickViewTargets';
import { useSelectedProduct } from '../../hooks/useSelectedProduct';
import { ProductQuickView } from './ProductQuickView';
import './quick-view.css';

const targetIds = new Set<string>(quickViewTargetIds);

export function ProductQuickViewShelf({ products }: { products: Product[] }) {
  const selection = useSelectedProduct();
  const targets = products.filter(product => targetIds.has(String(product.id)));
  const selectedProduct = products.find(product => product.id === selection.selectedId) ?? null;
  return <aside className="quick-view-shelf" aria-label="Quick View launchers">
    <strong>Quick View</strong>
    <div className="quick-view-launchers">
      {targets.map(product => <div
        key={product.id}
        data-ums-scope={`product-quick-view:${product.id}`}
        data-ums-label={`Quick View on ${product.name}`}
      >
        <button onClick={() => selection.openProduct(product)} aria-label={`Quick view ${product.name}`}>{product.name}</button>
      </div>)}
    </div>
    <ProductQuickView product={selectedProduct} onClose={selection.closeProduct} />
  </aside>;
}
