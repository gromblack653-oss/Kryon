import { createAuthStore } from '@shopcore/shared';
import type { User } from '../types';

export const useAuthStore = createAuthStore<User>('shopcore-auth');
