import type { Activity } from '../../types/ticket';
export function TicketActivityList({ activity }: { activity: Activity[] }) { return <section><h3>Activity</h3>{activity.length ? <ol className="activity">{activity.map(item => <li key={item.id}><strong>{item.kind}</strong><p>{item.text}</p><time>{new Date(item.at).toLocaleString('en-US', { timeZone: 'UTC' })}</time></li>)}</ol> : <p>No activity yet.</p>}</section>; }

