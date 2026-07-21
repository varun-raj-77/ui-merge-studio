import { useCopyReference } from '../../hooks/useCopyReference';
import type { Ticket } from '../../types/ticket';
import { severitySummary } from '../../utils/severitySummary';
export function TicketHeader({ ticket }: { ticket: Ticket }) { const { copy, status } = useCopyReference(ticket.id); return <header><div className="header-actions"><div className="eyebrow">{ticket.id}</div><button onClick={copy}>Copy reference</button></div><div role="status">{status === 'copied' ? 'Copied!' : status === 'failed' ? 'Copy failed. Select the reference manually.' : ''}</div><h2>{ticket.subject}</h2><p>{ticket.customer}</p><p className={`severity ${ticket.severity}`}>{severitySummary(ticket)}</p></header>; }

