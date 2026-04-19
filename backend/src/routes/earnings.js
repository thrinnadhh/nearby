/**
 * GET /api/v1/shops/:shopId/analytics
 * Get earnings and analytics for a shop over a date range
 * Aggregates daily analytics into today/week/month periods with summary totals
 * Requires: Authentication + shop_owner role + ownership of shop
 */

import { Router } from 'express';
import logger from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard, shopOwnerGuard } from '../middleware/roleGuard.js';
import AnalyticsService from '../services/analytics.js';
import { supabase } from '../services/supabase.js';
import { AppError, INTERNAL_ERROR } from '../utils/errors.js';

const router = Router();

/**
 * Helper: Get start of today (IST)
 */
function getTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(now.getTime() + istOffset);
  istTime.setUTCHours(0, 0, 0, 0);
  return new Date(istTime.getTime() - istOffset);
}

/**
 * Helper: Calculate date range for period
 * Returns { startDate, endDate } as YYYY-MM-DD strings
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
 * Helper: Group analytics records by date period
 */
function groupByPeriod(records, endDate) {
  const today = [];
  const week = [];
  const month = [];

  const endDateTime = new Date(`${endDate}T23:59:59Z`);
  const weekStart = new Date(endDateTime);
  weekStart.setDate(weekStart.getDate() - 6);

  records.forEach((record) => {
    const recordDate = new Date(`${record.date}T00:00:00Z`);

    if (record.date === endDate) {
      today.push(record);
    }

    if (recordDate >= weekStart && recordDate <= endDateTime) {
      week.push(record);
    }

    month.push(record);
  });

  return { today: today[0] || null, week, month };
}

/**
 * Helper: Calculate summary statistics
 */
function calculateSummary(records, endDate) {
  const endDateTime = new Date(`${endDate}T23:59:59Z`);
  const weekStart = new Date(endDateTime);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(endDateTime);
  monthStart.setDate(monthStart.getDate() - 29);

  const today = [];
  const week = [];
  const month = [];
  const previousDay = [];
  const previousWeek = [];
  const previousMonth = [];

  const todayDate = endDate;
  const previousDayDate = new Date(endDateTime);
  previousDayDate.setDate(previousDayDate.getDate() - 1);
  const previousDayStr = previousDayDate.toISOString().split('T')[0];

  const weekStartDate = new Date(weekStart);
  const previousWeekStart = new Date(weekStartDate);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(weekStartDate);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);

  const monthStartDate = new Date(monthStart);
  const previousMonthStart = new Date(monthStartDate);
  previousMonthStart.setDate(previousMonthStart.getDate() - 30);
  const previousMonthEnd = new Date(monthStartDate);
  previousMonthEnd.setDate(previousMonthEnd.getDate() - 1);

  records.forEach((record) => {
    const recordDate = new Date(`${record.date}T00:00:00Z`);

    if (record.date === todayDate) {
      today.push(record);
    }

    if (record.date === previousDayStr) {
      previousDay.push(record);
    }

    if (recordDate >= weekStart && recordDate <= endDateTime) {
      week.push(record);
    }

    if (
      recordDate >= previousWeekStart &&
      recordDate <= previousWeekEnd
    ) {
      previousWeek.push(record);
    }

    if (recordDate >= monthStart && recordDate <= endDateTime) {
      month.push(record);
    }

    if (
      recordDate >= previousMonthStart &&
      recordDate <= previousMonthEnd
    ) {
      previousMonth.push(record);
    }
  });

  const sumRevenue = (arr) =>
    arr.reduce((sum, r) => sum + (r.net_revenue_paise || 0), 0);

  return {
    today_total: sumRevenue(today),
    week_total: sumRevenue(week),
    month_total: sumRevenue(month),
    previous_day_total: sumRevenue(previousDay),
    previous_week_total: sumRevenue(previousWeek),
    previous_month_total: sumRevenue(previousMonth),
  };
}

/**
 * GET /api/v1/shops/:shopId/analytics
 * Get analytics for a shop
 * Query params: dateRange (7d | 30d | 90d, default 30d)
 */
router.get(
  '/:shopId/analytics',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { dateRange = '30d' } = req.query;

      logger.info('Get analytics endpoint called', {
        shopId,
        userId: req.user.userId,
        dateRange,
      });

      // 1. Validate dateRange
      if (!['7d', '30d', '90d'].includes(dateRange)) {
        return res.status(400).json(
          errorResponse('INVALID_DATE_RANGE', 'dateRange must be 7d, 30d, or 90d')
        );
      }

      // 2. Get date range
      const { startDate, endDate } = getDateRange(dateRange);

      // 3. Fetch analytics from Supabase
      const { data: records, error } = await supabase
        .from('shop_analytics')
        .select(
          'id, date, gross_revenue_paise, net_revenue_paise, ' +
          'total_orders, completed_orders, cancelled_orders, ' +
          'completion_rate, review_count, avg_rating, ' +
          'avg_acceptance_time_seconds, avg_preparation_time_seconds, ' +
          'unique_customers'
        )
        .eq('shop_id', shopId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) {
        logger.error('Failed to fetch shop analytics', {
          shopId,
          error: error.message,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to fetch analytics', 500);
      }

      // 4. Group records by period
      const { today, week, month } = groupByPeriod(records || [], endDate);

      // 5. Calculate summary statistics
      const summary = calculateSummary(records || [], endDate);

      // 6. Format response
      const response = {
        today: today
          ? {
            date: today.date,
            netRevenuePaise: today.net_revenue_paise,
            grossRevenuePaise: today.gross_revenue_paise,
            totalOrders: today.total_orders,
            completedOrders: today.completed_orders,
            cancelledOrders: today.cancelled_orders,
            completionRate: today.completion_rate,
            avgAcceptanceTimeSeconds: today.avg_acceptance_time_seconds,
            avgPreparationTimeSeconds: today.avg_preparation_time_seconds,
            reviewCount: today.review_count,
            avgRating: today.avg_rating,
            uniqueCustomers: today.unique_customers,
          }
          : null,
        week: (week || []).map((r) => ({
          date: r.date,
          netRevenuePaise: r.net_revenue_paise,
          grossRevenuePaise: r.gross_revenue_paise,
          totalOrders: r.total_orders,
          completedOrders: r.completed_orders,
          cancelledOrders: r.cancelled_orders,
          completionRate: r.completion_rate,
          avgAcceptanceTimeSeconds: r.avg_acceptance_time_seconds,
          avgPreparationTimeSeconds: r.avg_preparation_time_seconds,
          reviewCount: r.review_count,
          avgRating: r.avg_rating,
          uniqueCustomers: r.unique_customers,
        })),
        month: (month || []).map((r) => ({
          date: r.date,
          netRevenuePaise: r.net_revenue_paise,
          grossRevenuePaise: r.gross_revenue_paise,
          totalOrders: r.total_orders,
          completedOrders: r.completed_orders,
          cancelledOrders: r.cancelled_orders,
          completionRate: r.completion_rate,
          avgAcceptanceTimeSeconds: r.avg_acceptance_time_seconds,
          avgPreparationTimeSeconds: r.avg_preparation_time_seconds,
          reviewCount: r.review_count,
          avgRating: r.avg_rating,
          uniqueCustomers: r.unique_customers,
        })),
        summary,
      };

      logger.info('Analytics endpoint success', {
        shopId,
        userId: req.user.userId,
        recordCount: (records || []).length,
      });

      res.status(200).json(successResponse(response));
    } catch (err) {
      logger.error('Get analytics endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

export default router;
