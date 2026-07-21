export function isTicketsRoute(pathname: string) { return pathname === '/' || pathname === '/tickets' || /^\/tickets\/[^/]+$/.test(pathname); }

