import type { Ticket } from '../../types/ticket';
import { sortTicketsNewestFirst } from '../../utils/sortTickets';
import { TicketListItem } from './TicketListItem';
interface Props { tickets: Ticket[]; selectedId: string | null; onSelect(id: string): void }
export function TicketList({ tickets, selectedId, onSelect }: Props) { return <section className="ticket-list" aria-label="Tickets"><ul>{sortTicketsNewestFirst(tickets).map(ticket => <TicketListItem key={ticket.id} ticket={ticket} selected={ticket.id === selectedId} onSelect={() => onSelect(ticket.id)} />)}</ul></section>; }

