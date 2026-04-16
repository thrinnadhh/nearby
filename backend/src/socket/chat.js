import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Socket.IO Chat Handler
 * Enables real-time pre-order and post-order chat between customers and shops
 * Room: shop:{shopId}:chat
 */

export function registerChat(io, socket) {
  const { userId, role } = socket;

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
  socket.on('send-message', async (data, callback) => {
    const ack = typeof callback === 'function' ? callback : null;
    try {
      const { shopId, orderId, body } = data;

      // Validate inputs
      if (!shopId || !body) {
        const err = { code: 'VALIDATION_ERROR', message: 'shopId and body are required' };
        socket.emit('message-error', err);
        ack?.(err);
        return;
      }

      if (!UUID_REGEX.test(shopId)) {
        const err = { code: 'VALIDATION_ERROR', message: 'shopId must be a valid UUID' };
        socket.emit('message-error', err);
        ack?.(err);
        return;
      }

      // Shop owners can only send messages on behalf of their own shop
      if (role === 'shop_owner' && socket.shopId !== shopId) {
        const err = { code: 'FORBIDDEN', message: 'Cannot send messages on behalf of another shop' };
        socket.emit('message-error', err);
        ack?.(err);
        return;
      }

      if (body.trim().length === 0 || body.length > 2000) {
        const err = { code: 'VALIDATION_ERROR', message: 'Message must be 1–2000 characters' };
        socket.emit('message-error', err);
        ack?.(err);
        return;
      }

      // Determine sender type
      let senderType;
      if (role === 'customer') {
        senderType = 'customer';
      } else if (role === 'shop_owner') {
        senderType = 'shop';
      } else {
        const err = { code: 'FORBIDDEN', message: 'Only customers and shops can send messages' };
        socket.emit('message-error', err);
        ack?.(err);
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
        const err = { code: 'INTERNAL_ERROR', message: 'Failed to send message' };
        socket.emit('message-error', err);
        ack?.(err);
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

      ack?.(null);
    } catch (err) {
      logger.error('send-message handler error', {
        userId,
        error: err.message,
      });
      const errPayload = { code: 'INTERNAL_ERROR', message: 'An error occurred' };
      socket.emit('message-error', errPayload);
      ack?.(errPayload);
    }
  });

  /**
   * join-shop-chat event
   * Join the shop chat room to receive messages
   */
  socket.on('join-shop-chat', async (data, callback) => {
    const ack = typeof callback === 'function' ? callback : null;
    try {
      const { shopId } = data;

      if (!shopId) {
        const err = { code: 'VALIDATION_ERROR', message: 'shopId is required' };
        socket.emit('chat-error', err);
        ack?.(err);
        return;
      }

      if (!UUID_REGEX.test(shopId)) {
        const err = { code: 'VALIDATION_ERROR', message: 'shopId must be a valid UUID' };
        socket.emit('chat-error', err);
        ack?.(err);
        return;
      }

      // Shop owners can only join their own shop's chat room
      if (role === 'shop_owner' && socket.shopId !== shopId) {
        const err = { code: 'FORBIDDEN', message: 'Cannot join another shop\'s chat room' };
        socket.emit('chat-error', err);
        ack?.(err);
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
      ack?.(null);
    } catch (err) {
      logger.error('join-shop-chat handler error', {
        userId,
        error: err.message,
      });
      const errPayload = { code: 'INTERNAL_ERROR', message: 'Failed to join chat' };
      socket.emit('chat-error', errPayload);
      ack?.(errPayload);
    }
  });

  /**
   * leave-shop-chat event
   * Leave the shop chat room
   */
  socket.on('leave-shop-chat', (data, callback) => {
    const ack = typeof callback === 'function' ? callback : null;
    try {
      const { shopId } = data;

      if (!shopId) {
        ack?.(null);
        return;
      }

      socket.leave(`shop:${shopId}:chat`);

      logger.info('User left shop chat', {
        userId,
        shopId,
      });

      socket.emit('left-shop-chat', { shopId });
      ack?.(null);
    } catch (err) {
      logger.error('leave-shop-chat handler error', {
        userId,
        error: err.message,
      });
      ack?.(null); // don't fail leave on error — just proceed
    }
  });
}
