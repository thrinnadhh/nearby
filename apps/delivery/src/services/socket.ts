/**
 * Socket.IO service for delivery partner — handles real-time assignment events
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants/api';
import logger from '@/utils/logger';

// Global socket instance
let socket: Socket | null = null;

interface SocketAssignmentEvent {
  orderId: string;
  orderData: {
    id: string;
    shopName: string;
    totalAmount: number;
    customerPhone: string;
    deliveryAddress: string;
    items: Array<{ productName: string; quantity: number }>;
  };
  distanceKm: number;
  estimatedPickupTime: number;
  estimatedDeliveryTime: number;
}

/**
 * Initialize Socket.IO connection with JWT authentication
 */
export function initSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    logger.info('Socket.IO connected for delivery partner', {
      socketId: socket?.id,
    });
  });

  socket.on('connect_error', (error) => {
    logger.error('Socket.IO connection error', { error: error.message });
  });

  socket.on('disconnect', (reason) => {
    logger.info('Socket.IO disconnected', { reason });
  });

  return socket;
}

/**
 * Get existing Socket.IO instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect and cleanup Socket.IO
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Join delivery partner assignment room (delivery:{partnerId})
 */
export function joinDeliveryRoom(partnerId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket.IO not initialized'));
      return;
    }

    const timer = setTimeout(
      () => reject(new Error('join-delivery-room timed out')),
      5000
    );

    socket.emit(
      'join-delivery-room',
      { partnerId },
      (error?: { code: string; message: string }) => {
        clearTimeout(timer);

        if (error) {
          logger.error('Failed to join delivery room', {
            partnerId,
            error: error.message,
          });
          reject(new Error(error.message));
        } else {
          logger.info('Joined delivery room successfully', { partnerId });
          resolve();
        }
      }
    );
  });
}

/**
 * Leave delivery room
 */
export function leaveDeliveryRoom(partnerId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket.IO not initialized'));
      return;
    }

    const timer = setTimeout(
      () => reject(new Error('leave-delivery-room timed out')),
      5000
    );

    socket.emit(
      'leave-delivery-room',
      { partnerId },
      (error?: { code: string; message: string }) => {
        clearTimeout(timer);

        if (error) {
          logger.error('Failed to leave delivery room', {
            partnerId,
            error: error.message,
          });
          reject(new Error(error.message));
        } else {
          logger.info('Left delivery room successfully', { partnerId });
          resolve();
        }
      }
    );
  });
}

/**
 * Listen for new delivery assignments
 * Event: 'delivery:assigned'
 */
export function onDeliveryAssigned(
  callback: (assignment: SocketAssignmentEvent) => void
): void {
  if (!socket) {
    logger.error('Socket.IO not initialized');
    return;
  }

  socket.on('delivery:assigned', (assignment: SocketAssignmentEvent) => {
    logger.info('New delivery assignment received', {
      orderId: assignment.orderId,
      distanceKm: assignment.distanceKm,
    });
    callback(assignment);
  });
}

/**
 * Remove listener for delivery assignments
 */
export function offDeliveryAssigned(): void {
  if (!socket) return;
  socket.off('delivery:assigned');
}

/**
 * Listen for assignment rejections from other partners
 * Event: 'delivery:assignment-rejected'
 */
export function onAssignmentRejected(
  callback: (data: { orderId: string; reason: string }) => void
): void {
  if (!socket) {
    logger.error('Socket.IO not initialized');
    return;
  }

  socket.on('delivery:assignment-rejected', callback);
}

/**
 * Remove listener for assignment rejections
 */
export function offAssignmentRejected(): void {
  if (!socket) return;
  socket.off('delivery:assignment-rejected');
}

/**
 * Send GPS location to backend
 */
export function sendGPS(partnerId: string, lat: number, lng: number): void {
  if (!socket) {
    logger.error('Socket.IO not initialized');
    return;
  }

  socket.emit(
    'delivery:gps',
    { partnerId, latitude: lat, longitude: lng },
    (error?: { code: string; message: string }) => {
      if (error) {
        logger.error('Failed to send GPS', { error: error.message });
      }
    }
  );
}
