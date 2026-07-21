import type { Ticket } from '../../types/ticket';
export function TicketHeader({ ticket }: { ticket: Ticket }) { return <header><div className="eyebrow">{ticket.id}</div><h2>{ticket.subject}</h2><p>{ticket.customer} · <span className="pill">{ticket.severity}</span></p></header>; }

