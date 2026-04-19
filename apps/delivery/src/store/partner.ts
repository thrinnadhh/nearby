/**
 * Partner store — delivery partner profile data
 */

import { create } from 'zustand';
import { DeliveryPartner } from '@/types/delivery-partner';
import logger from '@/utils/logger';

interface PartnerState {
  profile: DeliveryPartner | null;
  isOnline: boolean;
  loading: boolean;
  error: string | null;
}

interface PartnerActions {
  setProfile: (profile: DeliveryPartner) => void;
  updateOnlineStatus: (isOnline: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: PartnerState = {
  profile: null,
  isOnline: false,
  loading: false,
  error: null,
};

export const usePartnerStore = create<PartnerState & PartnerActions>((set) => ({
  ...initialState,

  setProfile: (profile) => {
    logger.info('Partner profile updated', { partnerId: profile.id });
    set({ profile, isOnline: profile.isOnline });
  },

  updateOnlineStatus: (isOnline) => {
    logger.info('Partner online status updated', { isOnline });
    set((state) => ({
      isOnline,
      profile: state.profile
        ? { ...state.profile, isOnline }
        : null,
    }));
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    set({ error });
  },

  reset: () => {
    logger.info('Partner store reset');
    set(initialState);
  },
}));
