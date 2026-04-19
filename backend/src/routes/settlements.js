/**
 * Settlements routes
 * GET /api/v1/shops/:shopId/settlements - List all settlements with pagination
 * Requires: Authentication + shop_owner role + ownership of shop
 */

import { Router } from 'express';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard, shopOwnerGuard } from '../middleware/roleGuard.js';
import { supabase } from '../services/supabase.js';
import { AppError, INTERNAL_ERROR } from '../utils/errors.js';

const router = Router();

/**
 * GET /api/v1/shops/:shopId/settlements?page=1&limit=20
 * Retrieve settlement history for a shop
 * Returns paginated list of settlements with metadata
 */
router.get(
  '/:shopId/settlements',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);

      logger.info('Get settlements endpoint called', {
        shopId,
        userId: req.user.userId,
        page,
        limit,
      });

      // 1. Validate pagination params
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json(
          errorResponse(
            'INVALID_PAGINATION',
            'page >= 1, 1 <= limit <= 100'
          )
        );
      }

      // 2. Query settlements from Supabase
      const offset = (page - 1) * limit;

      // Get total count
      const { count: total, error: countError } = await supabase
        .from('settlements')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shopId);

      if (countError) {
        logger.error('Failed to count settlements', {
          shopId,
          error: countError.message,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to fetch settlements', 500);
      }

      // Get paginated settlements
      const { data: records, error } = await supabase
        .from('settlements')
        .select(
          'id, shop_id, amount, currency, status, utr_number, ' +
          'settlement_date, initiated_at, completed_at, failure_reason, ' +
          'period_start_date, period_end_date, net_amount, gross_amount, ' +
          'commission, fees'
        )
        .eq('shop_id', shopId)
        .order('initiated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to fetch settlements', {
          shopId,
          error: error.message,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to fetch settlements', 500);
      }

      // 3. Format response
      const settlements = (records || []).map((s) => ({
        id: s.id,
        amount: s.amount,
        status: s.status,
        utrNumber: s.utr_number,
        settlementDate: s.settlement_date,
        initiatedAt: s.initiated_at,
        completedAt: s.completed_at,
        periodStartDate: s.period_start_date,
        periodEndDate: s.period_end_date,
        netAmount: s.net_amount,
        grossAmount: s.gross_amount,
        commission: s.commission,
        fees: s.fees,
      }));

      const pages = Math.ceil((total || 0) / limit);

      logger.info('Settlements endpoint success', {
        shopId,
        userId: req.user.userId,
        count: settlements.length,
        total,
        page,
        pages,
      });

      res.status(200).json(
        successResponse({
          data: settlements,
          meta: {
            page,
            limit,
            total: total || 0,
            pages,
          },
        })
      );
    } catch (err) {
      logger.error('Get settlements endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

export default router;
