/**
 * useEarningsRefresh hook
 * Handles pull-to-refresh functionality with loading state and toast notifications
 *
 * PATTERN: Uses individual Zustand selectors to avoid infinite re-render loops
 */

import { useCallback, useState } from 'react';
import { useEarningsStore } from '@/store/earnings';
import { getAnalytics } from '@/services/earnings';
import { DateRange } from '@/types/earnings';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseEarningsRefreshActions {
  handleRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function useEarningsRefresh(
  shopId: string | null,
  dateRange: DateRange,
  onToast?: (message: string, type: 'success' | 'error') => void
): UseEarningsRefreshActions {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Individual selectors — each returns a single value to prevent infinite loops
  const setData = useEarningsStore((state) => state.setData);
  const setError = useEarningsStore((state) => state.setError);
  const setLastUpdated = useEarningsStore((state) => state.setLastUpdated);
  const setOffline = useEarningsStore((state) => state.setOffline);

  const handleRefresh = useCallback(async () => {
    if (!shopId) {
      logger.warn('shopId not available for refresh');
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const data = await getAnalytics(shopId, dateRange);
      setData(data);
      setLastUpdated(new Date().toISOString());
      setOffline(false);

      logger.info('Earnings refreshed successfully', {
        shopId,
        dateRange,
      });

      if (onToast) {
        onToast('Earnings updated', 'success');
      }
    } catch (err) {
      const message =
        err instanceof AppError ? err.message : 'Failed to refresh earnings';
      setError(message);

      logger.error('Earnings refresh failed', {
        shopId,
        dateRange,
        error: message,
      });

      // Check if offline (no network)
      if (err instanceof AppError && err.statusCode === 0) {
        setOffline(true);
        if (onToast) {
          onToast('You are offline. Showing cached data.', 'error');
        }
      } else {
        if (onToast) {
          onToast(message, 'error');
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [shopId, dateRange, setData, setError, setLastUpdated, setOffline, onToast]);

  return {
    handleRefresh,
    isRefreshing,
  };
}
