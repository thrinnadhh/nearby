import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validate.js';
import { errorResponse, successResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { createOrderSchema, partialCancelOrderSchema } from '../utils/validators.js';
import OrderService from '../services/orders.js';
import { checkIdempotencyKey, setIdempotencyKey } from '../utils/idempotency.js';

const router = Router();

router.post(
  '/',
  authenticate,
  roleGuard(['customer']),
  validate(createOrderSchema),
  async (req, res, next) => {
    try {
      const idempotencyKey = req.headers['idempotency-key'];
      const customerId = req.user.userId;

      if (idempotencyKey) {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(idempotencyKey)) {
          return res.status(400).json(
            errorResponse('VALIDATION_ERROR', 'idempotency-key must be a valid UUID v4.')
          );
        }

        const cacheKey = `orders:idempotency:${customerId}:${idempotencyKey}`;
        const cachedOrder = await checkIdempotencyKey(cacheKey);
        if (cachedOrder) {
          logger.info('Order idempotency hit', { customerId, idempotencyKey });
          return res.status(200).json(successResponse(cachedOrder));
        }
      }

      const order = await OrderService.createOrder(customerId, req.body, {
        idempotencyKey: idempotencyKey || null,
      });

      if (idempotencyKey) {
        const cacheKey = `orders:idempotency:${customerId}:${idempotencyKey}`;
        await setIdempotencyKey(cacheKey, order);
      }

      logger.info('Order created', {
        orderId: order.id,
        customerId,
        shopId: order.shopId,
      });
      return res.status(201).json(successResponse(order));
    } catch (error) {
      logger.error('Create order endpoint error', {
        customerId: req.user?.userId,
        error: error.message,
      });
      return next(error);
    }
  }
);

router.get(
  '/',
  authenticate,
  roleGuard(['customer', 'shop_owner']),
  async (req, res, next) => {
    try {
      const orders = await OrderService.listOrders(req.user);
      return res.status(200).json(successResponse(orders));
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  '/:orderId',
  authenticate,
  roleGuard(['customer', 'shop_owner']),
  async (req, res, next) => {
    try {
      const order = await OrderService.getOrder(req.user, req.params.orderId);
      return res.status(200).json(successResponse(order));
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  '/:orderId/accept',
  authenticate,
  roleGuard(['shop_owner']),
  async (req, res, next) => {
    try {
      const order = await OrderService.acceptOrder(req.user, req.params.orderId);
      return res.status(200).json(successResponse(order));
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  '/:orderId/reject',
  authenticate,
  roleGuard(['shop_owner']),
  async (req, res, next) => {
    try {
      const order = await OrderService.rejectOrder(req.user, req.params.orderId);
      return res.status(200).json(successResponse(order));
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  '/:orderId/partial-cancel',
  authenticate,
  roleGuard(['shop_owner']),
  validate(partialCancelOrderSchema),
  async (req, res, next) => {
    try {
      const order = await OrderService.partialCancelItems(req.user, req.params.orderId, req.body);
      return res.status(200).json(successResponse(order));
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  '/:orderId/ready',
  authenticate,
  roleGuard(['shop_owner']),
  async (req, res, next) => {
    try {
      const order = await OrderService.markReady(req.user, req.params.orderId);
      return res.status(200).json(successResponse(order));
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  '/:orderId/cancel',
  authenticate,
  roleGuard(['customer']),
  async (req, res, next) => {
    try {
      const order = await OrderService.cancelOrder(req.user, req.params.orderId);
      return res.status(200).json(successResponse(order));
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
