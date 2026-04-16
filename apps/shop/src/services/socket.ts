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

/**
 * Listen to new order event
 * Event emitted when customer places new order for this shop
 */
export function onOrderNew(
  callback: (order: { orderId: string; total: number; itemsCount: number }) => void
): () => void {
  const listener = (data: unknown) => {
    logger.info('Received order:new event', data);
    callback(data as any);
  };

  socketInstance?.on('order:new', listener);

  // Return unsubscribe function
  return () => {
    socketInstance?.off('order:new', listener);
  };
}

/**
 * Listen to order accepted event (by another shop or same shop)
 */
export function onOrderAccepted(
  callback: (data: { orderId: string; shopId: string }) => void
): () => void {
  const listener = (data: unknown) => {
    logger.info('Received order:accepted event', data);
    callback(data as any);
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
  callback: (data: { orderId: string; reason: string }) => void
): () => void {
  const listener = (data: unknown) => {
    logger.info('Received order:rejected event', data);
    callback(data as any);
  };

  socketInstance?.on('order:rejected', listener);

  return () => {
    socketInstance?.off('order:rejected', listener);
  };
}
