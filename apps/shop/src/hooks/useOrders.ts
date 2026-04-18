/**
 * useOrders hook — fetch orders list with pagination and filtering
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import {
  getOrders,
  getOrderDetail,
  acceptOrder,
  rejectOrder,
} from '@/services/orders';
import { Order, OrdersListResponse } from '@/types/orders';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseOrdersActions {
  fetchOrders: (page?: number, status?: string) => Promise<void>;
  fetchOrderDetail: (orderId: string) => Promise<Order>;
  acceptCurrentOrder: (orderId: string) => Promise<void>;
  rejectCurrentOrder: (orderId: string, reason: string) => Promise<void>;
  retry: () => Promise<void>;
}

export function useOrders(): UseOrdersActions & {
  orders: Order[];
  loading: boolean;
  error: string | null;
} {
  const shopId = useAuthStore((s) => s.shopId);
  const {
    orders,
    loading,
    error,
    setOrders,
    setLoading,
    setError,
    removeOrder,
  } = useOrdersStore();

  const fetchOrders = useCallback(
    async (page: number = 1, status?: string) => {
      if (!shopId) {
        logger.warn('shopId not available for orders fetch');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response: OrdersListResponse = await getOrders(
          page,
          20,
          status
        );
        setOrders(response.data);
        logger.info('Orders fetched', {
          count: response.data.length,
          total: response.meta.total,
        });
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Failed to fetch orders';
        setError(message);
        logger.error('Failed to fetch orders', { error: message });
      } finally {
        setLoading(false);
      }
    },
    [shopId, setOrders, setLoading, setError]
  );

  // Fetch orders on mount — only when shopId is available and list is empty
  useEffect(() => {
    if (shopId && orders.length === 0 && !loading) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const fetchOrderDetail = useCallback(
    async (orderId: string): Promise<Order> => {
      try {
        const order = await getOrderDetail(orderId);
        logger.info('Order detail fetched', { orderId });
        return order;
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : 'Failed to fetch order';
        logger.error('Failed to fetch order detail', {
          orderId,
          error: message,
        });
        throw err;
      }
    },
    []
  );

  const acceptCurrentOrder = useCallback(
    async (orderId: string) => {
      try {
        await acceptOrder(orderId);
        removeOrder(orderId);
        logger.info('Order accepted successfully', { orderId });
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : 'Failed to accept order';
        logger.error('Failed to accept order', { orderId, error: message });
        throw err;
      }
    },
    [removeOrder]
  );

  const rejectCurrentOrder = useCallback(
    async (orderId: string, reason: string) => {
      try {
        await rejectOrder(orderId, reason);
        removeOrder(orderId);
        logger.info('Order rejected successfully', { orderId, reason });
      } catch (err) {
        const message =
          err instanceof AppError
            ? err.message
            : 'Failed to reject order';
        logger.error('Failed to reject order', { orderId, error: message });
        throw err;
      }
    },
    [removeOrder]
  );

  const retry = useCallback(async () => {
    await fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    fetchOrderDetail,
    acceptCurrentOrder,
    rejectCurrentOrder,
    retry,
  };
}
