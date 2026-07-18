import { createApiClient } from '@shopcore/shared';
import { useAuthStore } from '../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || '';

export const api = createApiClient(baseURL, {
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (a, r) => useAuthStore.getState().setTokens(a, r),
  logout: () => useAuthStore.getState().logout(),
});

export { apiError } from '@shopcore/shared';
