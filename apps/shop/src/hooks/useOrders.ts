/**
 * useOrders hook — fetch orders list with pagination and filtering
 */

import { useEffect, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { getOrders, getOrderDetail, acceptOrder, rejectOrder } from '@/services/orders';
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

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch orders on mount
  useEffect(() => {
    if (shopId && orders.length === 0 && !loading) {
      fetchOrders();
    }
  }, [shopId]);

  const fetchOrders = useCallback(
    async (page: number = 1, status?: string) => {
      if (!shopId) {
        logger.warn('shopId not available for orders fetch');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response: OrdersListResponse = await getOrders(page, 20, status);
        setOrders(response.data);
        logger.info('Orders fetched', {
          count: response.data.length,
          total: response.meta.total,
        });
      } catch (error) {
        const message =
          error instanceof AppError ? error.message : 'Failed to fetch orders';
        setError(message);
        logger.error('Failed to fetch orders', { error: message });
      } finally {
        setLoading(false);
      }
    },
    [shopId, setOrders, setLoading, setError]
  );

  const fetchOrderDetail = useCallback(
    async (orderId: string): Promise<Order> => {
      try {
        const order = await getOrderDetail(orderId);
        logger.info('Order detail fetched', { orderId });
        return order;
      } catch (error) {
        const message =
          error instanceof AppError ? error.message : 'Failed to fetch order';
        logger.error('Failed to fetch order detail', { orderId, error: message });
        throw error;
      }
    },
    []
  );

  const acceptCurrentOrder = useCallback(
    async (orderId: string) => {
      setActionLoading(true);
      try {
        await acceptOrder(orderId);
        // Update store — remove from pending list
        removeOrder(orderId);
        logger.info('Order accepted successfully', { orderId });
      } catch (error) {
        const message =
          error instanceof AppError ? error.message : 'Failed to accept order';
        logger.error('Failed to accept order', { orderId, error: message });
        throw error;
      } finally {
        setActionLoading(false);
      }
    },
    [removeOrder]
  );

  const rejectCurrentOrder = useCallback(
    async (orderId: string, reason: string) => {
      setActionLoading(true);
      try {
        await rejectOrder(orderId, reason);
        // Update store — remove from pending list
        removeOrder(orderId);
        logger.info('Order rejected successfully', { orderId, reason });
      } catch (error) {
        const message =
          error instanceof AppError ? error.message : 'Failed to reject order';
        logger.error('Failed to reject order', { orderId, error: message });
        throw error;
      } finally {
        setActionLoading(false);
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
