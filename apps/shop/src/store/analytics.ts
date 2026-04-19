/**
 * Zustand analytics store for Task 12.10
 * Manages analytics data, top products, loading state
 */

import { create } from 'zustand';
import { AnalyticsState, TopProduct, AnalyticsData, AnalyticsDateRange } from '@/types/analytics';
import logger from '@/utils/logger';

interface AnalyticsActions {
  setData: (data: AnalyticsData) => void;
  setTopProducts: (products: TopProduct[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDateRange: (range: AnalyticsDateRange) => void;
  setOffline: (isOffline: boolean) => void;
  setLastUpdated: (time: string | null) => void;
  reset: () => void;
}

const initialState: AnalyticsState = {
  data: null,
  topProducts: [],
  loading: false,
  error: null,
  dateRange: '30d',
  isOffline: false,
  lastUpdated: null,
};

export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>(
  (set) => ({
    ...initialState,

    setData: (data) => {
      logger.info('Analytics data updated in store', {
        hasData: !!data,
        topProductsCount: data.topProducts?.length || 0,
      });
      set({ data, error: null });
    },

    setTopProducts: (products) => {
      logger.info('Top products updated in store', {
        count: products.length,
      });
      set({ topProducts: products, error: null });
    },

    setLoading: (loading) => {
      set({ loading });
    },

    setError: (error) => {
      if (error) {
        logger.error('Analytics store error', { error });
      }
      set({ error });
    },

    setDateRange: (dateRange) => {
      logger.info('Analytics date range changed', { dateRange });
      set({ dateRange });
    },

    setOffline: (isOffline) => {
      if (isOffline) {
        logger.warn('Analytics store offline mode enabled');
      }
      set({ isOffline });
    },

    setLastUpdated: (lastUpdated) => {
      logger.debug('Analytics last updated', { lastUpdated });
      set({ lastUpdated });
    },

    reset: () => {
      logger.info('Analytics store reset');
      set(initialState);
    },
  })
);
