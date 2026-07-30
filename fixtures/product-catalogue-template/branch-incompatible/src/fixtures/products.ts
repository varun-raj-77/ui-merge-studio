import type { Product } from '../types/product';
export const products: Product[] = [
  { id: 101, name: 'Arc Headphones', category: 'Audio', price: 249, addedAt: '2026-04-02', description: 'Wireless headphones tuned for focused work.' },
  { id: 102, name: 'Studio Speaker', category: 'Audio', price: 189, addedAt: '2026-06-18', description: 'A compact speaker with balanced near-field sound.' },
  { id: 103, name: 'Task Lamp', category: 'Desk', price: 96, addedAt: '2026-05-10', description: 'Warm, adjustable light for long sessions.' },
  { id: 104, name: 'Carry Case', category: 'Travel', price: 72, addedAt: '2026-07-01', description: 'Protective storage for daily tools.' },
  { id: 105, name: 'Desk Stand', category: 'Desk', price: 118, addedAt: '2026-05-28', description: 'An aluminium stand for a calmer workspace.' }
];
