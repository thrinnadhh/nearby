import { supabase } from './supabase.js';
import logger from '../utils/logger.js';
import { AppError, INTERNAL_ERROR } from '../utils/errors.js';

/**
 * Analytics Service
 * Aggregates daily shop metrics from orders, reviews, and delivery data
 * Runs nightly via BullMQ analytics-aggregate job
 */

class AnalyticsService {
  /**
   * Calculate daily analytics for a shop
   * Aggregates: order counts, revenue, completion rate, ratings, unique customers
   * @param {string} shopId - Shop ID
   * @param {Date} date - Date to aggregate (default: yesterday)
   * @returns {Object} Analytics data
   */
  static async aggregateDailyMetrics(shopId, date = null) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setDate(targetDate.getDate() - 1); // Yesterday by default
    const dateStr = targetDate.toISOString().split('T')[0];

    // 1. Fetch orders for the day
    const dayStart = `${dateStr}T00:00:00Z`;
    const dayEnd = `${dateStr}T23:59:59Z`;

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total_paise, accepted_at, delivered_at, customer_id')
      .eq('shop_id', shopId)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    if (ordersError) {
      throw new AppError(INTERNAL_ERROR, 'Failed to fetch orders.', 500);
    }

    // 2. Calculate order metrics
    const orderData = {
      total_orders: orders?.length || 0,
      completed_orders: orders?.filter((o) => o.status === 'delivered').length || 0,
      cancelled_orders: orders?.filter((o) => o.status === 'cancelled').length || 0,
      auto_cancelled_orders:
        orders?.filter((o) => o.status === 'auto_cancelled').length || 0,
      unique_customers: new Set(orders?.map((o) => o.customer_id) || []).size,
    };

    // 3. Calculate revenue
    const { data: completedOrders } = await supabase
      .from('orders')
      .select('total_paise')
      .eq('shop_id', shopId)
      .eq('status', 'delivered')
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    const grossRevenue = completedOrders?.reduce((sum, o) => sum + o.total_paise, 0) || 0;
    const nearbyCommission = Math.floor(grossRevenue * 0.08); // 8% commission
    const netRevenue = grossRevenue - nearbyCommission;

    // 4. Calculate completion rate
    const completionRate
      = orderData.total_orders > 0
        ? Math.round((orderData.completed_orders / orderData.total_orders) * 100 * 100) / 100
        : 0;

    // 5. Calculate average acceptance and preparation times
    let avgAcceptanceTime = null;
    let avgPreparationTime = null;

    if (orderData.completed_orders > 0) {
      const completedOrderData = orders.filter((o) => o.status === 'delivered');

      const acceptanceTimes = completedOrderData
        .filter((o) => o.accepted_at)
        .map((o) => {
          const created = new Date(o.created_at);
          const accepted = new Date(o.accepted_at);
          return Math.floor((accepted - created) / 1000);
        });

      if (acceptanceTimes.length > 0) {
        avgAcceptanceTime = Math.floor(
          acceptanceTimes.reduce((a, b) => a + b, 0) / acceptanceTimes.length
        );
      }

      const preparationTimes = completedOrderData
        .filter((o) => o.accepted_at && o.delivered_at)
        .map((o) => {
          const accepted = new Date(o.accepted_at);
          const delivered = new Date(o.delivered_at);
          return Math.floor((delivered - accepted) / 1000);
        });

      if (preparationTimes.length > 0) {
        avgPreparationTime = Math.floor(
          preparationTimes.reduce((a, b) => a + b, 0) / preparationTimes.length
        );
      }
    }

    // 6. Fetch reviews for the day
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('shop_id', shopId)
      .eq('is_visible', true)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);

    const reviewCount = reviews?.length || 0;
    let avgRating = null;

    if (reviewCount > 0) {
      const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
      avgRating = parseFloat((ratingSum / reviewCount).toFixed(2));
    }

    // 7. Upsert analytics record
    const analyticsData = {
      shop_id: shopId,
      date: dateStr,
      total_orders: orderData.total_orders,
      completed_orders: orderData.completed_orders,
      cancelled_orders: orderData.cancelled_orders,
      auto_cancelled_orders: orderData.auto_cancelled_orders,
      gross_revenue_paise: grossRevenue,
      net_revenue_paise: netRevenue,
      completion_rate: completionRate,
      avg_acceptance_time_seconds: avgAcceptanceTime,
      avg_preparation_time_seconds: avgPreparationTime,
      review_count: reviewCount,
      avg_rating: avgRating,
      unique_customers: orderData.unique_customers,
      updated_at: new Date().toISOString(),
    };

    const { data: analytics, error: upsertError } = await supabase
      .from('shop_analytics')
      .upsert(analyticsData, { onConflict: 'shop_id,date' })
      .select()
      .single();

    if (upsertError) {
      logger.error('Failed to upsert analytics', {
        shopId,
        date: dateStr,
        error: upsertError.message,
      });
      throw new AppError(INTERNAL_ERROR, 'Failed to save analytics.', 500);
    }

    logger.info('Daily analytics aggregated', {
      shopId,
      date: dateStr,
      completedOrders: orderData.completed_orders,
      grossRevenue: grossRevenue / 100,
      completionRate,
    });

    return this._toResponse(analytics);
  }

  /**
   * Get shop analytics for a date range
   * @param {string} shopId - Shop ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Array} Analytics records
   */
  static async getAnalytics(shopId, startDate, endDate) {
    const { data: analytics, error } = await supabase
      .from('shop_analytics')
      .select('*')
      .eq('shop_id', shopId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      throw new AppError(INTERNAL_ERROR, 'Failed to fetch analytics.', 500);
    }

    return (analytics || []).map((a) => this._toResponse(a));
  }

  static _toResponse(analytics) {
    return Object.freeze({
      id: analytics.id,
      shopId: analytics.shop_id,
      date: analytics.date,
      totalOrders: analytics.total_orders,
      completedOrders: analytics.completed_orders,
      cancelledOrders: analytics.cancelled_orders,
      autoCancelledOrders: analytics.auto_cancelled_orders,
      grossRevenuePaise: analytics.gross_revenue_paise,
      netRevenuePaise: analytics.net_revenue_paise,
      completionRate: analytics.completion_rate,
      avgAcceptanceTimeSeconds: analytics.avg_acceptance_time_seconds,
      avgPreparationTimeSeconds: analytics.avg_preparation_time_seconds,
      reviewCount: analytics.review_count,
      avgRating: analytics.avg_rating,
      uniqueCustomers: analytics.unique_customers,
      createdAt: analytics.created_at,
      updatedAt: analytics.updated_at,
    });
  }
}

export default AnalyticsService;
