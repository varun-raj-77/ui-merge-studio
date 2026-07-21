import type { Ticket } from '../types/ticket';
export function sortTicketsNewestFirst(tickets: Ticket[]) { return [...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }

