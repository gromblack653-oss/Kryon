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

export interface ProductAttribute {
  key: string;
  label: string;
  unit: string | null;
  data_type: 'text' | 'number' | 'enum' | 'bool';
  value: string;
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
  type_key?: string | null;
  type_name?: string | null;
  rating_avg?: number | null;
  rating_count?: number;
  specs?: ProductSpec[];
  attributes?: ProductAttribute[];
  images?: ProductImage[];
}

export interface ProductSpec {
  key: string;
  label: string;
  unit: string | null;
  value: string;
}

export interface ProductType {
  key: string;
  name: string;
  icon: string | null;
  count: number;
}

export interface Facet {
  key: string;
  label: string;
  unit: string | null;
  data_type: string;
  options: Array<{ value: string; count: number }>;
}

export interface ProductImage {
  id: string;
  url: string;
  position: number;
}

export interface Review {
  id: string;
  user_id: string;
  author_name: string;
  rating: number;
  body: string;
  verified: boolean;
  created_at: string;
}

export interface ReviewsResponse {
  items: Review[];
  count: number;
  average: number;
  distribution: Record<string, number>;
}

export interface WishlistItem {
  id: string;
  title: string;
  slug: string;
  price_cents: number;
  stock: number;
  image_url: string | null;
  category_name: string | null;
  added_at: string;
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

export interface CartItem {
  id: string;
  product_id: string;
  title: string;
  slug: string;
  price_cents: number;
  quantity: number;
  stock: number;
  image_url: string | null;
  line_total_cents: number;
}

export interface Cart {
  items: CartItem[];
  total_cents: number;
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

export interface NpCity {
  ref: string;
  name: string;
  area: string;
}

export interface NpWarehouse {
  ref: string;
  cityRef: string;
  number: number;
  name: string;
  address: string;
  maxWeightKg: number;
}

export interface CheckoutInput {
  shippingAddress: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  recipientName?: string;
  recipientPhone?: string;
  npCityRef?: string;
  npWarehouseRef?: string;
}

export interface PaymentSession {
  paymentId: string;
  externalId: string;
  redirectUrl: string;
  amountCents: number;
}

export interface PaymentState {
  externalId: string;
  orderId: string;
  amountCents: number;
  status: PaymentStatus;
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

// ===== PC Builder =====
export type PartType = 'cpu' | 'mobo' | 'ram' | 'gpu' | 'psu' | 'case';

export interface BuildSlot {
  type: PartType;
  label: string;
  required: boolean;
}

export interface BuildPart {
  id: string;
  title: string;
  slug: string;
  type: PartType;
  price_cents: number;
  stock: number;
  image_url: string | null;
  attrs: Record<string, string>;
}

export interface BuildIssue {
  level: 'error' | 'warning';
  parts: PartType[];
  message: string;
}

export interface BuildReport {
  issues: BuildIssue[];
  estimatedWatts: number;
  recommendedPsuWatts: number;
  totalCents: number;
  hasErrors: boolean;
}
