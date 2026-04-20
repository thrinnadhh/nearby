/**
 * Chats - Real-time order messaging between customers and shops
 * GET /api/v1/chats/:orderId - Get message thread for an order
 * POST /api/v1/chats - Send a message
 */

import { Router } from 'express';
import Joi from 'joi';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../services/supabase.js';
import { AppError, INTERNAL_ERROR } from '../utils/errors.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ────────────────────────────────────────────────────────────────────────────────
// GET /api/v1/chats/:orderId - Get message thread for an order
// ────────────────────────────────────────────────────────────────────────────────

const getMessagesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

router.get(
  '/:orderId',
  authenticate,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { error: validationError, value } = getMessagesSchema.validate(req.query);

      if (validationError) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', validationError.details[0].message)
        );
      }

      const { page, limit } = value;
      const offset = (page - 1) * limit;

      logger.info('Get messages endpoint called', {
        orderId,
        userId: req.user.userId,
        page,
        limit,
      });

      // Fetch messages for this order
      const { data: messages, count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Get messages endpoint error', {
          error: error.message,
          orderId,
          userId: req.user?.userId,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to fetch messages', 500);
      }

      // Format messages
      const formatted = (messages || []).map((m) => ({
        messageId: m.id,
        senderType: m.sender_type,
        body: m.body,
        createdAt: m.created_at,
        isRead: m.is_read,
      }));

      logger.info('Get messages endpoint success', {
        orderId,
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
        orderId: req.params.orderId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────────
// POST /api/v1/chats - Send a message
// ────────────────────────────────────────────────────────────────────────────────

const sendMessageSchema = Joi.object({
  orderId: Joi.string().uuid().required(),
  message: Joi.string().min(1).max(500).trim().required(),
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
