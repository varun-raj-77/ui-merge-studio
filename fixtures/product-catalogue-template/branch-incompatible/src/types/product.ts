export type ProductCategory = 'Audio' | 'Desk' | 'Travel';
export interface Product { id: number; name: string; category: ProductCategory; price: number; addedAt: string; description: string; }
