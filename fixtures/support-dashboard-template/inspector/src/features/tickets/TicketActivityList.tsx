import { useActivityFilter } from '../../hooks/useActivityFilter';
import type { Activity } from '../../types/ticket';
import { ActivityFilters } from './ActivityFilters';
export function TicketActivityList({ activity }: { activity: Activity[] }) { const { filter, setFilter, filtered } = useActivityFilter(activity); return <section><h3>Activity</h3><ActivityFilters value={filter} onChange={setFilter} />{filtered.length ? <ol className="activity">{filtered.map(item => <li key={item.id}><strong>{item.kind}</strong><p>{item.text}</p><time>{new Date(item.at).toLocaleString('en-US', { timeZone: 'UTC' })}</time></li>)}</ol> : <p className="empty-state">No {filter === 'all' ? '' : `${filter} `}activity found.</p>}</section>; }

