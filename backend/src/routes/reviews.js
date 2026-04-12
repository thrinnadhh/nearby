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

export default router;
