/**
 * useShopAnalytics hook for Task 12.10
 * Fetches analytics data with top products
 * Manages loading, error, and offline states
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useAnalyticsStore } from '@/store/analytics';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getAnalytics } from '@/services/earnings';
import { getTopProducts } from '@/services/analytics';
import { AnalyticsDateRange, AnalyticsData } from '@/types/analytics';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseShopAnalyticsResult {
  data: AnalyticsData | null;
  topProducts: unknown[];
  loading: boolean;
  error: string | null;
  dateRange: AnalyticsDateRange;
  isOffline: boolean;
  fetchAnalytics: (range?: AnalyticsDateRange) => Promise<void>;
  retry: () => Promise<void>;
}

export function useShopAnalytics(): UseShopAnalyticsResult {
  const shopId = useAuthStore((s) => s.shopId);
  const isConnected = useNetworkStatus();

  // Individual selectors
  const data = useAnalyticsStore((s) => s.data);
  const topProducts = useAnalyticsStore((s) => s.topProducts);
  const loading = useAnalyticsStore((s) => s.loading);
  const error = useAnalyticsStore((s) => s.error);
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const isOffline = useAnalyticsStore((s) => s.isOffline);
  const setData = useAnalyticsStore((s) => s.setData);
  const setTopProducts = useAnalyticsStore((s) => s.setTopProducts);
  const setLoading = useAnalyticsStore((s) => s.setLoading);
  const setError = useAnalyticsStore((s) => s.setError);
  const setDateRange = useAnalyticsStore((s) => s.setDateRange);
  const setOffline = useAnalyticsStore((s) => s.setOffline);

  const [shouldFetch, setShouldFetch] = useState(false);

  // Track network status
  useEffect(() => {
    setOffline(!isConnected);
  }, [isConnected, setOffline]);

  // Fetch on mount if not already loaded
  useEffect(() => {
    if (shopId && !data && !loading && !error) {
      setShouldFetch(true);
    }
  }, [shopId, data, loading, error]);

  const fetchAnalytics = useCallback(
    async (range: AnalyticsDateRange = dateRange) => {
      if (!shopId) {
        logger.warn('shopId not available for analytics fetch');
        setError('Shop ID not found');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch both earnings and top products in parallel
        const [earnings, products] = await Promise.all([
          getAnalytics(shopId, range),
          getTopProducts(shopId, 5, range),
        ]);

        setData(earnings);
        setTopProducts(products);
        setDateRange(range);

        logger.info('Analytics data fetched successfully', {
          shopId,
          dateRange: range,
          hasEarnings: !!earnings,
          productsCount: products.length,
        });
      } catch (err) {
        // Propagate the original error message so callers can display it
        const message =
          err instanceof AppError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Failed to fetch analytics';
        setError(message);
        logger.error('Analytics fetch failed', {
          shopId,
          dateRange: range,
          error: message,
        });
      } finally {
        setLoading(false);
      }
    },
    [shopId, dateRange, setData, setTopProducts, setLoading, setError, setDateRange]
  );

  const retry = useCallback(() => {
    return fetchAnalytics(dateRange);
  }, [fetchAnalytics, dateRange]);

  // Initial fetch
  useEffect(() => {
    if (shouldFetch) {
      fetchAnalytics();
      setShouldFetch(false);
    }
  }, [shouldFetch, fetchAnalytics]);

  return {
    data,
    topProducts,
    loading,
    error,
    dateRange,
    isOffline,
    fetchAnalytics,
    retry,
  };
}
