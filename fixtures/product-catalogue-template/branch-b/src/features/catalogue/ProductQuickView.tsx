import { useEffect, useRef } from 'react';
import type { Product } from '../../types/product';
import './quick-view.css';
interface Props { product: Product | null; onClose: () => void; }
export function ProductQuickView({ product, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (product) closeRef.current?.focus(); }, [product]);
  if (!product) return null;
  return <aside className="quick-view" role="dialog" aria-modal="true" aria-label={`${product.name} quick view`} onKeyDown={event => { if (event.key === 'Escape') onClose(); }}><button ref={closeRef} onClick={onClose} aria-label="Close quick view">×</button><small>{product.category}</small><h2>{product.name}</h2><strong>${product.price}</strong><p>{product.description}</p><code>{product.id}</code></aside>;
}
