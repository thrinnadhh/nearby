/**
 * GET /api/v1/shops/:shopId/analytics
 * Get earnings and analytics for a shop over a date range
 * Aggregates daily analytics into today/week/month periods with summary totals
 * Requires: Authentication + shop_owner role + ownership of shop
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
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

/**
 * GET /api/v1/shops/:shopId/earnings
 * Get earnings summary for a shop with optional date filtering
 */
router.get(
  '/:shopId/earnings',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { date_from, date_to } = req.query;

      // shopOwnerGuard already verified ownership, just get the orders
      let query = supabase
        .from('orders')
        .select('*')
        .eq('shop_id', shopId)
        .eq('status', 'delivered');

      if (date_from) {
        const fromDate = new Date(date_from);
        if (!isNaN(fromDate.getTime())) {
          query = query.gte('created_at', date_from);
        }
      }

      if (date_to) {
        const toDate = new Date(date_to);
        if (!isNaN(toDate.getTime())) {
          query = query.lte('created_at', date_to);
        }
      }

      const { data: ordersData } = await query;
      const orders = ordersData || [];

      // Calculate earnings
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total_paise || 0), 0);
      const commission = Math.floor(totalRevenue * 0.1); // 10% commission
      const netRevenue = totalRevenue - commission;

      const response = {
        shop_id: shopId,
        gross_revenue_paise: totalRevenue,
        commission_paise: commission,
        net_revenue_paise: netRevenue,
        total_orders: orders.length,
        completed_orders: orders.filter(o => o.status === 'delivered').length,
        cancelled_orders: orders.filter(o => o.status === 'cancelled').length,
        created_at: new Date().toISOString(),
      };

      logger.info('Get earnings success', {
        shopId,
        userId: req.user.userId,
        totalOrders: orders.length,
        netRevenue,
      });

      res.status(200).json(successResponse(response));
    } catch (err) {
      logger.error('Get earnings error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

/**
 * GET /api/v1/shops/:shopId/earnings/weekly
 * Get weekly earnings breakdown
 */
router.get(
  '/:shopId/earnings/weekly',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // shopOwnerGuard already verified ownership
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', shopId)
        .eq('status', 'delivered');

      const orders = ordersData || [];

      // Group by week
      const weeks = {};
      orders.forEach((order) => {
        const date = new Date(order.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeks[weekKey]) {
          weeks[weekKey] = [];
        }
        weeks[weekKey].push(order);
      });

      // Calculate weekly summaries
      const weeklySummaries = Object.entries(weeks)
        .map(([weekStart, weekOrders]) => {
          const totalRevenue = weekOrders.reduce((sum, o) => sum + (o.total_paise || 0), 0);
          const commission = Math.floor(totalRevenue * 0.1);
          return {
            week_start_date: weekStart,
            gross_revenue_paise: totalRevenue,
            commission_paise: commission,
            net_revenue_paise: totalRevenue - commission,
            total_orders: weekOrders.length,
            completed_orders: weekOrders.filter(o => o.status === 'delivered').length,
          };
        })
        .sort((a, b) => new Date(b.week_start_date) - new Date(a.week_start_date));

      // Paginate
      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 10;
      const startIdx = (pageNum - 1) * pageSize;
      const paginatedWeeks = weeklySummaries.slice(startIdx, startIdx + pageSize);

      const response = {
        shop_id: shopId,
        weeks: paginatedWeeks,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: weeklySummaries.length,
        },
      };

      logger.info('Get weekly earnings success', {
        shopId,
        userId: req.user.userId,
        weeks: weeklySummaries.length,
      });

      res.status(200).json(successResponse(response));
    } catch (err) {
      logger.error('Get weekly earnings error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

/**
 * POST /api/v1/shops/:shopId/earnings/withdraw
 * Initiate a withdrawal request
 */
router.post(
  '/:shopId/earnings/withdraw',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { amount_paise } = req.body;

      // Validate amount
      if (!amount_paise) {
        return res.status(400).json(
          errorResponse('INVALID_REQUEST', 'amount_paise is required')
        );
      }

      if (typeof amount_paise !== 'number' || amount_paise <= 0) {
        return res.status(400).json(
          errorResponse('INVALID_AMOUNT', 'amount_paise must be a positive number')
        );
      }

      // shopOwnerGuard already verified ownership, just get shop for bank details
      const { data: shop } = await supabase
        .from('shops')
        .select('id, bank_account_number')
        .eq('id', shopId)
        .single();

      // Check if bank account is linked
      if (!shop || !shop.bank_account_number) {
        return res.status(422).json(
          errorResponse('NO_BANK_ACCOUNT', 'Bank account must be linked before withdrawal')
        );
      }

      // Get earnings
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', shopId)
        .eq('status', 'delivered');

      const orders = ordersData || [];

      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_paise || 0), 0);
      const totalCommission = Math.floor(totalRevenue * 0.1);
      const availableBalance = totalRevenue - totalCommission;

      // Check minimum amount
      const minimumWithdrawal = 10000; // ₹100 minimum
      if (amount_paise < minimumWithdrawal) {
        return res.status(422).json(
          errorResponse('MINIMUM_WITHDRAWAL', `Minimum withdrawal amount is ₹${minimumWithdrawal / 100}`)
        );
      }

      // Check balance
      if (amount_paise > availableBalance) {
        return res.status(422).json(
          errorResponse('INSUFFICIENT_BALANCE', 'Insufficient balance for withdrawal')
        );
      }

      // Create withdrawal record
      const withdrawalId = uuidv4();
      const { data: withdrawal, error: withdrawError } = await supabase
        .from('withdrawals')
        .insert({
          id: withdrawalId,
          shop_id: shopId,
          amount_paise: amount_paise,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .single();

      if (withdrawError) {
        logger.error('Withdrawal creation error', {
          error: withdrawError.message,
          shopId,
        });
        return res.status(500).json(
          errorResponse('WITHDRAWAL_ERROR', 'Failed to create withdrawal request')
        );
      }

      logger.info('Withdrawal initiated', {
        shopId,
        userId: req.user.userId,
        amount: amount_paise,
        withdrawalId,
      });

      res.status(201).json(successResponse({
        withdrawal_id: withdrawalId,
        amount_paise: amount_paise,
        status: 'pending',
        shop_id: shopId,
      }));
    } catch (err) {
      logger.error('Withdrawal error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

export default router;
