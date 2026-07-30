import type { CategoryChoice } from '../../types/category';
import './category-sidebar.css';
interface Props { category: CategoryChoice; collapsed: boolean; onCategoryChange: (category: CategoryChoice) => void; onToggle: () => void; }
const categories: CategoryChoice[] = ['All', 'Audio', 'Desk', 'Travel'];
export function CategorySidebar({ category, collapsed, onCategoryChange, onToggle }: Props) {
  return <aside className={collapsed ? 'category-sidebar collapsed' : 'category-sidebar'} aria-label="Category sidebar"><button className="collapse-category" onClick={onToggle} aria-label={collapsed ? 'Expand category sidebar' : 'Collapse category sidebar'}>{collapsed ? '›' : '‹'}</button>{!collapsed && <><strong>Categories</strong><div role="group" aria-label="Product categories">{categories.map(item => <button key={item} aria-pressed={item === category} onClick={() => onCategoryChange(item)}>{item}</button>)}</div></>}</aside>;
}
