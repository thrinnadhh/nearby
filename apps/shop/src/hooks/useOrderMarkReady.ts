/**
 * useOrderMarkReady — Mark order as ready for pickup
 * Used by packing-checklist.tsx screen
 * Calls PATCH /orders/:id/ready endpoint
 */

import { useCallback, useState } from 'react';
import { markOrderReady } from '@/services/order-ready';
import { Order } from '@/types/orders';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseOrderMarkReadyState {
  loading: boolean;
  error: string | null;
}

interface UseOrderMarkReadyActions {
  markOrderReady: (orderId: string) => Promise<Order>;
}

export function useOrderMarkReady(): UseOrderMarkReadyState &
  UseOrderMarkReadyActions {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMarkReady = useCallback(
    async (orderId: string): Promise<Order> => {
      setLoading(true);
      setError(null);

      try {
        logger.info('Marking order as ready', { orderId });
        const order = await markOrderReady(orderId);
        logger.info('Order marked as ready successfully', { orderId });
        return order;
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Failed to mark order ready';
        setError(message);
        logger.error('Failed to mark order ready', { orderId, error: message });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    markOrderReady: handleMarkReady,
  };
}
