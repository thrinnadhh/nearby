/**
 * Socket.IO service for delivery partner — handles real-time assignment events
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants/api';
import { SocketAssignmentEvent } from '@/types/assignment';
import logger from '@/utils/logger';

// Global socket instance
let socket: Socket | null = null;
let deliveryAssignedCallback: ((assignment: SocketAssignmentEvent) => void) | null = null;

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
  deliveryAssignedCallback = null;
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

  deliveryAssignedCallback = callback;

  socket.on('delivery:assigned', (assignment: SocketAssignmentEvent) => {
    logger.info('New delivery assignment received', {
      orderId: assignment.orderId,
      distanceKm: assignment.distanceKm,
    });
    callback(assignment);
  });
}

/**
 * Stop listening for delivery assignments
 */
export function offDeliveryAssigned(): void {
  if (!socket || !deliveryAssignedCallback) {
    return;
  }

  socket.off('delivery:assigned', deliveryAssignedCallback);
  deliveryAssignedCallback = null;
}

/**
 * Accept a delivery assignment
 */
export function emitAcceptAssignment(
  orderId: string,
  callback?: (error?: Error) => void
): void {
  if (!socket) {
    callback?.(new Error('Socket.IO not initialized'));
    return;
  }

  socket.emit('delivery:accept', { orderId }, (response?: {
    success: boolean;
    error?: string;
  }) => {
    if (response?.success) {
      logger.info('Assignment accepted', { orderId });
      callback?.();
    } else {
      logger.error('Failed to accept assignment', {
        orderId,
        error: response?.error,
      });
      callback?.(new Error(response?.error || 'Failed to accept assignment'));
    }
  });
}

/**
 * Reject a delivery assignment
 */
export function emitRejectAssignment(
  orderId: string,
  reason: string,
  callback?: (error?: Error) => void
): void {
  if (!socket) {
    callback?.(new Error('Socket.IO not initialized'));
    return;
  }

  socket.emit(
    'delivery:reject',
    { orderId, reason },
    (response?: { success: boolean; error?: string }) => {
      if (response?.success) {
        logger.info('Assignment rejected', { orderId, reason });
        callback?.();
      } else {
        logger.error('Failed to reject assignment', {
          orderId,
          error: response?.error,
        });
        callback?.(new Error(response?.error || 'Failed to reject assignment'));
      }
    }
  );
}
