/**
 * Zustand statement store for Task 12.9
 * Manages PDF generation state, file URLs, loading state
 */

import { create } from 'zustand';
import { StatementState } from '@/types/statement';
import logger from '@/utils/logger';

interface StatementActions {
  setPdfUrl: (url: string | null) => void;
  setFileName: (name: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setGeneratedMonth: (month: number | null) => void;
  setGeneratedYear: (year: number | null) => void;
  setOffline: (isOffline: boolean) => void;
  reset: () => void;
}

const initialState: StatementState = {
  pdfUrl: null,
  fileName: null,
  loading: false,
  error: null,
  generatedMonth: null,
  generatedYear: null,
  isOffline: false,
};

export const useStatementStore = create<StatementState & StatementActions>(
  (set) => ({
    ...initialState,

    setPdfUrl: (url) => {
      logger.info('Statement PDF URL set in store', { hasUrl: !!url });
      set({ pdfUrl: url });
    },

    setFileName: (fileName) => {
      logger.debug('Statement file name set', { fileName });
      set({ fileName });
    },

    setLoading: (loading) => {
      set({ loading });
    },

    setError: (error) => {
      if (error) {
        logger.error('Statement store error', { error });
      }
      set({ error });
    },

    setGeneratedMonth: (month) => {
      logger.debug('Generated month set', { month });
      set({ generatedMonth: month });
    },

    setGeneratedYear: (year) => {
      logger.debug('Generated year set', { year });
      set({ generatedYear: year });
    },

    setOffline: (isOffline) => {
      if (isOffline) {
        logger.warn('Statement store offline mode enabled');
      }
      set({ isOffline });
    },

    reset: () => {
      logger.info('Statement store reset');
      set(initialState);
    },
  })
);
