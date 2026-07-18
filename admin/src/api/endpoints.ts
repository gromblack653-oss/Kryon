import { api } from './client';
import type { AuthResponse, Category, Order, OrderDetail, Paged, Product, Stats } from '../types';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'title';
}

export const authApi = {
  login: (body: { email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/login', body).then((r) => r.data),
  logout: (refreshToken: string) => api.post('/api/auth/logout', { refreshToken }).then((r) => r.data),
};

export const statsApi = {
  get: () => api.get<Stats>('/api/admin/stats').then((r) => r.data),
};

export const productsApi = {
  list: (q: ProductQuery) => api.get<Paged<Product>>('/api/products', { params: q }).then((r) => r.data),
  create: (body: Record<string, unknown>) => api.post<Product>('/api/products', body).then((r) => r.data),
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
  list: () => api.get<Category[]>('/api/categories').then((r) => r.data),
  create: (body: { name: string; slug: string }) =>
    api.post<Category>('/api/categories', body).then((r) => r.data),
};

export const ordersApi = {
  list: (page = 1, limit = 20) =>
    api
      .get<{ items: Order[]; total: number; page: number; limit: number }>('/api/orders', {
        params: { page, limit },
      })
      .then((r) => r.data),
  get: (id: string) => api.get<OrderDetail>(`/api/orders/${id}`).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch<Order>(`/api/orders/${id}/status`, { status }).then((r) => r.data),
};
