export const ticketQueryKey = 'ticket';
export function selectedTicketId(location: Pick<Location, 'search'>): string | null { return new URLSearchParams(location.search).get(ticketQueryKey); }

