import type { ProductCategory } from './product';
export type CategoryChoice = 'All' | ProductCategory;
export interface CategorySidebarState { category: CategoryChoice; collapsed: boolean; }
