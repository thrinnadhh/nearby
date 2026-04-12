import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';

/**
 * Socket.IO Chat Handler
 * Enables real-time pre-order and post-order chat between customers and shops
 * Room: shop:{shopId}:chat
 */

export function registerChat(io, socket) {
  const { userId, role } = socket.data.user || {};

  if (!userId || !role) {
    logger.warn('Chat handler: unauthenticated socket', { socketId: socket.id });
    return;
  }

  // Customer and shop owner can both initiate chats
  if (!['customer', 'shop_owner'].includes(role)) {
    logger.warn('Chat handler: unauthorized role', {
      role,
      userId,
    });
    return;
  }

  /**
   * send-message event
   * Customer sends message to shop (or vice versa)
   */
  socket.on('send-message', async (data) => {
    try {
      const { shopId, orderId, body } = data;

      // Validate inputs
      if (!shopId || !body) {
        socket.emit('message-error', {
          code: 'VALIDATION_ERROR',
          message: 'shopId and body are required',
        });
        return;
      }

      if (body.trim().length === 0 || body.length > 2000) {
        socket.emit('message-error', {
          code: 'VALIDATION_ERROR',
          message: 'Message must be 1–2000 characters',
        });
        return;
      }

      // Determine sender type
      let senderType;
      if (role === 'customer') {
        senderType = 'customer';
      } else if (role === 'shop_owner') {
        senderType = 'shop';
      } else {
        socket.emit('message-error', {
          code: 'FORBIDDEN',
          message: 'Only customers and shops can send messages',
        });
        return;
      }

      // Insert message into DB
      const messageData = {
        shop_id: shopId,
        customer_id: role === 'customer' ? userId : null,
        order_id: orderId || null,
        sender_type: senderType,
        body: body.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: message, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        logger.error('Failed to save message', {
          shopId,
          userId,
          error: error.message,
        });
        socket.emit('message-error', {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send message',
        });
        return;
      }

      // Broadcast to shop room
      io.to(`shop:${shopId}:chat`).emit('new-message', {
        id: message.id,
        shopId: message.shop_id,
        customerId: message.customer_id,
        orderId: message.order_id,
        senderType: message.sender_type,
        body: message.body,
        createdAt: message.created_at,
      });

      logger.info('Message sent', {
        messageId: message.id,
        shopId,
        senderType,
        userId,
      });
    } catch (err) {
      logger.error('send-message handler error', {
        userId,
        error: err.message,
      });
      socket.emit('message-error', {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred',
      });
    }
  });

  /**
   * join-shop-chat event
   * Join the shop chat room to receive messages
   */
  socket.on('join-shop-chat', async (data) => {
    try {
      const { shopId } = data;

      if (!shopId) {
        socket.emit('chat-error', {
          code: 'VALIDATION_ERROR',
          message: 'shopId is required',
        });
        return;
      }

      // Join the shop chat room
      socket.join(`shop:${shopId}:chat`);

      logger.info('User joined shop chat', {
        userId,
        shopId,
        socketId: socket.id,
      });

      socket.emit('joined-shop-chat', { shopId });
    } catch (err) {
      logger.error('join-shop-chat handler error', {
        userId,
        error: err.message,
      });
      socket.emit('chat-error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to join chat',
      });
    }
  });

  /**
   * leave-shop-chat event
   * Leave the shop chat room
   */
  socket.on('leave-shop-chat', (data) => {
    try {
      const { shopId } = data;

      if (!shopId) return;

      socket.leave(`shop:${shopId}:chat`);

      logger.info('User left shop chat', {
        userId,
        shopId,
      });

      socket.emit('left-shop-chat', { shopId });
    } catch (err) {
      logger.error('leave-shop-chat handler error', {
        userId,
        error: err.message,
      });
    }
  });
}
