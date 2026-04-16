/**
 * Zustand shop store — shop profile data, KYC status, earnings
 * Fetched on app boot from GET /shops/:id
 */

import { create } from 'zustand';
import { ShopProfile, EarningsData } from '@/types/shop';
import logger from '@/utils/logger';

interface ShopState {
  profile: ShopProfile | null;
  earnings: EarningsData | null;
  loading: boolean;
  error: string | null;
}

interface ShopActions {
  setProfile: (profile: ShopProfile) => void;
  setEarnings: (earnings: EarningsData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleOpen: (isOpen: boolean) => void;
  reset: () => void;
}

const initialState: ShopState = {
  profile: null,
  earnings: null,
  loading: false,
  error: null,
};

export const useShopStore = create<ShopState & ShopActions>((set) => ({
  ...initialState,

  setProfile: (profile) => {
    logger.info('Shop profile updated', { shopId: profile.id });
    set({ profile });
  },

  setEarnings: (earnings) => {
    logger.info('Earnings data updated');
    set({ earnings });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    if (error) {
      logger.error('Shop store error', { error });
    }
    set({ error });
  },

  toggleOpen: (isOpen) => {
    set((state) => {
      if (state.profile) {
        return {
          profile: {
            ...state.profile,
            isOpen,
          },
        };
      }
      return state;
    });
  },

  reset: () => {
    logger.info('Shop store reset');
    set(initialState);
  },
}));
