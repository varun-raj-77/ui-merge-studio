import { products } from '../../fixtures/products';
import { inventorySummary } from '../../utils/inventorySummary';
export function CatalogueHeader() { return <header className="catalogue-header"><div><p className="eyebrow">Product Catalogue</p><h1>Objects for focused work.</h1></div><span>{inventorySummary(products)}</span></header>; }
