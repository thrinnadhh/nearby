/**
 * useOrderSocket hook — listen to Socket.IO order events
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import {
  initializeSocket,
  closeSocket,
  onOrderNew,
  onOrderAccepted,
  onOrderRejected,
} from '@/services/socket';
import logger from '@/utils/logger';

interface OrderNewEvent {
  orderId: string;
  customerId: string;
  customerName: string;
  total: number;
  itemsCount: number;
  createdAt: string;
}

interface OrderActionCallback {
  (orderId: string, data?: Record<string, unknown>): void;
}

interface UseOrderSocketActions {
  onNewOrder: (callback: (event: OrderNewEvent) => void) => void;
  onOrderAcceptedEvent: (callback: OrderActionCallback) => void;
  onOrderRejectedEvent: (callback: OrderActionCallback) => void;
}

export function useOrderSocket(): UseOrderSocketActions {
  const token = useAuthStore((s) => s.token);
  const shopId = useAuthStore((s) => s.shopId);
  const { addOrder } = useOrdersStore();

  // Initialize Socket.IO on mount
  useEffect(() => {
    if (token && shopId) {
      try {
        initializeSocket(token, shopId);
        logger.info('Socket.IO initialized for orders');
      } catch (error) {
        logger.error('Failed to initialize Socket.IO', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Cleanup on unmount
    return () => {
      closeSocket();
    };
  }, [token, shopId]);

  const onNewOrder = useCallback(
    (callback: (event: OrderNewEvent) => void) => {
      const unsubscribe = onOrderNew((event) => {
        logger.info('New order received', { orderId: event.orderId });
        callback(event);
      });

      return unsubscribe;
    },
    []
  );

  const onOrderAcceptedEvent = useCallback(
    (callback: OrderActionCallback) => {
      const unsubscribe = onOrderAccepted((data) => {
        logger.info('Order accepted event received', { orderId: data.orderId });
        callback(data.orderId, data);
      });

      return unsubscribe;
    },
    []
  );

  const onOrderRejectedEvent = useCallback(
    (callback: OrderActionCallback) => {
      const unsubscribe = onOrderRejected((data) => {
        logger.info('Order rejected event received', { orderId: data.orderId });
        callback(data.orderId, data);
      });

      return unsubscribe;
    },
    []
  );

  return {
    onNewOrder,
    onOrderAcceptedEvent,
    onOrderRejectedEvent,
  };
}
