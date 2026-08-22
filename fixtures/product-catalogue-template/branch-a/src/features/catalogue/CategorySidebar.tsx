import type { CategoryChoice } from '../../types/category';
import type { Product } from '../../types/product';
import { categorySidebarConfiguration } from '../../config/categorySidebarConfiguration';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { categoryLabel } from '../../state/previewContext';
import './category-sidebar.css';

const categories: CategoryChoice[] = categorySidebarConfiguration.enabledCategoryIds.map(categoryLabel);

export function CategorySidebar({ products }: { products: Product[] }) {
  const filter = useCategoryFilter(products);
  const productCount = (item: CategoryChoice) => item === 'All'
    ? products.length
    : products.filter(product => product.category === item).length;
  return <aside
    className={filter.collapsed ? 'category-sidebar collapsed' : 'category-sidebar'}
    aria-label="Category sidebar"
    data-ums-scope="category-sidebar"
    data-ums-label="Category sidebar"
  >
    <button className="collapse-category" onClick={filter.toggleCollapsed} aria-label={filter.collapsed ? 'Expand category sidebar' : 'Collapse category sidebar'}>
      {filter.collapsed ? '\u203a' : '\u2039'}
    </button>
    {!filter.collapsed && <>
      {categorySidebarConfiguration.showHeading && <strong>Categories</strong>}
      <div role="group" aria-label="Product categories">
        {categories.map(item => <button key={item} aria-pressed={item === filter.category} onClick={() => filter.setCategory(item)}>
          <span>{item}</span>
          {categorySidebarConfiguration.showProductCounts && <span className="category-product-count" aria-hidden="true">{productCount(item)}</span>}
        </button>)}
      </div>
    </>}
  </aside>;
}
