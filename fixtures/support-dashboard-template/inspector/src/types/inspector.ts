import type { Activity } from './ticket';
export type ActivityFilter = 'all' | Activity['kind'];
export interface CopyState { status: 'idle' | 'copied' | 'failed' }

