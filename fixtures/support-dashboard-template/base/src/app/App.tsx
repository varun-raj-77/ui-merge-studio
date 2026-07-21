import { TicketPage } from '../features/tickets/TicketPage';
import { isTicketsRoute } from './routes';
export function App() { return isTicketsRoute(window.location.pathname) ? <TicketPage /> : <main><h1>Not found</h1></main>; }

