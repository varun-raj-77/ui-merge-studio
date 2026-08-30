import { products } from '../../fixtures/products';
import { inventorySummary } from '../../utils/inventorySummary';
export function CatalogueHeader() { return <header className="catalogue-header"><div><p className="eyebrow">Form & Field · Catalogue 06</p><h1>Objects for focused work.</h1></div><span>{inventorySummary(products)}</span></header>; }
