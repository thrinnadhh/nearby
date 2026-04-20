/**
 * GET /api/v1/shops/:shopId/chats?page=1&limit=20
 * Get list of conversations for a shop with most recent messages
 * Requires: Authentication + shop_owner role + ownership of shop
 */

import { Router } from 'express';
import Joi from 'joi';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard, shopOwnerGuard } from '../middleware/roleGuard.js';
import { supabase } from '../services/supabase.js';
import { AppError, INTERNAL_ERROR } from '../utils/errors.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  search: Joi.string().max(100).optional(),
});

/**
 * GET /api/v1/shops/:shopId/chats
 * Get conversations for a shop with pagination
 * Returns: [{ chatId, customerId, customerName, lastMessage, lastMessageTime, messageCount, unreadCount }]
 */
router.get(
  '/:shopId/chats',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { error: validationError, value } = querySchema.validate(req.query);

      if (validationError) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', validationError.details[0].message)
        );
      }

      const { page, limit, search } = value;
      const offset = (page - 1) * limit;

      logger.info('Get chats endpoint called', {
        shopId,
        userId: req.user.userId,
        page,
        limit,
        search,
      });

      // 1. Fetch unique conversations
      // Group by customer_id, get latest message for each
      let query = supabase
        .from('messages')
        .select(
          'id, customer_id, shop_id, body, created_at, is_read, ' +
          'profiles(id, phone, display_name)',
          { count: 'exact' }
        )
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      const { data: allMessages, count, error } = await query;

      if (error) {
        logger.error('Failed to fetch chats', {
          shopId,
          error: error.message,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to fetch chats', 500);
      }

      // 2. Group by customer and extract latest message per customer
      const conversationMap = new Map();
      (allMessages || []).forEach((msg) => {
        const customerId = msg.customer_id;
        if (!conversationMap.has(customerId)) {
          conversationMap.set(customerId, {
            customerId,
            customerName: msg.profiles?.display_name || 'Unknown',
            lastMessage: msg.body,
            lastMessageTime: msg.created_at,
            messageCount: 0,
            unreadCount: 0,
          });
        }
        const conv = conversationMap.get(customerId);
        conv.messageCount += 1;
        if (!msg.is_read) {
          conv.unreadCount += 1;
        }
      });

      // 3. Filter by search if provided
      let conversations = Array.from(conversationMap.values());
      if (search) {
        const searchLower = search.toLowerCase();
        conversations = conversations.filter((c) =>
          c.customerName.toLowerCase().includes(searchLower)
        );
      }

      // 4. Apply pagination
      const totalCount = conversations.length;
      const paginatedConversations = conversations.slice(offset, offset + limit);

      // 5. Generate chat IDs (customer_id is unique per shop)
      const result = paginatedConversations.map((conv) => ({
        chatId: conv.customerId, // Use customer ID as chat ID (unique per shop)
        customerId: conv.customerId,
        customerName: conv.customerName,
        lastMessage: conv.lastMessage?.substring(0, 100) || '',
        lastMessageTime: conv.lastMessageTime,
        messageCount: conv.messageCount,
        unreadCount: conv.unreadCount,
      }));

      logger.info('Get chats endpoint success', {
        shopId,
        userId: req.user.userId,
        page,
        total: totalCount,
        returned: result.length,
      });

      // Format pagination metadata
      const totalPages = Math.ceil(totalCount / limit);

      res.status(200).json(
        successResponse(result, {
          page,
          limit,
          total: totalCount,
          pages: totalPages,
        })
      );
    } catch (err) {
      logger.error('Get chats endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

/**
 * GET /api/v1/shops/:shopId/chats/:customerId/messages?page=1&limit=50
 * Get message history for a specific conversation
 */
const messageQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

router.get(
  '/:shopId/chats/:customerId/messages',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId, customerId } = req.params;
      const { error: validationError, value } = messageQuerySchema.validate(
        req.query
      );

      if (validationError) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', validationError.details[0].message)
        );
      }

      const { page, limit } = value;
      const offset = (page - 1) * limit;

      logger.info('Get chat messages endpoint called', {
        shopId,
        customerId,
        userId: req.user.userId,
        page,
        limit,
      });

      // Fetch messages for this conversation
      const { data: messages, count, error } = await supabase
        .from('messages')
        .select('id, sender_type, body, created_at, is_read', {
          count: 'exact',
        })
        .eq('shop_id', shopId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to fetch messages', {
          shopId,
          customerId,
          error: error.message,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to fetch messages', 500);
      }

      // Mark messages as read
      const unreadIds = (messages || [])
        .filter((m) => !m.is_read && m.sender_type === 'customer')
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }

      const formatted = (messages || [])
        .reverse()
        .map((m) => ({
          messageId: m.id,
          senderType: m.sender_type,
          body: m.body,
          createdAt: m.created_at,
          isRead: m.is_read,
        }));

      logger.info('Get messages endpoint success', {
        shopId,
        customerId,
        userId: req.user.userId,
        returned: formatted.length,
        total: count,
      });

      const totalPages = Math.ceil((count || 0) / limit);

      res.status(200).json(
        successResponse(formatted, {
          page,
          limit,
          total: count,
          pages: totalPages,
        })
      );
    } catch (err) {
      logger.error('Get messages endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        customerId: req.params.customerId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────────
// POST /api/v1/chats
// Send a message (customer or shop owner)
// ────────────────────────────────────────────────────────────────────────────────

const sendMessageSchema = Joi.object({
  orderId: Joi.string().uuid().required(),
  message: Joi.string().min(1).max(500).required(),
});

router.post(
  '/',
  authenticate,
  async (req, res, next) => {
    try {
      const { error: validationError, value } = sendMessageSchema.validate(req.body);
      if (validationError) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', validationError.details[0].message)
        );
      }

      const { orderId, message } = value;
      const userId = req.user.userId;
      const role = req.user.role;

      logger.info('Send message endpoint called', {
        orderId,
        userId,
        role,
        messageLength: message.length,
      });

      // Get order to find shop and customer
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, shop_id, customer_id')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        logger.warn('Send message: Order not found', { orderId });
        return res.status(404).json(
          errorResponse('ORDER_NOT_FOUND', 'Order not found')
        );
      }

      // Verify user is part of this order
      const isAuthorized = (role === 'customer' && userId === order.customer_id) ||
                           (role === 'shop_owner' && userId === order.shop_id);

      if (!isAuthorized) {
        logger.warn('Send message: Unauthorized user', { orderId, userId, role });
        return res.status(403).json(
          errorResponse('UNAUTHORIZED', 'You are not authorized to send messages for this order')
        );
      }

      // Create message
      const messageId = uuidv4();
      const { data: createdMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          order_id: orderId,
          shop_id: order.shop_id,
          customer_id: order.customer_id,
          sender_type: role === 'customer' ? 'customer' : 'shop',
          sender_id: userId,
          body: message,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (messageError) {
        logger.error('Send message: Failed to create message', {
          error: messageError.message,
          orderId,
          userId,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to send message', 500);
      }

      logger.info('Send message endpoint success', {
        orderId,
        userId,
        messageId,
      });

      res.status(201).json(
        successResponse({
          id: createdMessage.id,
          message: createdMessage.body,
          createdAt: createdMessage.created_at,
        })
      );
    } catch (err) {
      logger.error('Send message endpoint error', {
        error: err.message,
        orderId: req.body?.orderId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

export default router;
