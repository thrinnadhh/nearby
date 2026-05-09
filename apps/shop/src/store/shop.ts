/**
 * Zustand shop store — shop profile data, KYC status, earnings, holiday mode
 * Fetched on app boot from GET /shops/:id
 */

import { create } from 'zustand';
import { ShopProfile, EarningsData } from '@/types/shop';
import logger from '@/utils/logger';

export interface HolidayMode {
  isOnHoliday: boolean;
  startDate?: string;
  endDate?: string;
}

interface ShopState {
  // Flat convenience props (mirrored from profile for easy selector access)
  id: string | null;
  isOpen: boolean;
  holidayMode: HolidayMode | null;

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
  updateShop: (patch: Partial<ShopState>) => void;
  reset: () => void;
}

const initialState: ShopState = {
  id: null,
  isOpen: false,
  holidayMode: null,
  profile: null,
  earnings: null,
  loading: false,
  error: null,
};

export const useShopStore = create<ShopState & ShopActions>((set) => ({
  ...initialState,

  setProfile: (profile) => {
    logger.info('Shop profile updated', { shopId: profile.id });
    set({
      profile,
      id: profile.id,
      isOpen: profile.isOpen,
    });
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
          isOpen,
          profile: { ...state.profile, isOpen },
        };
      }
      return { isOpen };
    });
  },

  updateShop: (patch) => {
    set((state) => ({
      ...patch,
      profile: state.profile
        ? { ...state.profile, ...(patch.profile ?? {}) }
        : state.profile,
    }));
  },

  reset: () => {
    logger.info('Shop store reset');
    set(initialState);
  },
}));
