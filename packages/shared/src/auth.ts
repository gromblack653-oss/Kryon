import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthState<User> {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (data: { user: User; accessToken: string; refreshToken: string }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

/**
 * Фабрика стора автентифікації (zustand + persist у localStorage).
 * Кожен застосунок створює свій із власним ключем персисту та типом User.
 */
export function createAuthStore<User>(persistKey: string) {
  return create<AuthState<User>>()(
    persist(
      (set) => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        setAuth: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
        setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
        logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      }),
      { name: persistKey },
    ),
  );
}
