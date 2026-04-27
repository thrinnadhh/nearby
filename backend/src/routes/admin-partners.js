import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';
import { fcm } from '../services/fcm.js';
import { maskPhone } from '../utils/security.js';
import { AppError, INTERNAL_ERROR, NOT_FOUND, VALIDATION_ERROR } from '../utils/errors.js';
import Joi from 'joi';

const router = Router();

const suspendSchema = Joi.object({ reason: Joi.string().min(10).max(500).required() });

/**
 * Task 13.6.4: GET /admin/delivery-partners
 * List all delivery partners with pagination and search
 */
router.get('/', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', sort = 'name' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabase
      .from('delivery_partners')
      .select('id, name, phone, status, total_earnings, rating, orders_completed, created_at', { count: 'exact' });
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    
    // Sort options
    let sortCol = 'name';
    let ascending = true;
    if (sort === 'earnings') { sortCol = 'total_earnings'; ascending = false; }
    else if (sort === 'rating') { sortCol = 'rating'; ascending = false; }
    else if (sort === 'orders') { sortCol = 'orders_completed'; ascending = false; }
    
    query = query.order(sortCol, { ascending });
    query = query.range(offset, offset + limitNum - 1);
    
    const { data: partners, error: queryError, count } = await query;
    
    if (queryError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch delivery partners', 500));
    
    return res.status(200).json(successResponse({
      delivery_partners: (partners || []).map(p => ({
        id: p.id,
        name: p.name,
        phone: maskPhone(p.phone),
        status: p.status,
        total_earnings: p.total_earnings || 0,
        rating: p.rating || 0,
        orders_completed: p.orders_completed || 0,
        created_at: p.created_at
      })),
      meta: {
        page: pageNum,
        total: count || 0,
        pages: Math.ceil((count || 0) / limitNum),
        limit: limitNum
      }
    }));
  } catch (error) {
    logger.error('GET /admin/delivery-partners error', { error: error.message });
    return next(error);
  }
});

/**
 * Task 13.6.5: PATCH /admin/delivery-partners/:id/suspend
 * Suspend delivery partner with reason
 */
router.patch('/:id/suspend', authenticate, roleGuard(['admin']), validate(suspendSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;
    const now = new Date().toISOString();
    
    // Verify partner exists
    const { data: partner, error: fetchError } = await supabase
      .from('delivery_partners')
      .select('id, status')
      .eq('id', id)
      .single();
    
    if (fetchError || !partner) {
      return next(new AppError(NOT_FOUND, 'Delivery partner not found', 404));
    }
    
    // Update partner
    const { error: updateError } = await supabase
      .from('delivery_partners')
      .update({
        status: 'suspended',
        suspended_at: now,
        suspension_reason: reason,
        suspended_by_admin: adminId
      })
      .eq('id', id);
    
    if (updateError) return next(new AppError(INTERNAL_ERROR, 'Failed to suspend partner', 500));
    
    // Send FCM notification
    if (fcm && fcm.sendNotification) {
      fcm.sendNotification({
        title: 'Account Suspended',
        body: `Your delivery partner account has been suspended. Reason: ${reason}`,
        topic: `delivery_${id}`
      }).catch(e => logger.error('FCM send failed', { error: e.message }));
    }
    
    logger.info('Delivery partner suspended', { partnerId: id, reason });
    
    return res.status(200).json(successResponse({
      partner_id: id,
      status: 'suspended',
      suspended_at: now,
      reason
    }));
  } catch (error) {
    logger.error('PATCH /admin/delivery-partners/:id/suspend error', { error: error.message });
    return next(error);
  }
});

/**
 * Task 13.6.6: PATCH /admin/delivery-partners/:id/reinstate
 * Reinstate suspended delivery partner
 */
router.patch('/:id/reinstate', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    
    // Verify partner is suspended
    const { data: partner, error: fetchError } = await supabase
      .from('delivery_partners')
      .select('status, suspended_at')
      .eq('id', id)
      .single();
    
    if (fetchError || !partner) {
      return next(new AppError(NOT_FOUND, 'Delivery partner not found', 404));
    }
    
    if (partner.status !== 'suspended') {
      return next(new AppError(VALIDATION_ERROR, 'Partner is not suspended', 400));
    }
    
    // Update partner
    const { error: updateError } = await supabase
      .from('delivery_partners')
      .update({
        status: 'active',
        suspended_at: null,
        suspension_reason: null,
        reinstated_by_admin: adminId,
        reinstated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (updateError) return next(new AppError(INTERNAL_ERROR, 'Failed to reinstate partner', 500));
    
    // Send FCM notification
    if (fcm && fcm.sendNotification) {
      fcm.sendNotification({
        title: 'Account Reinstated',
        body: 'Your delivery partner account has been reinstated.',
        topic: `delivery_${id}`
      }).catch(e => logger.error('FCM send failed', { error: e.message }));
    }
    
    logger.info('Delivery partner reinstated', { partnerId: id });
    
    return res.status(200).json(successResponse({
      partner_id: id,
      status: 'active',
      reinstated_at: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('PATCH /admin/delivery-partners/:id/reinstate error', { error: error.message });
    return next(error);
  }
});

/**
 * Task 13.6.7: GET /admin/delivery-partners/:id/earnings
 * Get delivery partner earnings history
 */
router.get('/:id/earnings', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    const daysNum = Math.min(365, Math.max(1, parseInt(days) || 30));
    
    // Verify partner exists
    const { data: partner, error: fetchError } = await supabase
      .from('delivery_partners')
      .select('id')
      .eq('id', id)
      .single();
    
    if (fetchError || !partner) {
      return next(new AppError(NOT_FOUND, 'Delivery partner not found', 404));
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    
    // Fetch earnings records for delivery partner
    const { data: deliveries, error: queryError } = await supabase
      .from('orders')
      .select('id, delivery_partner_id, status, created_at, delivery_amount, commission_amount')
      .eq('delivery_partner_id', id)
      .eq('status', 'delivered')
      .gte('created_at', startDate.toISOString());
    
    if (queryError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch earnings', 500));
    
    // Aggregate by date
    const byDate = {};
    
    (deliveries || []).forEach(d => {
      const dateKey = new Date(d.created_at).toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: dateKey,
          orders: 0,
          earnings: 0,
          commission_paid: 0
        };
      }
      byDate[dateKey].orders += 1;
      byDate[dateKey].earnings += d.delivery_amount || 0;
      byDate[dateKey].commission_paid += d.commission_amount || 0;
    });
    
    const earnings = Object.values(byDate).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return res.status(200).json(successResponse({
      partner_id: id,
      earnings,
      total_earnings: deliveries ? deliveries.reduce((sum, d) => sum + (d.delivery_amount || 0), 0) : 0,
      total_commissions: deliveries ? deliveries.reduce((sum, d) => sum + (d.commission_amount || 0), 0) : 0,
      days: daysNum,
      currency: 'INR'
    }));
  } catch (error) {
    logger.error('GET /admin/delivery-partners/:id/earnings error', { error: error.message });
    return next(error);
  }
});

export default router;
