import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants/api';
import logger from '@/utils/logger';

/**
 * Socket.IO Client Service for NearBy Customer App
 * Manages connection, authentication, and event listeners
 * Used for real-time chat, order status, GPS tracking, etc.
 */

let socket: Socket | null = null;

/**
 * Initialize Socket.IO connection with JWT auth
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
    logger.info('Socket.IO connected', { socketId: socket?.id });
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
 * Get existing Socket.IO instance (or null if not connected)
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
 * Join shop chat room (pre-order chat)
 * Room naming: shop:{shopId}:chat
 */
export function joinShopChat(shopId: string, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket.IO not initialized'));
      return;
    }

    const timer = setTimeout(
      () => reject(new Error('join-shop-chat timed out')),
      timeoutMs
    );

    socket.emit('join-shop-chat', { shopId }, (error?: { code: string; message: string }) => {
      clearTimeout(timer);
      if (error) {
        logger.error('Failed to join shop chat', { shopId, error });
        reject(new Error(error.message));
      } else {
        logger.info('Joined shop chat', { shopId });
        resolve();
      }
    });
  });
}

/**
 * Leave shop chat room
 */
export function leaveShopChat(shopId: string): void {
  if (!socket) return;

  socket.emit('leave-shop-chat', { shopId }, (error?: { code: string; message: string }) => {
    if (error) {
      logger.error('Failed to leave shop chat', { shopId, error });
    } else {
      logger.info('Left shop chat', { shopId });
    }
  });
}

/**
 * Send message to shop chat
 */
export function sendMessage(shopId: string, body: string, orderId?: string, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket.IO not initialized'));
      return;
    }

    const timer = setTimeout(
      () => reject(new Error('send-message timed out')),
      timeoutMs
    );

    socket.emit(
      'send-message',
      { shopId, body, orderId },
      (error?: { code: string; message: string }) => {
        clearTimeout(timer);
        if (error) {
          logger.error('Failed to send message', { shopId, error });
          reject(new Error(error.message));
        } else {
          logger.info('Message sent', { shopId });
          resolve();
        }
      }
    );
  });
}

/**
 * Register listener for new messages in chat
 */
export function onNewMessage(
  callback: (message: {
    id: string;
    shopId: string;
    customerId: string | null;
    orderId: string | null;
    senderType: 'customer' | 'shop';
    body: string;
    createdAt: string;
  }) => void
): () => void {
  if (!socket) {
    logger.warn('Socket.IO not initialized for onNewMessage');
    return () => {};
  }

  socket.on('new-message', callback);

  // Return unsubscribe function
  return () => {
    if (socket) {
      socket.off('new-message', callback);
    }
  };
}

/**
 * Register listener for chat errors
 */
export function onChatError(
  callback: (error: { code: string; message: string }) => void
): () => void {
  if (!socket) {
    logger.warn('Socket.IO not initialized for onChatError');
    return () => {};
  }

  socket.on('chat-error', callback);
  socket.on('message-error', callback);

  return () => {
    if (socket) {
      socket.off('chat-error', callback);
      socket.off('message-error', callback);
    }
  };
}

/**
 * Register listener for shop status changes (open/close)
 * Emitted when a shop owner toggles their shop status
 */
export function onShopStatusChange(
  callback: (data: {
    shopId: string;
    isOpen: boolean;
    changedAt: string;
  }) => void
): () => void {
  if (!socket) {
    logger.warn('Socket.IO not initialized for onShopStatusChange');
    return () => {};
  }

  socket.on('shop-status-changed', callback);

  return () => {
    if (socket) {
      socket.off('shop-status-changed', callback);
    }
  };
}

/**
 * Register listener for bulk shop status updates
 * Useful when subscribing to a shop category or region
 */
export function onShopStatusBatch(
  callback: (data: {
    updates: Record<string, boolean>;
    updatedAt: string;
  }) => void
): () => void {
  if (!socket) {
    logger.warn('Socket.IO not initialized for onShopStatusBatch');
    return () => {};
  }

  socket.on('shop-status-batch', callback);

  return () => {
    if (socket) {
      socket.off('shop-status-batch', callback);
    }
  };
}
