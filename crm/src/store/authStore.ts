import { createAuthStore } from '@shopcore/shared';
import type { User } from '../types';

/** Стан автентифікації (persist у localStorage). Логіка — у @shopcore/shared. */
export const useAuthStore = createAuthStore<User>('shopcore-crm-auth');
