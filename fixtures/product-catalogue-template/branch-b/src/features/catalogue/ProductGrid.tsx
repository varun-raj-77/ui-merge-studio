import type { Product } from '../../types/product';
import { ProductCardWithQuickView } from './ProductCardWithQuickView';
interface Props { products: Product[]; }
export function ProductGrid({ products }: Props) { return <section className="product-grid" aria-label="Products">{products.map(product => <ProductCardWithQuickView key={product.id} product={product} />)}</section>; }
