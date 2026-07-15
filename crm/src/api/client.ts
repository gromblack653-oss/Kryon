import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) throw new Error('No refresh token');
  try {
    const { data } = await axios.post(`${baseURL}/api/auth/refresh`, { refreshToken });
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch (err) {
    logout();
    throw err;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const isAuthCall = original?.url?.includes('/api/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing = refreshing ?? refreshAccessToken();
        const newToken = await refreshing;
        refreshing = null;
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return api(original);
      } catch (e) {
        refreshing = null;
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) return err.response?.data?.error?.message ?? err.message;
  return 'Невідома помилка';
}
