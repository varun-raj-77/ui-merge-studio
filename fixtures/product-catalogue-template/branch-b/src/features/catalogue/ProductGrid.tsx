import type { Product } from '../../types/product';
import { quickViewTargetIds } from '../../config/quickViewTargets';
import { ProductCard } from './ProductCard';
import { ProductCardWithQuickView } from './ProductCardWithQuickView';
interface Props { products: Product[]; }
const targetIds = new Set<string>(quickViewTargetIds);
export function ProductGrid({ products }: Props) { return <section className="product-grid" aria-label="Products">{products.map(product => targetIds.has(String(product.id)) ? <ProductCardWithQuickView key={product.id} product={product} /> : <ProductCard key={product.id} product={product} />)}</section>; }
