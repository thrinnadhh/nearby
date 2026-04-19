/**
 * useLowStockDismissal hook — manage low stock product dismissals
 * Stores dismissal preferences in AsyncStorage with per-product tracking
 * Features:
 *  - Persist dismissals to AsyncStorage
 *  - Filter products by dismissal status
 *  - Clear all dismissals on pull-to-refresh
 *  - Add/remove individual dismissals
 */

import { useState, useCallback, useEffect } from 'react';
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import {
  LowStockDismissal,
  LowStockDismissalStore,
} from '@/types/low-stock';
import logger from '@/utils/logger';

const DISMISSAL_STORAGE_KEY = 'low_stock_dismissals';

interface UseLowStockDismissalState {
  dismissals: LowStockDismissalStore;
  loading: boolean;
  error: string | null;
}

interface UseLowStockDismissalActions {
  isDismissed: (productId: string) => boolean;
  dismissProduct: (productId: string, reason?: string) => Promise<void>;
  undismissProduct: (productId: string) => Promise<void>;
  clearAllDismissals: () => Promise<void>;
  getActiveDismissals: () => string[];
}

export function useLowStockDismissal(): UseLowStockDismissalState & UseLowStockDismissalActions {
  const { getItem, setItem, removeItem } = useAsyncStorage(DISMISSAL_STORAGE_KEY);

  // State
  const [dismissals, setDismissals] = useState<LowStockDismissalStore>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dismissals from AsyncStorage on mount
  useEffect(() => {
    const loadDismissals = async () => {
      try {
        setLoading(true);
        const stored = await getItem();

        if (stored) {
          const parsed = JSON.parse(stored) as LowStockDismissalStore;
          setDismissals(parsed);
          logger.info('Dismissals loaded from storage', {
            count: Object.keys(parsed).length,
          });
        } else {
          setDismissals({});
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load dismissals';
        setError(message);
        logger.error('Failed to load dismissals from storage', { error: message });
      } finally {
        setLoading(false);
      }
    };

    loadDismissals();
  }, [getItem]);

  // Check if product is dismissed
  const isDismissed = useCallback(
    (productId: string): boolean => {
      return productId in dismissals;
    },
    [dismissals]
  );

  // Dismiss a product
  const dismissProduct = useCallback(
    async (productId: string, reason?: string) => {
      try {
        const newDismissal: LowStockDismissal = {
          productId,
          dismissedAt: new Date().toISOString(),
          reason,
        };

        const updated = {
          ...dismissals,
          [productId]: newDismissal,
        };

        setDismissals(updated);
        await setItem(JSON.stringify(updated));

        logger.info('Product dismissed', {
          productId,
          reason,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to dismiss product';
        setError(message);
        logger.error('Failed to dismiss product', { productId, error: message });
        throw err;
      }
    },
    [dismissals, setItem]
  );

  // Undismiss a product
  const undismissProduct = useCallback(
    async (productId: string) => {
      try {
        const updated = { ...dismissals };
        delete updated[productId];

        setDismissals(updated);
        await setItem(JSON.stringify(updated));

        logger.info('Product undismissed', { productId });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to undismiss product';
        setError(message);
        logger.error('Failed to undismiss product', { productId, error: message });
        throw err;
      }
    },
    [dismissals, setItem]
  );

  // Clear all dismissals (typically called on pull-to-refresh)
  const clearAllDismissals = useCallback(async () => {
    try {
      setDismissals({});
      await removeItem();

      logger.info('All dismissals cleared');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to clear dismissals';
      setError(message);
      logger.error('Failed to clear all dismissals', { error: message });
      throw err;
    }
  }, [removeItem]);

  // Get array of dismissed product IDs
  const getActiveDismissals = useCallback((): string[] => {
    return Object.keys(dismissals);
  }, [dismissals]);

  return {
    dismissals,
    loading,
    error,
    isDismissed,
    dismissProduct,
    undismissProduct,
    clearAllDismissals,
    getActiveDismissals,
  };
}
