import { Router } from 'express';
import Joi from 'joi';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { successResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import * as DeliveryService from '../services/delivery.js';

const router = Router();

// 30 delivery-action requests per minute per userId
const deliveryActionLimiter = rateLimit('delivery-action', 30, 60);

const orderParamsSchema = Joi.object({
  orderId: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

// Valid status values for ?status= query filter
const VALID_ORDER_STATUSES = ['assigned', 'picked_up', 'out_for_delivery', 'delivered'];

/**
 * GET /api/v1/delivery/orders
 * List orders assigned to the authenticated delivery partner.
 * Optional ?status= filter (allowlisted to valid enum values).
 */
router.get(
  '/orders',
  authenticate,
  roleGuard(['delivery']),
  deliveryActionLimiter,
  async (req, res, next) => {
    try {
      const rawStatus = req.query.status;
      const statusFilter = rawStatus && VALID_ORDER_STATUSES.includes(rawStatus)
        ? rawStatus
        : null;
      const orders = await DeliveryService.listOrders(req.user.userId, statusFilter);
      return res.status(200).json(successResponse(orders));
    } catch (err) {
      logger.error('delivery: list orders failed', {
        userId: req.user?.userId,
        error: err.message,
      });
      return next(err);
    }
  }
);

/**
 * PATCH /api/v1/delivery/orders/:orderId/accept
 * Acknowledge assignment — confirms awareness, no status change.
 */
router.patch(
  '/orders/:orderId/accept',
  authenticate,
  roleGuard(['delivery']),
  deliveryActionLimiter,
  validate(orderParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const order = await DeliveryService.acceptAssignment(
        req.user.userId,
        req.params.orderId
      );
      return res.status(200).json(successResponse(order));
    } catch (err) {
      logger.error('delivery: accept assignment failed', {
        userId: req.user?.userId,
        orderId: req.params.orderId,
        error: err.message,
      });
      return next(err);
    }
  }
);

/**
 * PATCH /api/v1/delivery/orders/:orderId/reject
 * Reject the assignment — order reverts to 'ready' and is re-queued for re-assignment.
 */
router.patch(
  '/orders/:orderId/reject',
  authenticate,
  roleGuard(['delivery']),
  deliveryActionLimiter,
  validate(orderParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const order = await DeliveryService.rejectAssignment(
        req.user.userId,
        req.params.orderId
      );
      return res.status(200).json(successResponse(order));
    } catch (err) {
      logger.error('delivery: reject assignment failed', {
        userId: req.user?.userId,
        orderId: req.params.orderId,
        error: err.message,
      });
      return next(err);
    }
  }
);

/**
 * PATCH /api/v1/delivery/orders/:orderId/pickup
 * Transition assigned → picked_up.
 */
router.patch(
  '/orders/:orderId/pickup',
  authenticate,
  roleGuard(['delivery']),
  deliveryActionLimiter,
  validate(orderParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const order = await DeliveryService.markPickedUp(
        req.user.userId,
        req.params.orderId
      );
      return res.status(200).json(successResponse(order));
    } catch (err) {
      logger.error('delivery: mark picked up failed', {
        userId: req.user?.userId,
        orderId: req.params.orderId,
        error: err.message,
      });
      return next(err);
    }
  }
);

/**
 * PATCH /api/v1/delivery/orders/:orderId/deliver
 * Transition picked_up|out_for_delivery → delivered.
 */
router.patch(
  '/orders/:orderId/deliver',
  authenticate,
  roleGuard(['delivery']),
  deliveryActionLimiter,
  validate(orderParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const order = await DeliveryService.markDelivered(
        req.user.userId,
        req.params.orderId
      );
      return res.status(200).json(successResponse(order));
    } catch (err) {
      logger.error('delivery: mark delivered failed', {
        userId: req.user?.userId,
        orderId: req.params.orderId,
        error: err.message,
      });
      return next(err);
    }
  }
);

export default router;
