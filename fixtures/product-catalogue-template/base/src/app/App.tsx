import { CatalogueHeader } from '../features/catalogue/CatalogueHeader';
import { CatalogueWorkspace } from '../features/catalogue/CatalogueWorkspace';
import { products } from '../fixtures/products';
export function App() { return <main className="catalogue-shell" aria-label="Product Catalogue"><CatalogueHeader /><CatalogueWorkspace products={products} /></main>; }
