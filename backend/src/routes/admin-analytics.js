import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { successResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';
import { AppError, INTERNAL_ERROR } from '../utils/errors.js';

const router = Router();

/**
 * Task 13.6.1: GET /admin/analytics
 * Summary metrics: gmv_total, orders_total, customers_total, shops_active
 */
router.get('/', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    // Get total GMV (sum of completed orders)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'delivered');
    
    if (ordersError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch GMV', 500));
    
    const gmv_total = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const orders_total = orders ? orders.length : 0;
    
    // Get active shops
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id')
      .eq('kyc_status', 'approved')
      .eq('is_open', true);
    
    if (shopsError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch shops', 500));
    
    // Get unique customers (who have placed orders)
    const { data: customers, error: customersError } = await supabase
      .from('orders')
      .select('customer_id', { count: 'exact' })
      .distinct();
    
    if (customersError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch customers', 500));
    
    return res.status(200).json(successResponse({
      gmv_total,
      orders_total,
      customers_total: customers ? customers.length : 0,
      shops_active: shops ? shops.length : 0,
      currency: 'INR'
    }));
  } catch (error) {
    logger.error('GET /admin/analytics error', { error: error.message });
    return next(error);
  }
});

/**
 * Task 13.6.2: GET /admin/analytics/daily
 * By date or range (7d, 30d, 90d)
 * Returns daily_revenue, orders_count, by_city breakdown
 */
router.get('/daily', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { date, range = '7d' } = req.query;
    
    // Parse range
    let startDate;
    const now = new Date();
    
    if (date) {
      // Single day: ?date=2026-04-20
      const d = new Date(date);
      startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    } else {
      // Range: ?range=7d,30d,90d
      const days = parseInt(range) || 7;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
    
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    // Fetch completed orders within range
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('created_at, total_amount, shops!inner(id), shop_id')
      .eq('status', 'delivered')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());
    
    if (ordersError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch orders', 500));
    
    // Get city info for shops
    const shopIds = [...new Set((orders || []).map(o => o.shop_id))];
    let shopCities = {};
    
    if (shopIds.length > 0) {
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('id, city')
        .in('id', shopIds);
      
      if (!shopError && shopData) {
        shopCities = Object.fromEntries(shopData.map(s => [s.id, s.city || 'Unknown']));
      }
    }
    
    // Aggregate by date
    const byDate = {};
    const byCity = {};
    
    (orders || []).forEach(o => {
      const dateKey = new Date(o.created_at).toISOString().split('T')[0];
      const city = shopCities[o.shop_id] || 'Unknown';
      
      if (!byDate[dateKey]) byDate[dateKey] = { revenue: 0, orders: 0 };
      byDate[dateKey].revenue += o.total_amount || 0;
      byDate[dateKey].orders += 1;
      
      if (!byCity[city]) byCity[city] = { gmv: 0, orders: 0 };
      byCity[city].gmv += o.total_amount || 0;
      byCity[city].orders += 1;
    });
    
    // Convert to arrays
    const daily = Object.entries(byDate).map(([date, data]) => ({
      date,
      daily_revenue: data.revenue,
      orders_count: data.orders
    }));
    
    const by_city = Object.entries(byCity).map(([city, data]) => ({
      city,
      gmv: data.gmv,
      orders: data.orders
    }));
    
    return res.status(200).json(successResponse({
      daily,
      by_city,
      range: date ? 'single_day' : range,
      currency: 'INR'
    }));
  } catch (error) {
    logger.error('GET /admin/analytics/daily error', { error: error.message });
    return next(error);
  }
});

/**
 * Task 13.6.3: GET /admin/analytics/top-shops
 * Top 10 shops by revenue with avg_rating
 */
router.get('/top-shops', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    
    // Fetch all delivered orders with shop info
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('shop_id, total_amount, shops!inner(id, name, avg_rating)')
      .eq('status', 'delivered');
    
    if (ordersError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch orders', 500));
    
    // Aggregate by shop
    const shopStats = {};
    
    (orders || []).forEach(o => {
      if (!shopStats[o.shop_id]) {
        shopStats[o.shop_id] = {
          shop_id: o.shop_id,
          shop_name: o.shops?.name || 'Unknown',
          revenue: 0,
          orders_count: 0,
          avg_rating: o.shops?.avg_rating || 0
        };
      }
      shopStats[o.shop_id].revenue += o.total_amount || 0;
      shopStats[o.shop_id].orders_count += 1;
    });
    
    // Sort by revenue descending and limit
    const topShops = Object.values(shopStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limitNum);
    
    return res.status(200).json(successResponse({
      top_shops: topShops,
      count: topShops.length,
      currency: 'INR'
    }));
  } catch (error) {
    logger.error('GET /admin/analytics/top-shops error', { error: error.message });
    return next(error);
  }
});

export default router;
