import { AppSidebar } from '../navigation/AppSidebar';
import { tickets } from '../../fixtures/tickets';
import { selectTicket, useSelectedTicketId } from '../../hooks/useSelectedTicket';
import { TicketInspector } from './TicketInspector';
import { TicketList } from './TicketList';
export function TicketPage() { const selectedId = useSelectedTicketId(); const selected = tickets.find(ticket => ticket.id === selectedId); return <div className="shell"><AppSidebar /><main><header className="page-header"><p className="eyebrow">Support workspace</p><h1>Support Tickets</h1></header><div className="workspace"><TicketList tickets={tickets} selectedId={selectedId} onSelect={selectTicket} /><TicketInspector ticket={selected} /></div></main></div>; }

