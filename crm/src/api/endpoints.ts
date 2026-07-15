import { api } from './client';
import type { AuthResponse, CallLog, CallSort, CrmStats, Customer, CustomerProfile, OrderItem, Paged } from '../types';

export const authApi = {
  login: (body: { email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/login', body).then((r) => r.data),
  logout: (refreshToken: string) =>
    api.post('/api/auth/logout', { refreshToken }).then((r) => r.data),
};

export const crmApi = {
  stats: () => api.get<CrmStats>('/api/crm/stats').then((r) => r.data),

  customers: (params: { page?: number; limit?: number; search?: string }) =>
    api.get<Paged<Customer>>('/api/crm/customers', { params }).then((r) => r.data),

  customer: (id: string) =>
    api.get<CustomerProfile>(`/api/crm/customers/${id}`).then((r) => r.data),

  orderItems: (orderId: string) =>
    api.get<OrderItem[]>(`/api/crm/orders/${orderId}/items`).then((r) => r.data),

  updatePhone: (id: string, phone: string | null) =>
    api.patch<Customer>(`/api/crm/customers/${id}/phone`, { phone }).then((r) => r.data),


  addNote: (customerId: string, body: { type: string; body: string }) =>
    api.post(`/api/crm/customers/${customerId}/notes`, body).then((r) => r.data),

  recentCalls: (sort: CallSort = 'newest') =>
    api.get<CallLog[]>('/api/crm/calls', { params: { sort } }).then((r) => r.data),


  uploadRecording: (callId: string, file: File) => {
    const form = new FormData();
    form.append('recording', file);
    return api.post<CallLog>(`/api/crm/calls/${callId}/recording`, form).then((r) => r.data);
  },
};

export const telephonyApi = {
  /** Оператор натиснув «Подзвонити» — дзвінок починає жити на сервері. */
  start: (phone: string, customerId: string | null) =>
    api.post<CallLog>('/api/telephony/calls', { phone, customerId }).then((r) => r.data),
  /** Завершення. З реальною АТС приходить вебхуком і ця ручка не потрібна. */
  hangup: (callId: string, event: 'completed' | 'no_answer' | 'busy') =>
    api.post<CallLog>(`/api/telephony/calls/${callId}/hangup`, { event }).then((r) => r.data),
  saveNote: (callId: string, note: string) =>
    api.patch<CallLog>(`/api/telephony/calls/${callId}/note`, { note }).then((r) => r.data),
};
