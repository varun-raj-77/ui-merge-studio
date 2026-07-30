import type { Product } from '../../types/product';
interface Props { product: Product; onQuickView?: (product: Product) => void; }
export function ProductCard({ product, onQuickView }: Props) { return <article className="product-card"><div className={`product-art ${product.category.toLowerCase()}`} aria-hidden="true"><i /></div><div><small>{product.category}</small><h2>{product.name}</h2><strong>${product.price}</strong><p>{product.description}</p>{onQuickView && <button onClick={() => onQuickView(product)}>Quick view</button>}</div></article>; }
