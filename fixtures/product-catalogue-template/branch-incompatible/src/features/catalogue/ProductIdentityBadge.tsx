import type { Product } from '../../types/product';
export function ProductIdentityBadge({ product }: { product: Product }) { return <span className="identity-badge" aria-label={`Numeric product identity ${product.id}`}>#{product.id}</span>; }
