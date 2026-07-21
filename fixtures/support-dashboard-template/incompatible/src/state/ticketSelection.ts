export function ticketPath(id: string) { return `/tickets/${encodeURIComponent(id)}`; }
export function selectedTicketId(location: Pick<Location, 'pathname'>): string | null { const match = location.pathname.match(/^\/tickets\/([^/]+)$/); return match ? decodeURIComponent(match[1]) : null; }

