import { useState } from 'react';
import type { Product } from '../types/product';
export function useSelectedProduct() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return { selectedId, openProduct: (product: Product) => setSelectedId(product.id), closeProduct: () => setSelectedId(null) };
}
