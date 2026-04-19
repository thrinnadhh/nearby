/**
 * Auth store — manages authentication state and JWT token
 * Persisted to expo-secure-store
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import logger from '@/utils/logger';
import { AuthState } from '@/types/auth';

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

interface AuthActions {
  login: (payload: {
    userId: string;
    partnerId?: string;
    phone: string;
    token: string;
  }) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

const initialState: Omit<AuthState, '_hasHydrated'> = {
  isAuthenticated: false,
  userId: null,
  partnerId: null,
  phone: null,
  token: null,
  role: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,
      _hasHydrated: false,

      login: (payload) => {
        logger.info('User logged in', {
          userId: payload.userId,
          phone: payload.phone.slice(-4),
        });
        set({
          isAuthenticated: true,
          userId: payload.userId,
          partnerId: payload.partnerId || null,
          phone: payload.phone,
          token: payload.token,
          role: 'delivery',
        });
      },

      logout: () => {
        logger.info('User logged out');
        set({
          isAuthenticated: false,
          userId: null,
          partnerId: null,
          phone: null,
          token: null,
          role: null,
        });
      },

      setHasHydrated: (value) => {
        set({ _hasHydrated: value });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        partnerId: state.partnerId,
        phone: state.phone,
        token: state.token,
        role: state.role,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
