/**
 * Socket.IO client setup and event listeners
 * Handles real-time order notifications and updates
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants/api';
import logger from '@/utils/logger';

let socketInstance: Socket | null = null;

/**
 * Initialize Socket.IO connection
 * Must be called with JWT token and shopId from Zustand auth store
 */
export function initializeSocket(token: string, shopId: string): Socket {
  if (socketInstance) {
    logger.warn('Socket.IO already initialized, returning existing instance');
    return socketInstance;
  }

  socketInstance = io(SOCKET_URL, {
    auth: {
      token: `Bearer ${token}`,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socketInstance.on('connect', () => {
    logger.info('Socket.IO connected', { socketId: socketInstance?.id });
    // Join shop-specific room for order notifications
    socketInstance?.emit('join-room', { room: `shop:${shopId}` });
  });

  socketInstance.on('disconnect', (reason) => {
    logger.info('Socket.IO disconnected', { reason });
  });

  socketInstance.on('connect_error', (error) => {
    logger.error('Socket.IO connection error', { error: error.message });
  });

  return socketInstance;
}

/**
 * Get Socket.IO instance (must be initialized first)
 */
export function getSocket(): Socket | null {
  return socketInstance;
}

/**
 * Close Socket.IO connection
 */
export function closeSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    logger.info('Socket.IO disconnected');
  }
}

interface OrderNewPayload {
  orderId: string;
  total: number;
  itemsCount: number;
}

interface OrderAcceptedPayload {
  orderId: string;
  shopId: string;
}

interface OrderRejectedPayload {
  orderId: string;
  reason: string;
}

/**
 * Listen to new order event
 * Event emitted when customer places new order for this shop
 */
export function onOrderNew(
  callback: (order: OrderNewPayload) => void
): () => void {
  const listener = (data: OrderNewPayload) => {
    logger.info('Received order:new event', { orderId: data.orderId });
    callback(data);
  };

  socketInstance?.on('order:new', listener);

  return () => {
    socketInstance?.off('order:new', listener);
  };
}

/**
 * Listen to order accepted event
 */
export function onOrderAccepted(
  callback: (data: OrderAcceptedPayload) => void
): () => void {
  const listener = (data: OrderAcceptedPayload) => {
    logger.info('Received order:accepted event', { orderId: data.orderId });
    callback(data);
  };

  socketInstance?.on('order:accepted', listener);

  return () => {
    socketInstance?.off('order:accepted', listener);
  };
}

/**
 * Listen to order rejected event
 */
export function onOrderRejected(
  callback: (data: OrderRejectedPayload) => void
): () => void {
  const listener = (data: OrderRejectedPayload) => {
    logger.info('Received order:rejected event', { orderId: data.orderId });
    callback(data);
  };

  socketInstance?.on('order:rejected', listener);

  return () => {
    socketInstance?.off('order:rejected', listener);
  };
}
