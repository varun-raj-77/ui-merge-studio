export type TicketStatus = 'open' | 'pending' | 'resolved';
export interface Activity { id: string; kind: 'note' | 'status' | 'email'; text: string; at: string }
export interface Ticket { id: string; subject: string; customer: string; status: TicketStatus; severity: 'low' | 'medium' | 'high'; createdAt: string; activity: Activity[] }

