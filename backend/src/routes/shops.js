import { Router } from 'express';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard, shopOwnerGuard } from '../middleware/roleGuard.js';
import { rateLimit } from '../middleware/rateLimit.js';
import upload from '../middleware/multer.js';
import { validate } from '../middleware/validate.js';
import ReviewService from '../services/reviews.js';
import {
  createShopSchema,
  updateShopSchema,
  toggleShopSchema,
} from '../utils/validators.js';
import ShopService from '../services/shops.js';
import { broadcastShopStatusChange } from '../socket/index.js';
import { getRealtimeServer } from '../socket/ioRegistry.js';

const router = Router();

/**
 * POST /api/v1/shops
 * Create a new shop for the authenticated shop owner.
 * Requires: Authentication + shop_owner role
 * Request body:
 *   {
 *     name: string (3-100),
 *     description: string (10-500),
 *     latitude: number (8-35),
 *     longitude: number (68-97),
 *     category: enum,
 *     phone?: string (+91XXXXXXXXXX)
 *   }
 * Response: 201 with created shop object
 */
router.post('/', authenticate, roleGuard(['shop_owner']), async (req, res, next) => {
  try {
    // 1. Validate request body
    const { error, value } = createShopSchema.validate(req.body);
    if (error) {
      logger.warn('Create shop validation failed', {
        error: error.message,
        userId: req.user.userId,
      });
      return res.status(400).json(
        errorResponse('VALIDATION_ERROR', error.details[0].message)
      );
    }

    // 2. Call service to create shop
    const shop = await ShopService.create(req.user.userId, value);

    // 3. Return 201 with created shop
    logger.info('Shop creation endpoint success', {
      shopId: shop.id,
      userId: req.user.userId,
    });

    res.status(201).json(successResponse(shop));
  } catch (err) {
    // 4. Forward error to error handler middleware
    logger.error('Create shop endpoint error', {
      error: err.message,
      userId: req.user?.userId,
    });
    next(err);
  }
});

/**
 * GET /api/v1/shops/:shopId
 * Retrieve full shop profile for authenticated owner.
 * Requires: Authentication + shop_owner role + ownership of shop
 * Response: 200 with shop object containing all readable fields
 */
