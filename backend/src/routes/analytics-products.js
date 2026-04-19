/**
 * GET /api/v1/shops/:shopId/analytics/top-products?limit=5&dateRange=30d
 * Get top selling products for a shop with sales metrics
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

const router = Router();

const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(5),
  dateRange: Joi.string().valid('7d', '30d', '90d').default('30d'),
});

/**
 * Helper: Calculate date range for period
 */
function getDateRange(period = '30d') {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const endDate = today.toISOString().split('T')[0];

  let startDate;
  switch (period) {
    case '7d':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case '30d':
    default:
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      break;
    case '90d':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 89);
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate,
  };
}

/**
 * GET /api/v1/shops/:shopId/analytics/top-products
 * Get top selling products by revenue/count
 */
router.get(
  '/:shopId/analytics/top-products',
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

      const { limit, dateRange } = value;

      logger.info('Get top products endpoint called', {
        shopId,
        userId: req.user.userId,
        limit,
        dateRange,
      });

      // 1. Get date range
      const { startDate, endDate } = getDateRange(dateRange);

      // 2. Query order items grouped by product with metrics
      const { data: topProducts, error } = await supabase.rpc(
        'get_top_products',
        {
          p_shop_id: shopId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_limit: limit,
        }
      );

      // Fallback: if RPC doesn't exist, use raw SQL query
      if (error || !topProducts) {
        logger.warn('RPC get_top_products not available, using raw query', {
          shopId,
          error: error?.message,
        });

        // Manual aggregation as fallback
        const { data: orderItems, error: queryError } = await supabase
          .from('order_items')
          .select(
            'product_id, quantity, price_paise, products(id, name, avg_rating)'
          )
          .eq('orders.shop_id', shopId)
          .gte('orders.created_at', `${startDate}T00:00:00Z`)
          .lte('orders.created_at', `${endDate}T23:59:59Z`);

        if (queryError) {
          logger.error('Failed to fetch top products', {
            shopId,
            error: queryError.message,
          });
          throw new AppError(
            INTERNAL_ERROR,
            'Failed to fetch top products',
            500
          );
        }

        // Aggregate in memory
        const productMap = new Map();
        (orderItems || []).forEach((item) => {
          const productId = item.product_id;
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              productId,
              productName: item.products?.name || 'Unknown',
              totalSales: 0,
              totalRevenue: 0,
              avgRating: item.products?.avg_rating || 0,
            });
          }
          const product = productMap.get(productId);
          product.totalSales += item.quantity;
          product.totalRevenue += item.quantity * item.price_paise;
        });

        // Sort by revenue and take top limit
        const sorted = Array.from(productMap.values())
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, limit)
          .map((p) => ({
            ...p,
            totalRevenuePaise: p.totalRevenue,
          }));

        logger.info('Top products endpoint success (fallback)', {
          shopId,
          userId: req.user.userId,
          count: sorted.length,
        });

        return res.status(200).json(successResponse(sorted));
      }

      // Format response
      const formatted = (topProducts || []).map((p) => ({
        productId: p.product_id,
        productName: p.product_name,
        totalSales: p.total_sales,
        totalRevenuePaise: p.total_revenue_paise,
        avgRating: p.avg_rating || 0,
      }));

      logger.info('Top products endpoint success', {
        shopId,
        userId: req.user.userId,
        count: formatted.length,
      });

      res.status(200).json(successResponse(formatted));
    } catch (err) {
      logger.error('Get top products endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

export default router;
