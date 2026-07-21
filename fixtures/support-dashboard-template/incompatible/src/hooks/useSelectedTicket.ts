import { useEffect, useState } from 'react';
import { selectedTicketId, ticketPath } from '../state/ticketSelection';
export function useSelectedTicketId() { const [id, setId] = useState(() => selectedTicketId(window.location)); useEffect(() => { const sync = () => setId(selectedTicketId(window.location)); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, []); return id; }
export function selectTicket(id: string) { history.pushState({}, '', ticketPath(id)); window.dispatchEvent(new PopStateEvent('popstate')); }

