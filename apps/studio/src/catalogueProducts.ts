export const catalogueProducts = [
  { id: 'p-101', name: 'Arc Headphones', category: 'Audio', price: '$249', tone: 'coral', description: 'Wireless headphones tuned for focused work.' },
  { id: 'p-102', name: 'Studio Speaker', category: 'Audio', price: '$189', tone: 'violet', description: 'A compact speaker with balanced near-field sound.' },
  { id: 'p-103', name: 'Task Lamp', category: 'Desk', price: '$96', tone: 'lime', description: 'Warm, adjustable light for long sessions.' },
  { id: 'p-104', name: 'Carry Case', category: 'Travel', price: '$72', tone: 'blue', description: 'Protective storage for daily tools.' },
  { id: 'p-105', name: 'Desk Stand', category: 'Desk', price: '$118', tone: 'sand', description: 'An aluminium stand for a calmer workspace.' }
] as const;

export type CatalogueProductId = typeof catalogueProducts[number]['id'];

export function catalogueProduct(id: string) {
  return catalogueProducts.find(product => product.id === id);
}
