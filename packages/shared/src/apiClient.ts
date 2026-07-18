import axios, { AxiosError, AxiosRequestConfig } from 'axios';

/** Доступ до токенів застосунку — щоб клієнт не залежав від конкретного стора. */
export interface AuthAdapter {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

/**
 * Axios-клієнт зі спільною логікою: додає Bearer-токен і автоматично оновлює
 * access при 401 (один спільний refresh на паралельні запити).
 */
export function createApiClient(baseURL: string, auth: AuthAdapter) {
  const api = axios.create({ baseURL });

  api.interceptors.request.use((config) => {
    const token = auth.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  let refreshing: Promise<string> | null = null;

  async function refreshAccessToken(): Promise<string> {
    const refreshToken = auth.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    try {
      const { data } = await axios.post(`${baseURL}/api/auth/refresh`, { refreshToken });
      auth.setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch (err) {
      auth.logout();
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

  return api;
}

/** Витягує людяне повідомлення з помилки axios. */
export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) return err.response?.data?.error?.message ?? err.message;
  return 'Невідома помилка';
}
