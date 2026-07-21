import type { Ticket } from '../../types/ticket';
import { TicketActivityList } from './TicketActivityList';
import { TicketHeader } from './TicketHeader';
export function TicketInspector({ ticket }: { ticket?: Ticket }) { return <aside className="inspector" aria-label="Ticket inspector">{ticket ? <><TicketHeader ticket={ticket} /><TicketActivityList activity={ticket.activity} /></> : <p>Select a ticket to inspect.</p>}</aside>; }

