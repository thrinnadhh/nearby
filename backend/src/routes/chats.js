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
  offset: Joi.number().integer().min(0), // Allow offset as alternative to page
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
      const userId = req.user.userId;
      const role = req.user.role;

      logger.info('Get messages endpoint called', {
        orderId,
        userId,
        role,
        page,
        limit,
      });

      // Fetch order to verify authorization
      const orderQuery = await supabase
        .from('orders')
        .select('id, customer_id, shop_id')
        .eq('id', orderId);
      
      const order = Array.isArray(orderQuery.data) ? orderQuery.data[0] : orderQuery.data;

      if (!order) {
        return res.status(404).json(
          errorResponse('ORDER_NOT_FOUND', 'Order not found')
        );
      }

      // Verify authorization - user must be customer or shop owner of this order
      const isAuthorized = (role === 'customer' && userId === order.customer_id) ||
                           (role === 'shop_owner' && userId === order.shop_id);

      if (!isAuthorized) {
        logger.warn('Get messages: Unauthorized access attempt', { orderId, userId, role });
        return res.status(403).json(
          errorResponse('UNAUTHORIZED', 'You are not authorized to view messages for this order')
        );
      }

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

      // Format messages - return with original snake_case field names to match API contract
      const formatted = (messages || []).map((m) => ({
        id: m.id,
        sender_type: m.sender_type,
        body: m.body,
        created_at: m.created_at,
        is_read: m.is_read,
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
      const shopId = req.user.shopId; // For shop_owner role, JWT includes shopId

      logger.info('Send message endpoint called', {
        orderId,
        userId,
        role,
        shopId,
        messageLength: message.length,
      });

      // Get order to find shop and customer
      const queryResult = await supabase
        .from('orders')
        .select('id, shop_id, customer_id')
        .eq('id', orderId);
      
      const order = Array.isArray(queryResult.data) ? queryResult.data[0] : queryResult.data;
      const orderError = !order ? queryResult.error : null;

      if (orderError || !order) {
        logger.warn('Send message: Order not found', { orderId });
        return res.status(404).json(
          errorResponse('ORDER_NOT_FOUND', 'Order not found')
        );
      }

      // Verify user is part of this order
      const isAuthorized = (role === 'customer' && userId === order.customer_id) ||
                           (role === 'shop_owner' && shopId === order.shop_id);

      if (!isAuthorized) {
        logger.warn('Send message: Unauthorized user', { orderId, userId, role });
        return res.status(403).json(
          errorResponse('UNAUTHORIZED', 'You are not authorized to send messages for this order')
        );
      }

      // Create message
      const messageId = uuidv4();
      const insertResult = await supabase
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
        });
      
      const createdMessage = Array.isArray(insertResult.data) ? insertResult.data[0] : insertResult.data;
      const messageError = !createdMessage ? insertResult.error : null;

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
          sender_type: createdMessage.sender_type,
          sender_id: createdMessage.sender_id,
          created_at: createdMessage.created_at,
          is_read: createdMessage.is_read,
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
