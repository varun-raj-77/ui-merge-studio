import type { Product } from '../../types/product';
import { ProductCard } from './ProductCard';
import { ProductQuickViewShelf } from './ProductQuickViewShelf';
interface Props { products: Product[]; onQuickView?: (product: Product) => void; }
export function ProductGrid({ products, onQuickView }: Props) { return <section className="product-grid" aria-label="Products"><ProductQuickViewShelf products={products} />{products.map(product => <ProductCard key={product.id} product={product} onQuickView={onQuickView} />)}</section>; }
