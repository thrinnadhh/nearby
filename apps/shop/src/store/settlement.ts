/**
 * Zustand settlement store
 * Manages settlement history data, pagination, loading/error state
 * Uses individual selector pattern
 */

import { create } from 'zustand';
import { SettlementState, SettlementResponse, SettlementActions } from '@/types/settlement';
import logger from '@/utils/logger';

interface SettlementSelectors {
  // Computed selectors
  isEmpty: () => boolean;
  getPages: () => number;
}

const initialState: SettlementState = {
  data: [],
  loading: false,
  error: null,
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
  lastUpdated: null,
  isOffline: false,
};

export const useSettlementStore = create<
  SettlementState & SettlementActions & SettlementSelectors
>((set, get) => ({
  ...initialState,

  setData: (data: SettlementResponse[]) => {
    logger.info('Settlement data updated in store', {
      count: data.length,
    });
    set({ data, error: null });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  setError: (error: string | null) => {
    if (error) {
      logger.error('Settlement store error', { error });
    }
    set({ error });
  },

  setPagination: (page: number, limit: number, total: number) => {
    const pages = Math.ceil(total / limit);
    logger.debug('Settlement pagination updated', {
      page,
      limit,
      total,
      pages,
    });
    set({ page, limit, total, pages });
  },

  setLastUpdated: (lastUpdated: string | null) => {
    logger.debug('Settlement last updated', { lastUpdated });
    set({ lastUpdated });
  },

  setOffline: (isOffline: boolean) => {
    if (isOffline) {
      logger.warn('Settlement store offline mode enabled');
    }
    set({ isOffline });
  },

  reset: () => {
    logger.info('Settlement store reset');
    set(initialState);
  },

  // Computed selectors
  isEmpty: () => {
    const state = get();
    return state.data.length === 0 && !state.loading && !state.error;
  },

  getPages: () => {
    return get().pages;
  },
}));

/**
 * Individual selectors to prevent unnecessary re-renders
 */
export const useSettlementData = () =>
  useSettlementStore((s) => s.data);

export const useSettlementLoading = () =>
  useSettlementStore((s) => s.loading);

export const useSettlementError = () =>
  useSettlementStore((s) => s.error);

export const useSettlementPagination = () =>
  useSettlementStore((s) => ({
    page: s.page,
    limit: s.limit,
    total: s.total,
    pages: s.pages,
  }));

export const useSettlementOffline = () =>
  useSettlementStore((s) => s.isOffline);

export const useSettlementLastUpdated = () =>
  useSettlementStore((s) => s.lastUpdated);
