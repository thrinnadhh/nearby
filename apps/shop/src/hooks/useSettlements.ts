/**
 * useSettlements hook
 * Fetches settlement history with pagination
 * Handles offline state and caching
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchSettlements } from '@/services/settlements';
import { useSettlementStore } from '@/store/settlement';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/store/auth';
import logger from '@/utils/logger';
import { AppError } from '@/types/common';
import { SettlementResponse } from '@/types/settlement';

export interface UseSettlementsReturn {
  settlements: SettlementResponse[];
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  fetchSettlements: (pageNum?: number) => Promise<void>;
  goToPage: (pageNum: number) => Promise<void>;
  isOffline: boolean;
}

export function useSettlements(): UseSettlementsReturn {
  const shopId = useAuthStore((s) => s.shopId);
  const isOnline = useNetworkStatus();

  // Store selectors
  const storeData = useSettlementStore((s) => s.data);
  const storeLoading = useSettlementStore((s) => s.loading);
  const storeError = useSettlementStore((s) => s.error);
  const storePage = useSettlementStore((s) => s.page);
  const storeLimit = useSettlementStore((s) => s.limit);
  const storeTotal = useSettlementStore((s) => s.total);
  const storePages = useSettlementStore((s) => s.pages);
  const storeIsOffline = useSettlementStore((s) => s.isOffline);

  // Store actions
  const setData = useSettlementStore((s) => s.setData);
  const setLoading = useSettlementStore((s) => s.setLoading);
  const setError = useSettlementStore((s) => s.setError);
  const setPagination = useSettlementStore((s) => s.setPagination);
  const setLastUpdated = useSettlementStore((s) => s.setLastUpdated);
  const setOffline = useSettlementStore((s) => s.setOffline);

  // Track if data has been loaded
  const [dataLoaded, setDataLoaded] = useState(false);

  // Handle network status changes
  useEffect(() => {
    setOffline(!isOnline);
  }, [isOnline, setOffline]);

  /**
   * Fetch settlements from API
   */
  const doFetchSettlements = useCallback(
    async (pageNum: number = 1) => {
      if (!shopId) {
        logger.warn('useSettlements: No shopId available');
        return;
      }

      // If offline and data already loaded, don't fetch
      if (!isOnline && dataLoaded) {
        logger.info('useSettlements: Offline with cached data, skipping fetch');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetchSettlements({
          shopId,
          page: pageNum,
          limit: storeLimit,
        });

        if (response && response.data) {
          setData(response.data);
          setPagination(
            response.meta.page,
            response.meta.limit,
            response.meta.total
          );
          setLastUpdated(new Date().toISOString());
          setDataLoaded(true);

          logger.info('useSettlements: Data loaded successfully', {
            shopId,
            page: pageNum,
            count: response.data.length,
          });
        }
      } catch (err) {
        const errorMessage =
          err instanceof AppError
            ? err.message
            : 'Failed to load settlements';

        setError(errorMessage);
        logger.error('useSettlements: Fetch failed', {
          shopId,
          error: errorMessage,
        });

        // If offline, don't clear data
        if (!isOnline && dataLoaded) {
          logger.info('useSettlements: Keeping cached data on offline');
        }
      } finally {
        setLoading(false);
      }
    },
    [
      shopId,
      isOnline,
      dataLoaded,
      storeLimit,
      setData,
      setLoading,
      setError,
      setPagination,
      setLastUpdated,
    ]
  );

  /**
   * Go to specific page
   */
  const goToPage = useCallback(
    async (pageNum: number) => {
      if (pageNum < 1 || pageNum > storePages) {
        logger.warn('useSettlements: Invalid page number', {
          pageNum,
          maxPages: storePages,
        });
        return;
      }

      await doFetchSettlements(pageNum);
    },
    [storePages, doFetchSettlements]
  );

  /**
   * Initial load
   */
  useEffect(() => {
    if (!dataLoaded && isOnline) {
      doFetchSettlements(1);
    }
  }, [doFetchSettlements, dataLoaded, isOnline]);

  return {
    settlements: storeData,
    loading: storeLoading,
    error: storeError,
    page: storePage,
    limit: storeLimit,
    total: storeTotal,
    pages: storePages,
    hasNextPage: storePage < storePages,
    hasPreviousPage: storePage > 1,
    fetchSettlements: doFetchSettlements,
    goToPage,
    isOffline: storeIsOffline,
  };
}
