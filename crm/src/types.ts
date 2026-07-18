export type UserRole = 'admin' | 'customer' | 'agent';
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
export type CallDirection = 'outbound' | 'inbound';
export type CallOutcome = 'answered' | 'no_answer' | 'busy' | 'voicemail' | 'failed';
export type NoteType = 'note' | 'task' | 'meeting' | 'email';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  orders_count: number;
  total_spent_cents: number;
  last_order_at: string | null;
  calls_count: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type PaymentMethod = 'card' | 'cod';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

export interface CustomerOrder {
  id: string;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  ttn: string | null;
}

export interface OrderItem {
  id: string;
  product_id?: string | null;
  title: string;
  price_cents: number;
  quantity: number;
}

export interface CallLog {
  id: string;
  customer_id: string | null;
  agent_id: string | null;
  agent_name?: string | null;
  customer_name?: string | null;
  phone: string;
  direction: CallDirection;
  outcome: CallOutcome;
  duration_seconds: number;
  note: string;
  recording_url: string | null;
  created_at: string;
  external_id: string | null;
  state: CallState;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
}

export type CallState = 'ringing' | 'active' | 'completed';

export type CallSort = 'newest' | 'oldest' | 'outcome' | 'duration';

export interface CustomerNote {
  id: string;
  customer_id: string;
  agent_id: string | null;
  agent_name?: string | null;
  type: NoteType;
  body: string;
  created_at: string;
}

export interface CustomerProfile {
  customer: Customer;
  orders: CustomerOrder[];
  calls: CallLog[];
  notes: CustomerNote[];
}

export interface CrmStats {
  customers: number;
  callsToday: number;
  myCallsToday: number;
  callsByOutcome: Partial<Record<CallOutcome, number>>;
  needsCall: Array<{
    id: string;
    name: string;
    phone: string | null;
    orders_count: number;
    total_spent_cents: number;
  }>;
}
