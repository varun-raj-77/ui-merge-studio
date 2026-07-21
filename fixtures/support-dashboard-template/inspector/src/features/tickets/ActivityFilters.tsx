import type { ActivityFilter } from '../../types/inspector';
const filters: ActivityFilter[] = ['all', 'note', 'status', 'email'];
export function ActivityFilters({ value, onChange }: { value: ActivityFilter; onChange(value: ActivityFilter): void }) { return <div className="filters" aria-label="Activity filters">{filters.map(filter => <button key={filter} aria-pressed={value === filter} onClick={() => onChange(filter)}>{filter}</button>)}</div>; }

