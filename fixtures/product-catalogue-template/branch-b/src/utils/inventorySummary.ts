import type { Product } from '../types/product';
export function inventorySummary(products: Product[]) { return `${products.length} products ready`; }
