import type { Ticket } from '../types/ticket';
export const tickets: Ticket[] = [
  { id: 'TCK-102', subject: 'Payment gateway timeout', customer: 'Northstar Labs', status: 'open', severity: 'high', createdAt: '2026-01-12T10:00:00Z', activity: [{ id: 'a1', kind: 'email', text: 'Customer reported intermittent timeouts.', at: '2026-01-12T10:05:00Z' }, { id: 'a2', kind: 'note', text: 'Escalated to platform operations.', at: '2026-01-12T10:30:00Z' }] },
  { id: 'TCK-103', subject: 'Seat count mismatch', customer: 'Juniper Works', status: 'pending', severity: 'medium', createdAt: '2026-01-13T09:00:00Z', activity: [{ id: 'a3', kind: 'status', text: 'Awaiting customer invoice.', at: '2026-01-13T09:30:00Z' }] },
  { id: 'TCK-104', subject: 'Export completed', customer: 'Acme Field Co', status: 'resolved', severity: 'low', createdAt: '2026-01-14T08:00:00Z', activity: [] }
];

