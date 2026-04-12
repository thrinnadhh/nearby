import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { slowLimiter } from '../middleware/rateLimit.js';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { createReviewSchema } from '../utils/validators.js';
import ReviewService from '../services/reviews.js';

const router = Router();

/**
 * POST /api/v1/reviews
 * Create a review for a delivered order
 * Customer only, rate-limited
 */
router.post(
  '/',
  authenticate,
  roleGuard(['customer']),
  slowLimiter,
  async (req, res, next) => {
    try {
      const { error, value } = createReviewSchema.validate(req.body);
      if (error) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', error.details[0].message)
        );
      }

      const review = await ReviewService.createReview(req.user.userId, value);

      logger.info('Review created via API', {
        reviewId: review.id,
        customerId: req.user.userId,
        orderId: value.order_id,
      });

      return res.status(201).json(successResponse(review));
    } catch (err) {
      logger.error('Create review endpoint error', {
        customerId: req.user?.userId,
        error: err.message,
      });
      return next(err);
    }
  }
);

/**
 * GET /api/v1/shops/:shopId/reviews
 * List reviews for a shop (paginated)
 * Public endpoint, no auth required
 */
router.get('/:shopId/reviews', async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));

    const result = await ReviewService.getReviewsByShop(shopId, {
      page: pageNum,
      limit: limitNum,
    });

    return res.status(200).json(successResponse(result.reviews, result.meta));
  } catch (err) {
    logger.error('Get shop reviews endpoint error', {
      shopId: req.params?.shopId,
      error: err.message,
    });
    return next(err);
  }
});

/**
 * GET /api/v1/shops/:shopId/review-stats
 * Get aggregated review statistics for a shop
 * Public endpoint
 */
router.get('/:shopId/review-stats', async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const stats = await ReviewService.getReviewStats(shopId);
    return res.status(200).json(successResponse(stats));
  } catch (err) {
    logger.error('Get review stats endpoint error', {
      shopId: req.params?.shopId,
      error: err.message,
    });
    return next(err);
  }
});

export default router;
