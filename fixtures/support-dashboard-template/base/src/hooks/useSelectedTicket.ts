import { useEffect, useState } from 'react';
import { selectedTicketId } from '../state/ticketSelection';
export function useSelectedTicketId() { const [id, setId] = useState(() => selectedTicketId(window.location)); useEffect(() => { const sync = () => setId(selectedTicketId(window.location)); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync); }, []); return id; }
export function selectTicket(id: string) { const url = new URL(window.location.href); url.pathname = '/tickets'; url.searchParams.set('ticket', id); history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate')); }

