import type { Ticket } from '../../types/ticket';
interface Props { ticket: Ticket; selected: boolean; onSelect(): void }
export function TicketListItem({ ticket, selected, onSelect }: Props) { return <li><button className={selected ? 'ticket-row selected' : 'ticket-row'} aria-pressed={selected} onClick={onSelect}><strong>{ticket.id}</strong><span>{ticket.subject}</span><small>{ticket.customer} · {ticket.status}</small></button></li>; }

