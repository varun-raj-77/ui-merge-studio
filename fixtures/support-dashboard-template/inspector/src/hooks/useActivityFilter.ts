import { useState } from 'react';
import type { Activity } from '../types/ticket';
import type { ActivityFilter } from '../types/inspector';
export function useActivityFilter(activity: Activity[]) { const [filter, setFilter] = useState<ActivityFilter>('all'); return { filter, setFilter, filtered: filter === 'all' ? activity : activity.filter(item => item.kind === filter) }; }

