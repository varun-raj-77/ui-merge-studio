import type { CategoryChoice } from '../../types/category';
import type { Product } from '../../types/product';
import { categorySidebarConfiguration } from '../../config/categorySidebarConfiguration';
import { categoryLabel } from '../../state/previewContext';
import './category-sidebar.css';

interface Props {
  category: CategoryChoice;
  collapsed: boolean;
  onCategoryChange: (category: CategoryChoice) => void;
  onToggle: () => void;
  products: Product[];
}

const categories: CategoryChoice[] = categorySidebarConfiguration.enabledCategoryIds.map(categoryLabel);

export function CategorySidebar({ category, collapsed, onCategoryChange, onToggle, products }: Props) {
  const productCount = (item: CategoryChoice) => item === 'All'
    ? products.length
    : products.filter(product => product.category === item).length;
  return <aside
    className={collapsed ? 'category-sidebar collapsed' : 'category-sidebar'}
    aria-label="Category sidebar"
    data-ums-scope="category-sidebar"
    data-ums-label="Category sidebar"
  >
    <button className="collapse-category" onClick={onToggle} aria-label={collapsed ? 'Expand category sidebar' : 'Collapse category sidebar'}>
      {collapsed ? '\u203a' : '\u2039'}
    </button>
    {!collapsed && <>
      {categorySidebarConfiguration.showHeading && <strong>Categories</strong>}
      <div role="group" aria-label="Product categories">
        {categories.map(item => <button key={item} aria-pressed={item === category} onClick={() => onCategoryChange(item)}>
          <span>{item}</span>
          {categorySidebarConfiguration.showProductCounts && <span className="category-product-count" aria-hidden="true">{productCount(item)}</span>}
        </button>)}
      </div>
    </>}
  </aside>;
}