router.get(
  '/:shopId',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;

      // 1. Call service to retrieve shop
      const shop = await ShopService.getShop(req.user.userId, shopId);

      // 2. Return 200 with shop object
      logger.info('Get shop endpoint success', {
        shopId,
        userId: req.user.userId,
      });

      res.status(200).json(successResponse(shop));
    } catch (err) {
      // 3. Forward error to error handler middleware
      logger.error('Get shop endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/shops/:shopId
 * Update mutable shop profile fields for authenticated owner.
 * Requires: Authentication + shop_owner role + ownership of shop
 * Request body:
 *   {
 *     name?: string (3-100),
 *     description?: string (10-500),
 *     category?: enum,
 *     phone?: string (+91XXXXXXXXXX) or null
 *   }
 * Response: 200 with updated shop object
 */
router.patch(
  '/:shopId',
  authenticate,
  roleGuard(['shop_owner']),
  validate(updateShopSchema, 'body'),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      // Body is already validated and sanitized by validate middleware
      const value = req.body;

      // 1. Call service to update shop
      const updatedShop = await ShopService.updateShop(
        req.user.userId,
        shopId,
        value
      );

      // 2. Return 200 with updated shop
      logger.info('Update shop endpoint success', {
        shopId,
        userId: req.user.userId,
        fieldsUpdated: Object.keys(value),
      });

      res.status(200).json(successResponse(updatedShop));
    } catch (err) {
      // 3. Forward error to error handler middleware
      logger.error('Update shop endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/shops/:shopId/toggle
 * Toggle shop open/close status for authenticated owner.
 * Requires: Authentication + shop_owner role + ownership of shop
 * Request body: Empty (no fields required)
 * Response: 200 with updated shop object showing toggled is_open status
 * Side effects: 
 *   - Queues async Typesense sync job (sync if opening, remove if closing)
 *   - Broadcasts shop status change to all connected customers via Socket.IO
 */
router.patch(
  '/:shopId/toggle',
  authenticate,
  roleGuard(['shop_owner']),
  rateLimit('shop-toggle', { max: 10, window: 60 }),
  validate(toggleShopSchema, 'body'),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;

      // 1. Call service to toggle shop status
      const updatedShop = await ShopService.toggleShop(
        req.user.userId,
        shopId
      );

      // 2. Broadcast status change to all connected customers
      const io = getRealtimeServer();
      if (io) {
        broadcastShopStatusChange(io, shopId, updatedShop.isOpen);
      }

      // 3. Return 200 with updated shop
      logger.info('Toggle shop endpoint success', {
        shopId,
        userId: req.user.userId,
        newStatus: updatedShop.isOpen ? 'open' : 'closed',
      });

      res.status(200).json(successResponse(updatedShop));
    } catch (err) {
      // 4. Forward error to error handler middleware
      logger.error('Toggle shop endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

/**
 * Middleware to check file existence before shop ownership validation.
 * This ensures "no file" returns 400, not 404 when shop doesn't exist.
 */
const checkFileExists = (req, res, next) => {
  if (!req.file) {
    logger.warn('KYC upload: No file in request', {
      shopId: req.params.shopId,
      userId: req.user?.userId,
    });
    return res.status(400).json(
      errorResponse('INVALID_FILE_TYPE', 'No file provided. Please upload a PDF document.')
    );
  }
  next();
};

/**
 * POST /api/v1/shops/:shopId/kyc
 * Upload KYC document for a shop.
 * Requires: Authentication + shop_owner role + ownership of shop
 * Rate limited: 10 uploads per hour per user
 * Request: multipart/form-data with 'document' field (PDF, 1-10 MB)
 * Headers: idempotency-key (UUID) for deduplication
 * Response: 201 with KYC status and signed URL
 */
router.post(
  '/:shopId/kyc',
  authenticate,
  rateLimit('kyc-upload', 10, 3600),
  upload.single('document'),
  roleGuard(['shop_owner']),
  checkFileExists,
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const idempotencyKey = req.headers['idempotency-key'];

      logger.debug('KYC upload request received', {
        shopId,
        userId: req.user.userId,
        hasFile: !!req.file,
        hasIdempotencyKey: !!idempotencyKey,
      });

      // 1. Call service to upload KYC
      const result = await ShopService.uploadKYC(
        req.user.userId,
        shopId,
        req.file,
        idempotencyKey
      );

      // 2. Return 201 with KYC response
      logger.info('KYC upload endpoint success', {
        shopId,
        userId: req.user.userId,
        kycStatus: result.kycStatus,
      });

      res.status(201).json(successResponse(result));
    } catch (err) {
      // 3. Forward error to error handler middleware
      logger.error('KYC upload endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

/**
 * GET /api/v1/shops/:shopId/reviews
 * List reviews for a shop (paginated). Public endpoint.
 */
router.get('/:shopId/reviews', async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));
    const result = await ReviewService.getReviewsByShop(shopId, { page: pageNum, limit: limitNum });
    return res.status(200).json(successResponse(result.reviews, result.meta));
  } catch (err) {
    logger.error('Get shop reviews endpoint error', { shopId: req.params?.shopId, error: err.message });
    return next(err);
  }
});

/**
 * GET /api/v1/shops/:shopId/review-stats
 * Get aggregated review statistics for a shop. Public endpoint.
 */
router.get('/:shopId/review-stats', async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const stats = await ReviewService.getReviewStats(shopId);
    return res.status(200).json(successResponse(stats));
  } catch (err) {
    logger.error('Get review stats endpoint error', { shopId: req.params?.shopId, error: err.message });
    return next(err);
  }
});

export default router;
