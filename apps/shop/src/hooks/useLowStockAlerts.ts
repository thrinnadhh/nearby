/**
 * useLowStockAlerts hook — fetch and manage low stock alert products
 * Features:
 *  - Fetches products below stock threshold
 *  - Supports filtering by threshold (1-999)
 *  - Supports pagination
 *  - Supports sorting by stock, name, or updated_at
 *  - Pull-to-refresh capability
 *  - Error handling and retry
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { getLowStockProducts } from '@/services/low-stock';
import {
  LowStockProduct,
  LowStockQueryParams,
  LowStockAlertsResponse,
} from '@/types/low-stock';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseLowStockAlertsState {
  products: LowStockProduct[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  pagination: {
    page: number;
    total: number;
    pages: number;
    lowStockCount: number;
    threshold: number;
  };
}

interface UseLowStockAlertsActions {
  fetchProducts: (params?: LowStockQueryParams) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setThreshold: (threshold: number) => Promise<void>;
  setSortBy: (sortBy: 'stock' | 'name' | 'updated_at') => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

const DEFAULT_PAGINATION = {
  page: 1,
  total: 0,
  pages: 0,
  lowStockCount: 0,
  threshold: 5,
};

const DEFAULT_QUERY_PARAMS: LowStockQueryParams = {
  threshold: 5,
  page: 1,
  limit: 20,
  sortBy: 'stock',
};

export function useLowStockAlerts(): UseLowStockAlertsState & UseLowStockAlertsActions {
  const shopId = useAuthStore((s) => s.shopId);

  // State
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ ...DEFAULT_PAGINATION });

  // Keep track of current query params for "load more" and refresh
  const queryParamsRef = useRef<LowStockQueryParams>({ ...DEFAULT_QUERY_PARAMS });

  // Flag to suppress auto-fetch after an explicit reset()
  const suppressAutoFetchRef = useRef(false);

  // Fetch products
  const fetchProducts = useCallback(
    async (params: LowStockQueryParams = {}) => {
      if (!shopId) {
        const message = 'Shop ID not available';
        logger.warn('shopId not available for low stock alerts fetch');
        setError(message);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Update query params for future "load more"
        queryParamsRef.current = {
          threshold: params.threshold ?? 5,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          sortBy: params.sortBy ?? 'stock',
        };

        const response: LowStockAlertsResponse = await getLowStockProducts(
          queryParamsRef.current
        );

        setProducts(response.data);
        setPagination({
          page: response.meta.page,
          total: response.meta.total,
          pages: response.meta.pages,
          lowStockCount: response.meta.lowStockCount,
          threshold: response.meta.threshold,
        });

        logger.info('Low stock products fetched', {
          count: response.data.length,
          total: response.meta.total,
          threshold: response.meta.threshold,
        });
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : (err as { message?: string })?.message ?? 'Failed to fetch low stock products';
        setError(message);
        logger.error('Failed to fetch low stock products', { error: message });
      } finally {
        setLoading(false);
      }
    },
    [shopId]
  );

  // Load more products (pagination)
  const loadMore = useCallback(async () => {
    if (pagination.page >= pagination.pages) {
      logger.info('Already at last page');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextPage = pagination.page + 1;
      const response: LowStockAlertsResponse = await getLowStockProducts({
        ...queryParamsRef.current,
        page: nextPage,
      });

      setProducts((prev) => [...prev, ...response.data]);
      setPagination({
        page: response.meta.page,
        total: response.meta.total,
        pages: response.meta.pages,
        lowStockCount: response.meta.lowStockCount,
        threshold: response.meta.threshold,
      });

      logger.info('Loaded more low stock products', {
        newPage: nextPage,
        count: response.data.length,
      });
    } catch (err) {
      const message =
        err instanceof AppError
            ? err.message
            : (err as { message?: string })?.message ?? 'Failed to load more products';
      setError(message);
      logger.error('Failed to load more products', { error: message });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pages]);

  // Refresh products (pull-to-refresh)
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response: LowStockAlertsResponse = await getLowStockProducts({
        ...queryParamsRef.current,
        page: 1,
      });

      setProducts(response.data);
      setPagination({
        page: response.meta.page,
        total: response.meta.total,
        pages: response.meta.pages,
        lowStockCount: response.meta.lowStockCount,
        threshold: response.meta.threshold,
      });

      logger.info('Low stock products refreshed', {
        count: response.data.length,
        total: response.meta.total,
      });
    } catch (err) {
      const message =
        err instanceof AppError
            ? err.message
            : (err as { message?: string })?.message ?? 'Failed to refresh products';
      setError(message);
      logger.error('Failed to refresh low stock products', { error: message });
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Set threshold and fetch
  const setThreshold = useCallback(
    async (threshold: number) => {
      await fetchProducts({
        threshold: Math.max(1, Math.min(999, threshold)),
        page: 1,
        limit: 20,
        sortBy: queryParamsRef.current.sortBy || 'stock',
      });
    },
    [fetchProducts]
  );

  // Set sort and fetch
  const setSortBy = useCallback(
    async (sortBy: 'stock' | 'name' | 'updated_at') => {
      await fetchProducts({
        threshold: queryParamsRef.current.threshold || 5,
        page: 1,
        limit: 20,
        sortBy,
      });
    },
    [fetchProducts]
  );

  // Retry last failed request
  const retry = useCallback(async () => {
    await fetchProducts(queryParamsRef.current);
  }, [fetchProducts]);

  // Reset state — suppresses auto-fetch to avoid immediate re-trigger
  const reset = useCallback(() => {
    suppressAutoFetchRef.current = true;
    setProducts([]);
    setLoading(false);
    setRefreshing(false);
    setError(null);
    setPagination({ ...DEFAULT_PAGINATION });
    queryParamsRef.current = { ...DEFAULT_QUERY_PARAMS };
    logger.info('Low stock alerts hook reset');
  }, []);

  // Initial fetch on mount
  // - If shopId missing, sets error immediately
  // - Skipped after an explicit reset() to avoid infinite loops
  useEffect(() => {
    if (suppressAutoFetchRef.current) {
      suppressAutoFetchRef.current = false;
      return;
    }

    if (!shopId) {
      setError('Shop ID not available');
      logger.warn('useLowStockAlerts: No shopId on mount');
      return;
    }

    fetchProducts();
    // Run only on mount (shopId stabilises on first render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    loading,
    refreshing,
    error,
    pagination,
    fetchProducts,
    loadMore,
    refresh,
    setThreshold,
    setSortBy,
    retry,
    reset,
  };
}
