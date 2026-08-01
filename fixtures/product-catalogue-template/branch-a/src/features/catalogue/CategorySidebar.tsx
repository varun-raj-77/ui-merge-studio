import type { CategoryChoice } from '../../types/category';
import { categorySidebarConfiguration } from '../../config/categorySidebarConfiguration';
import { categoryLabel } from '../../state/previewContext';
import './category-sidebar.css';

interface Props {
  category: CategoryChoice;
  collapsed: boolean;
  onCategoryChange: (category: CategoryChoice) => void;
  onToggle: () => void;
}

const categories: CategoryChoice[] = categorySidebarConfiguration.enabledCategoryIds.map(categoryLabel);

export function CategorySidebar({ category, collapsed, onCategoryChange, onToggle }: Props) {
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
      <strong>Categories</strong>
      <div role="group" aria-label="Product categories">
        {categories.map(item => <button key={item} aria-pressed={item === category} onClick={() => onCategoryChange(item)}>{item}</button>)}
      </div>
    </>}
  </aside>;
}
