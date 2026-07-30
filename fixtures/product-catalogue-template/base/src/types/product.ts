export type ProductCategory = 'Audio' | 'Desk' | 'Travel';
export interface Product { id: string; name: string; category: ProductCategory; price: number; addedAt: string; description: string; }
