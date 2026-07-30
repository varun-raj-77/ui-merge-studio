export const catalogueProducts = [
  { id: 'p-101', name: 'Arc Headphones', category: 'Audio', price: '$249', tone: 'coral' },
  { id: 'p-102', name: 'Studio Speaker', category: 'Audio', price: '$189', tone: 'violet' },
  { id: 'p-103', name: 'Task Lamp', category: 'Desk', price: '$96', tone: 'lime' },
  { id: 'p-104', name: 'Carry Case', category: 'Travel', price: '$72', tone: 'blue' },
  { id: 'p-105', name: 'Desk Stand', category: 'Desk', price: '$118', tone: 'sand' }
] as const;

export type CatalogueProductId = typeof catalogueProducts[number]['id'];

export function catalogueProduct(id: string) {
  return catalogueProducts.find(product => product.id === id);
}
