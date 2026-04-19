/**
 * Zustand earnings store
 * Manages earnings data, loading state, error state
 * Uses selector pattern for accessing store state
 */

import { create } from 'zustand';
import {
  EarningsState,
  EarningsData,
  DateRange,
} from '@/types/earnings';
import logger from '@/utils/logger';

interface EarningsActions {
  setData: (data: EarningsData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (time: string | null) => void;
  setDateRange: (range: DateRange) => void;
  setOffline: (isOffline: boolean) => void;
  reset: () => void;
}

interface EarningsSelectors {
  // Add computed selectors here if needed
}

const initialState: EarningsState = {
  data: null,
  loading: false,
  error: null,
  lastUpdated: null,
  dateRange: '30d',
  isOffline: false,
};

export const useEarningsStore = create<
  EarningsState & EarningsActions & EarningsSelectors
>((set) => ({
  ...initialState,

  setData: (data) => {
    logger.info('Earnings data updated in store', {
      hasToday: !!data.today,
      weekCount: data.week.length,
      monthCount: data.month.length,
    });
    set({ data, error: null });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    if (error) {
      logger.error('Earnings store error', { error });
    }
    set({ error });
  },

  setLastUpdated: (lastUpdated) => {
    logger.debug('Earnings last updated', { lastUpdated });
    set({ lastUpdated });
  },

  setDateRange: (dateRange) => {
    logger.info('Earnings date range changed', { dateRange });
    set({ dateRange });
  },

  setOffline: (isOffline) => {
    if (isOffline) {
      logger.warn('Earnings store offline mode enabled');
    }
    set({ isOffline });
  },

  reset: () => {
    logger.info('Earnings store reset');
    set(initialState);
  },
}));
