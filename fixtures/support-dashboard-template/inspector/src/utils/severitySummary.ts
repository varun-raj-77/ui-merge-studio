import type { Ticket } from '../types/ticket';
export function severitySummary(ticket: Ticket) { return `${ticket.severity.toUpperCase()} severity · ${ticket.status}`; }

