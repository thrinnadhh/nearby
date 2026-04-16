/**
 * Zustand auth store — JWT, userId, shopId, and authentication state
 * Persisted to expo-secure-store (never AsyncStorage)
 * Handles hydration check to coordinate with root splash screen
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import logger from '@/utils/logger';

/**
 * Secure storage adapter for Zustand — wraps expo-secure-store
 */
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  userId: string | null;
  shopId: string | null;
  phone: string | null;
  token: string | null;
  role: 'shop_owner' | null;

  // Hydration flag — prevents rendering before persisted state is restored
  _hasHydrated: boolean;
}

interface AuthActions {
  login: (payload: {
    userId: string;
    shopId: string;
    phone: string;
    token: string;
  }) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

const initialState: Omit<AuthState, '_hasHydrated'> = {
  isAuthenticated: false,
  userId: null,
  shopId: null,
  phone: null,
  token: null,
  role: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,
      _hasHydrated: false,

      login: ({ userId, shopId, phone, token }) => {
        logger.info('Auth store login', { userId, shopId });
        set({
          isAuthenticated: true,
          userId,
          shopId,
          phone,
          token,
          role: 'shop_owner',
        });
      },

      logout: () => {
        logger.info('Auth store logout');
        set({
          ...initialState,
        });
      },

      setHasHydrated: (value) => {
        set({ _hasHydrated: value });
      },
    }),
    {
      name: 'nearby-shop-auth',
      storage: createJSONStorage(() => secureStorage),
      // Only persist auth fields — never persist transient flags like _hasHydrated
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        shopId: state.shopId,
        phone: state.phone,
        token: state.token,
        role: state.role,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (state?.isAuthenticated) {
          logger.info('Auth store hydrated with existing session');
        } else {
          logger.info('Auth store hydrated with no session');
        }
      },
    }
  )
);
