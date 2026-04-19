/**
 * useEarningsData hook
 * Fetches earnings data on mount and when dependencies change
 * Manages loading, error, and data states
 *
 * PATTERN: Uses individual Zustand selectors to avoid infinite re-render loops
 * (object literals in selectors cause new reference every render)
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useEarningsStore } from '@/store/earnings';
import { getAnalytics } from '@/services/earnings';
import { EarningsData, DateRange } from '@/types/earnings';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface UseEarningsDataActions {
  fetchEarnings: (dateRange?: DateRange) => Promise<void>;
  refreshEarnings: () => Promise<void>;
  retry: () => Promise<void>;
}

export function useEarningsData(): UseEarningsDataActions & {
  earnings: EarningsData | null;
  loading: boolean;
  error: string | null;
  dateRange: DateRange;
  lastUpdated: string | null;
  isOffline: boolean;
} {
  const shopId = useAuthStore((s) => s.shopId);
  const isConnected = useNetworkStatus();

  // Individual selectors — each returns a single value to prevent infinite loops
  const earnings = useEarningsStore((state) => state.data);
  const loading = useEarningsStore((state) => state.loading);
  const error = useEarningsStore((state) => state.error);
  const dateRange = useEarningsStore((state) => state.dateRange);
  const lastUpdated = useEarningsStore((state) => state.lastUpdated);
  const isOffline = useEarningsStore((state) => state.isOffline);
  const setData = useEarningsStore((state) => state.setData);
  const setLoading = useEarningsStore((state) => state.setLoading);
  const setError = useEarningsStore((state) => state.setError);
  const setLastUpdated = useEarningsStore((state) => state.setLastUpdated);
  const setDateRange = useEarningsStore((state) => state.setDateRange);
  const setOffline = useEarningsStore((state) => state.setOffline);

  const [shouldFetch, setShouldFetch] = useState(false);

  // Track network status
  useEffect(() => {
    setOffline(!isConnected);
  }, [isConnected, setOffline]);

  // Fetch on mount if not already loaded
  useEffect(() => {
    if (shopId && !earnings && !loading && !error) {
      setShouldFetch(true);
    }
  }, [shopId, earnings, loading, error]);

  const fetchEarnings = useCallback(
    async (range: DateRange = dateRange) => {
      if (!shopId) {
        logger.warn('shopId not available for earnings fetch');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getAnalytics(shopId, range);
        setData(data);
        setLastUpdated(new Date().toISOString());
        setDateRange(range);

        logger.info('Earnings data fetched', {
          shopId,
          dateRange: range,
          hasToday: !!data.today,
        });
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Failed to fetch earnings';
        setError(message);
        logger.error('Failed to fetch earnings', {
          shopId,
          dateRange: range,
          error: message,
        });
      } finally {
        setLoading(false);
      }
    },
    [shopId, dateRange, setData, setLoading, setError, setLastUpdated, setDateRange]
  );

  const refreshEarnings = useCallback(async () => {
    await fetchEarnings(dateRange);
  }, [dateRange, fetchEarnings]);

  const retry = useCallback(async () => {
    setError(null);
    await fetchEarnings(dateRange);
  }, [dateRange, fetchEarnings, setError]);

  // Execute initial fetch if needed
  useEffect(() => {
    if (shouldFetch) {
      fetchEarnings();
      setShouldFetch(false);
    }
  }, [shouldFetch, fetchEarnings]);

  return {
    earnings,
    loading,
    error,
    dateRange,
    lastUpdated,
    isOffline,
    fetchEarnings,
    refreshEarnings,
    retry,
  };
}
