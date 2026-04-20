/**
 * useChatSocket hook for Task 12.11
 * Manages Socket.IO connection for real-time messaging
 */

import { useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { ChatMessage, SendMessageData } from '@/types/chat';
import logger from '@/utils/logger';
import io, { Socket } from 'socket.io-client';

interface UseChatSocketResult {
  socketConnected: boolean;
  sendMessage: (data: SendMessageData) => void;
  reconnect: () => void;
}

// Socket instance (singleton to prevent multiple connections)
let socketInstance: Socket | null = null;

/** Reset socket instance — used in tests to prevent stale singleton across test runs */
export function _resetSocketInstance(): void {
  socketInstance = null;
}

export function useChatSocket(shopId?: string): UseChatSocketResult {
  const userId = useAuthStore((s) => s.userId);
  const token = useAuthStore((s) => s.token);
  const socketConnected = useChatStore((s) => s.socketConnected);
  const addMessage = useChatStore((s) => s.addMessage);
  const setSocketConnected = useChatStore((s) => s.setSocketConnected);
  const socketRef = useRef<Socket | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!shopId || !userId || !token) {
      logger.warn('Missing required params for socket connection', {
        hasShopId: !!shopId,
        hasUserId: !!userId,
        hasToken: !!token,
      });
      return;
    }

    // Reuse existing socket or create new one
    if (socketInstance && socketInstance.connected) {
      socketRef.current = socketInstance;
      setSocketConnected(true);
      logger.info('Reusing existing socket connection');
      return;
    }

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

    const socket = io(socketUrl, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket'],
    });

    socketRef.current = socket;
    socketInstance = socket;

    socket.on('connect', () => {
      logger.info('Socket.IO connected', { socketId: socket.id });
      setSocketConnected(true);

      // Join shop chat room
      socket.emit('join-chat', { shopId });
    });

    socket.on('disconnect', () => {
      logger.warn('Socket.IO disconnected');
      setSocketConnected(false);
    });

    socket.on('receive-message', (message: ChatMessage) => {
      logger.debug('Message received from socket', {
        senderType: message.senderType,
      });
      addMessage(message);
    });

    socket.on('message-error', (error: any) => {
      logger.error('Socket message error', {
        code: error.code,
        message: error.message,
      });
    });

    socket.on('connect_error', (error) => {
      logger.error('Socket.IO connection error', {
        error: error.message,
      });
      setSocketConnected(false);
    });

    return () => {
      // Don't disconnect on unmount to keep connection alive for other components
      logger.debug('Chat socket hook unmounted, keeping connection alive');
    };
  }, [shopId, userId, token, setSocketConnected, addMessage]);

  const sendMessage = useCallback(
    (data: SendMessageData) => {
      if (!socketRef.current || !socketRef.current.connected) {
        logger.warn('Socket not connected, cannot send message');
        return;
      }

      logger.debug('Sending message via socket', {
        shopId: data.shopId,
      });

      socketRef.current.emit('send-message', data, (ack?: any) => {
        if (ack?.code) {
          logger.error('Message send failed', {
            code: ack.code,
            message: ack.message,
          });
        } else {
          logger.info('Message sent successfully');
        }
      });
    },
    []
  );

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      logger.info('Attempting socket reconnection');
      socketRef.current.connect();
    }
  }, []);

  return {
    socketConnected,
    sendMessage,
    reconnect,
  };
}
