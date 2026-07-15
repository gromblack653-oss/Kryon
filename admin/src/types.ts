export type UserRole = 'admin' | 'customer';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price_cents: number;
  stock: number;
  image_url: string | null;
  category_id: string | null;
  category_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export type DeliveryMethod = 'np_warehouse' | 'np_courier' | 'pickup';
export type PaymentMethod = 'card' | 'cod';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_cents: number;
  shipping_address: string;
  delivery_method: DeliveryMethod;
  np_city_name: string | null;
  np_warehouse_name: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  ttn: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  title: string;
  price_cents: number;
  quantity: number;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
}

export interface Stats {
  products: { total: number; active: number; out_of_stock: number; low_stock: number };
  customers: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  revenueCents: number;
  paidOrders: number;
  recentOrders: Array<{
    id: string;
    status: OrderStatus;
    total_cents: number;
    created_at: string;
    customer_name: string;
    payment_method: PaymentMethod;
  }>;
  topProducts: Array<{ id: string; title: string; sold: number }>;
  revenueByDay: Array<{ day: string; cents: number }>;
  lowStock: Array<{ id: string; title: string; stock: number; image_url: string | null }>;
}
