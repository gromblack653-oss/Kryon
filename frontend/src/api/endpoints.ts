import { api } from './client';
import type {
  AuthResponse,
  Cart,
  Category,
  Facet,
  Order,
  OrderDetail,
  Paged,
  Product,
  ProductType,
  ReviewsResponse,
  WishlistItem,
  BuildSlot,
  BuildPart,
  BuildReport,
  PartType,
  CheckoutInput,
  NpCity,
  NpWarehouse,
  PaymentSession,
  PaymentState,
} from '../types';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  attrs?: string;
  sort?: 'newest' | 'rating' | 'price_asc' | 'price_desc' | 'title';
}

export function encodeAttrs(selected: Record<string, string[]>): string | undefined {
  const parts = Object.entries(selected)
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `${k}:${v.join(',')}`);
  return parts.length ? parts.join(';') : undefined;
}

export const authApi = {
  register: (body: { email: string; password: string; name: string }) =>
    api.post<AuthResponse>('/api/auth/register', body).then((r) => r.data),
  login: (body: { email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/login', body).then((r) => r.data),
  logout: (refreshToken: string) => api.post('/api/auth/logout', { refreshToken }).then((r) => r.data),
};

export const productsApi = {
  list: (filters: ProductFilters) =>
    api.get<Paged<Product>>('/api/products', { params: filters }).then((r) => r.data),
  types: () => api.get<ProductType[]>('/api/products/types').then((r) => r.data),
  facets: (filters: Omit<ProductFilters, 'page' | 'limit' | 'sort' | 'attrs'>) =>
    api.get<Facet[]>('/api/products/facets', { params: filters }).then((r) => r.data),
  compare: (ids: string[]) =>
    api.get<Product[]>('/api/products/compare', { params: { ids: ids.join(',') } }).then((r) => r.data),
  get: (id: string) => api.get<Product>(`/api/products/${id}`).then((r) => r.data),
  create: (body: Partial<Product> & { price: number }) =>
    api.post<Product>('/api/products', body).then((r) => r.data),
  update: (id: string, body: Record<string, unknown>) =>
    api.patch<Product>(`/api/products/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/products/${id}`).then((r) => r.data),
  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post<Product>(`/api/products/${id}/image`, form).then((r) => r.data);
  },
};

export const categoriesApi = {
  list: (type?: string) =>
    api.get<Category[]>('/api/categories', { params: type ? { type } : {} }).then((r) => r.data),
};

export const reviewsApi = {
  list: (productId: string) =>
    api.get<ReviewsResponse>(`/api/products/${productId}/reviews`).then((r) => r.data),
  submit: (productId: string, body: { rating: number; body: string }) =>
    api.post(`/api/products/${productId}/reviews`, body).then((r) => r.data),
  remove: (productId: string) => api.delete(`/api/products/${productId}/reviews`).then((r) => r.data),
};

export const wishlistApi = {
  list: () => api.get<{ items: WishlistItem[]; ids: string[] }>('/api/wishlist').then((r) => r.data),
  add: (productId: string) => api.post(`/api/wishlist/${productId}`).then((r) => r.data),
  remove: (productId: string) => api.delete(`/api/wishlist/${productId}`).then((r) => r.data),
};

export const cartApi = {
  get: () => api.get<Cart>('/api/cart').then((r) => r.data),
  addItem: (productId: string, quantity = 1) =>
    api.post<Cart>('/api/cart/items', { productId, quantity }).then((r) => r.data),
  setQty: (productId: string, quantity: number) =>
    api.patch<Cart>(`/api/cart/items/${productId}`, { quantity }).then((r) => r.data),
  removeItem: (productId: string) => api.delete<Cart>(`/api/cart/items/${productId}`).then((r) => r.data),
};

export const ordersApi = {
  list: (page = 1) =>
    api
      .get<{ items: Order[]; total: number; page: number; limit: number }>('/api/orders', {
        params: { page },
      })
      .then((r) => r.data),
  get: (id: string) => api.get<OrderDetail>(`/api/orders/${id}`).then((r) => r.data),
  checkout: (input: CheckoutInput) => api.post<Order>('/api/orders', input).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch<Order>(`/api/orders/${id}/status`, { status }).then((r) => r.data),
};

export const builderApi = {
  parts: () =>
    api
      .get<{ slots: BuildSlot[]; parts: Record<string, BuildPart[]> }>('/api/builder/parts')
      .then((r) => r.data),
  check: (selection: Partial<Record<PartType, string>>) =>
    api.post<BuildReport>('/api/builder/check', selection).then((r) => r.data),
};

export const deliveryApi = {
  cities: (q: string) =>
    api
      .get<{ items: NpCity[]; live: boolean }>('/api/delivery/cities', { params: { q } })
      .then((r) => r.data),
  warehouses: (cityRef: string, q = '') =>
    api
      .get<{ items: NpWarehouse[] }>('/api/delivery/warehouses', { params: { cityRef, q } })
      .then((r) => r.data.items),
};

export const paymentsApi = {
  createSession: (orderId: string) =>
    api.post<PaymentSession>(`/api/payments/orders/${orderId}/session`).then((r) => r.data),
  get: (externalId: string) => api.get<PaymentState>(`/api/payments/${externalId}`).then((r) => r.data),
  complete: (externalId: string, outcome: 'paid' | 'failed') =>
    api.post(`/api/payments/mock/${externalId}/complete`, { outcome }).then((r) => r.data),
};
