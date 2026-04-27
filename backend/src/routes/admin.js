import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';
import { redis } from '../services/redis.js';
import { msg91 } from '../services/msg91.js';
import { fcm } from '../services/fcm.js';
import { refundPayment as cashfreeRefund } from '../services/cashfree.js';
import { AppError, NOT_FOUND, VALIDATION_ERROR, INTERNAL_ERROR } from '../utils/errors.js';
import { maskPhone } from '../utils/security.js';
import { checkSmsBroadcastLimit } from '../middleware/rateLimit.js';
import Joi from 'joi';

// Sprint 13.6-13.7: Import new admin route modules
import adminAnalyticsRouter from './admin-analytics.js';
import adminPartnersRouter from './admin-partners.js';
import adminModerationRouter from './admin-moderation.js';
import adminBroadcastRouter from './admin-broadcast.js';

const router = Router();

const kycApproveSchema = Joi.object({ notes: Joi.string().max(500).optional() });
const kycRejectSchema = Joi.object({ reason: Joi.string().min(10).max(500).required() });
const shopSuspendSchema = Joi.object({ reason: Joi.string().min(10).max(500).required() });
const disputeResolveSchema = Joi.object({ decision: Joi.string().valid('approve', 'deny').required(), refund_amount: Joi.number().integer().min(0).required(), notes: Joi.string().max(500).optional() });

// Task 13.5.1: GET /admin/kyc/queue
router.get('/kyc/queue', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = 'pending', sort = 'submitted_at' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    let query = supabase.from('kyc_submissions').select('id,shop_id,owner_id,status,submitted_at,updated_at,aadhaar_doc_url,gst_doc_url,shop_photo_url,rejection_reason,shops!inner(name,owner_phone:profiles(phone,name))', { count: 'exact' });
    if (status && ['pending', 'approved', 'rejected'].includes(status)) query = query.eq('status', status);
    query = query.order(sort === 'shop_name' ? 'shops(name)' : sort, { ascending: !['submitted_at', 'updated_at'].includes(sort) }).range(offset, offset + limitNum - 1);
    const { data: kycQueue, error: queryError, count } = await query;
    if (queryError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch KYC queue', 500));
    return res.status(200).json(successResponse({ kyc_queue: kycQueue.map(s => ({ id: s.id, shop_id: s.shop_id, shop_name: s.shops?.name || 'Unknown', owner_id: s.owner_id, owner_name: s.shops?.owner_phone?.[0]?.name || 'Unknown', owner_phone: maskPhone(s.shops?.owner_phone?.[0]?.phone), status: s.status, submitted_at: s.submitted_at, updated_at: s.updated_at, documents: { aadhaar: s.aadhaar_doc_url, gst: s.gst_doc_url, shop_photo: s.shop_photo_url }, rejection_reason: s.rejection_reason })), meta: { page: pageNum, total: count || 0, pages: Math.ceil((count || 0) / limitNum), limit: limitNum } }));
  } catch (error) {
    logger.error('GET /admin/kyc/queue error', { error: error.message });
    return next(error);
  }
});

// Task 13.5.2: PATCH /admin/kyc/:id/approve
router.patch('/kyc/:id/approve', authenticate, roleGuard(['admin']), validate(kycApproveSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    const { data: kycData, error: fetchError } = await supabase.from('kyc_submissions').select('id,shop_id,shops!inner(name,owner_phone:profiles(phone))').eq('id', id).single();
    if (fetchError || !kycData) return next(new AppError(NOT_FOUND, 'KYC submission not found', 404));
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from('kyc_submissions').update({ status: 'approved', approved_at: now, approved_by_admin: adminId }).eq('id', id);
    if (updateError) return next(new AppError(INTERNAL_ERROR, 'Failed to approve KYC', 500));
    const { error: shopError } = await supabase.from('shops').update({ kyc_status: 'approved' }).eq('id', kycData.shop_id);
    if (shopError) return next(new AppError(INTERNAL_ERROR, 'Failed to update shop status', 500));
    const phone = kycData.shops?.owner_phone?.[0]?.phone;
    if (phone) {
      // Check SMS rate limit before sending
      const canSendSms = await checkSmsBroadcastLimit(req, phone, 'kyc_approval');
      if (canSendSms) {
        msg91.sendSMS(phone, 'Congratulations! Your KYC has been approved. Start accepting orders.').catch(e => logger.error('SMS send failed', { error: e.message }));
      } else {
        logger.warn('SMS rate limit exceeded for KYC approval', { phone: maskPhone(phone) });
      }
    }
    if (fcm && fcm.sendNotification) fcm.sendNotification({ title: 'KYC Approved', body: 'Your shop is now active. Start accepting orders!', topic: `shop_${kycData.shop_id}` }).catch(e => logger.error('FCM send failed', { error: e.message }));
    logger.info('KYC approved', { kycId: id, shopId: kycData.shop_id, adminId });
    return res.status(200).json(successResponse({ kyc_id: id, shop_id: kycData.shop_id, status: 'approved', approved_at: now, admin_id: adminId }));
  } catch (error) {
    logger.error('PATCH /admin/kyc/:id/approve error', { error: error.message });
    return next(error);
  }
});

// Task 13.5.3: PATCH /admin/kyc/:id/reject
router.patch('/kyc/:id/reject', authenticate, roleGuard(['admin']), validate(kycRejectSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;
    const { data: kycData, error: fetchError } = await supabase.from('kyc_submissions').select('id,shop_id,shops!inner(name,owner_phone:profiles(phone))').eq('id', id).single();
    if (fetchError || !kycData) return next(new AppError(NOT_FOUND, 'KYC submission not found', 404));
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from('kyc_submissions').update({ status: 'rejected', rejected_at: now, rejected_reason: reason, rejected_by_admin: adminId }).eq('id', id);
    if (updateError) return next(new AppError(INTERNAL_ERROR, 'Failed to reject KYC', 500));
    const phone = kycData.shops?.owner_phone?.[0]?.phone;
    if (phone) {
      // Check SMS rate limit before sending
      const canSendSms = await checkSmsBroadcastLimit(req, phone, 'kyc_rejection');
      if (canSendSms) {
        msg91.sendSMS(phone, `Your KYC has been rejected. Reason: ${reason}`).catch(e => logger.error('SMS send failed', { error: e.message }));
      } else {
        logger.warn('SMS rate limit exceeded for KYC rejection', { phone: maskPhone(phone) });
      }
    }
    if (fcm && fcm.sendNotification) fcm.sendNotification({ title: 'KYC Rejected', body: `Reason: ${reason}`, topic: `shop_${kycData.shop_id}` }).catch(e => logger.error('FCM send failed', { error: e.message }));
    logger.info('KYC rejected', { kycId: id, shopId: kycData.shop_id, reason });
    return res.status(200).json(successResponse({ kyc_id: id, shop_id: kycData.shop_id, status: 'rejected', rejected_at: now, reason }));
  } catch (error) {
    logger.error('PATCH /admin/kyc/:id/reject error', { error: error.message });
    return next(error);
  }
});

// Task 13.5.4: GET /admin/shops
router.get('/shops', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, kyc_status = '', is_open = '', search = '', sort = 'name' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    let query = supabase.from('shops').select('id,name,category,phone,kyc_status,is_open,trust_score,owner_phone:owner_id(name,phone)', { count: 'exact' });
    if (kyc_status) query = query.eq('kyc_status', kyc_status);
    if (is_open !== '') query = query.eq('is_open', is_open === 'true');
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    query = query.order(sort, { ascending: sort !== 'trust_score' }).range(offset, offset + limitNum - 1);
    const { data: shops, error: queryError, count } = await query;
    if (queryError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch shops', 500));
    return res.status(200).json(successResponse({ shops: shops.map(s => ({ id: s.id, name: s.name, category: s.category, phone: s.phone, kyc_status: s.kyc_status, is_open: s.is_open, trust_score: s.trust_score, owner_name: s.owner_phone?.[0]?.name || 'Unknown', owner_phone: s.owner_phone?.[0]?.phone || '' })), meta: { page: pageNum, total: count || 0, pages: Math.ceil((count || 0) / limitNum), limit: limitNum } }));
  } catch (error) {
    logger.error('GET /admin/shops error', { error: error.message });
    return next(error);
  }
});

// Task 13.5.5: PATCH /admin/shops/:id/suspend
router.patch('/shops/:id/suspend', authenticate, roleGuard(['admin']), validate(shopSuspendSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;
    // Check if shop exists before updating
    const { data: shop, error: fetchError } = await supabase.from('shops').select('id').eq('id', id).single();
    if (fetchError || !shop) return next(new AppError(NOT_FOUND, 'Shop not found', 404));
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from('shops').update({ is_open: false, suspended_at: now, suspension_reason: reason, suspended_by_admin: adminId }).eq('id', id);
    if (updateError) return next(new AppError(INTERNAL_ERROR, 'Failed to suspend shop', 500));
    if (fcm && fcm.sendNotification) fcm.sendNotification({ title: 'Shop Suspended', body: `Reason: ${reason}`, topic: `shop_${id}` }).catch(e => logger.error('FCM send failed', { error: e.message }));
    logger.info('Shop suspended', { shopId: id, reason });
    return res.status(200).json(successResponse({ shop_id: id, status: 'suspended', suspended_at: now, reason }));
  } catch (error) {
    logger.error('PATCH /admin/shops/:id/suspend error', { error: error.message });
    return next(error);
  }
});

// Task 13.5.6: PATCH /admin/shops/:id/reinstate
router.patch('/shops/:id/reinstate', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: shop, error: fetchError } = await supabase.from('shops').select('suspended_at').eq('id', id).single();
    if (fetchError || !shop) return next(new AppError(NOT_FOUND, 'Shop not found', 404));
    if (!shop.suspended_at) return next(new AppError(VALIDATION_ERROR, 'Shop is not suspended', 400));
    const { error: updateError } = await supabase.from('shops').update({ is_open: true, suspended_at: null, suspension_reason: null, reinstated_by_admin: req.user.userId }).eq('id', id);
    if (updateError) return next(new AppError(INTERNAL_ERROR, 'Failed to reinstate shop', 500));
    if (fcm && fcm.sendNotification) fcm.sendNotification({ title: 'Shop Reinstated', body: 'Your shop has been reinstated.', topic: `shop_${id}` }).catch(e => logger.error('FCM send failed', { error: e.message }));
    logger.info('Shop reinstated', { shopId: id });
    return res.status(200).json(successResponse({ shop_id: id, status: 'reinstated' }));
  } catch (error) {
    logger.error('PATCH /admin/shops/:id/reinstate error', { error: error.message });
    return next(error);
  }
});

// Task 13.5.7: GET /admin/orders/live
router.get('/orders/live', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { status = '', limit = 50 } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    let query = supabase.from('orders').select('id,shop_id,customer_id,status,created_at,updated_at', { count: 'exact' }).gte('created_at', fiveMinutesAgo).limit(limitNum);
    if (status) query = query.eq('status', status);
    const { data: orders, error: queryError, count } = await query;
    if (queryError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch orders', 500));
    const now = Date.now();
    const ordersWithStatus = orders.map(o => {
      const createdTime = new Date(o.created_at).getTime();
      const pendingMinutes = Math.floor((now - createdTime) / 60000);
      const acceptedMinutes = o.status === 'accepted' ? Math.floor((now - createdTime) / 60000) : 0;
      const is_stuck = (o.status === 'pending' && pendingMinutes > 3) || (o.status === 'accepted' && acceptedMinutes > 10);
      return { id: o.id, shop_id: o.shop_id, customer_id: o.customer_id, status: o.status, created_at: o.created_at, is_stuck, pending_minutes: pendingMinutes, accepted_minutes: acceptedMinutes };
    });
    return res.status(200).json(successResponse({ orders: ordersWithStatus, count: count || 0 }));
  } catch (error) {
    logger.error('GET /admin/orders/live error', { error: error.message });
    return next(error);
  }
});

// Task 13.5.8: POST /admin/orders/:id/escalate
router.post('/orders/:id/escalate', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    const now = new Date().toISOString();
    const { data: order, error: fetchError } = await supabase.from('orders').select('id,shop_id,delivery_partner_id,escalations').eq('id', id).single();
    if (fetchError || !order) return next(new AppError(NOT_FOUND, 'Order not found', 404));
    const escalations = (order.escalations || []).concat({ escalated_by_admin: adminId, escalated_at: now, reason: 'Manual admin escalation' });
    const { error: updateError } = await supabase.from('orders').update({ escalations }).eq('id', id);
    if (updateError) return next(new AppError(INTERNAL_ERROR, 'Failed to escalate order', 500));
    if (fcm && fcm.sendNotification) {
      fcm.sendNotification({ title: 'Order Escalated', body: `Order #${id} has been escalated by admin.`, topic: `shop_${order.shop_id}` }).catch(e => logger.error('FCM send failed', { error: e.message }));
      if (order.delivery_partner_id) fcm.sendNotification({ title: 'Order Escalated', body: `Order #${id} has been escalated by admin.`, topic: `delivery_${order.delivery_partner_id}` }).catch(e => logger.error('FCM send failed', { error: e.message }));
    }
    logger.info('Order escalated', { orderId: id });
    return res.status(200).json(successResponse({ order_id: id, escalated: true, escalated_at: now }));
  } catch (error) {
    logger.error('POST /admin/orders/:id/escalate error', { error: error.message });
    return next(error);
  }
});

// Task 13.5.9: GET /admin/disputes
router.get('/disputes', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status = '', sort = 'created_at' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    let query = supabase.from('disputes').select('id,customer_id,order_id,shop_id,status,created_at,updated_at,reason,customers:customer_id(phone),orders!inner(id),shops!inner(name)', { count: 'exact' });
    if (status) query = query.eq('status', status);
    query = query.order(sort, { ascending: sort === 'created_at' }).range(offset, offset + limitNum - 1);
    const { data: disputes, error: queryError, count } = await query;
    if (queryError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch disputes', 500));
    return res.status(200).json(successResponse({ disputes: disputes.map(d => ({ id: d.id, customer_id: d.customer_id, customer_phone: maskPhone(d.customers?.[0]?.phone), order_id: d.order_id, shop_id: d.shop_id, shop_name: d.shops?.[0]?.name || 'Unknown', status: d.status, reason: d.reason, created_at: d.created_at, updated_at: d.updated_at })), meta: { page: pageNum, total: count || 0, pages: Math.ceil((count || 0) / limitNum), limit: limitNum } }));
  } catch (error) {
    logger.error('GET /admin/disputes error', { error: error.message });
    return next(error);
  }
});

// Task 13.5.10: GET /admin/disputes/:id
router.get('/disputes/:id', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: dispute, error: fetchError } = await supabase.from('disputes').select('id,customer_id,order_id,shop_id,status,created_at,updated_at,reason,customers:customer_id(phone,name),orders!inner(id,total_amount,order_timeline),shops!inner(name)').eq('id', id).single();
    if (fetchError || !dispute) return next(new AppError(NOT_FOUND, 'Dispute not found', 404));
    const gpsTrailKey = `dispute:gps:${dispute.order_id}`;
    const gpsDataResult = await redis.get(gpsTrailKey);
    const gpsData = gpsDataResult ? gpsDataResult : null;
    const gps_trail = gpsData ? JSON.parse(gpsData) : [];
    const order_timeline = (dispute.orders?.[0]?.order_timeline || []).map(t => ({ status: t.status, timestamp: t.timestamp }));
    return res.status(200).json(successResponse({ dispute: { id: dispute.id, customer_id: dispute.customer_id, customer_phone: maskPhone(dispute.customers?.[0]?.phone), customer_name: dispute.customers?.[0]?.name || 'Unknown', order_id: dispute.order_id, shop_id: dispute.shop_id, shop_name: dispute.shops?.[0]?.name || 'Unknown', status: dispute.status, reason: dispute.reason, created_at: dispute.created_at, updated_at: dispute.updated_at }, order_timeline, gps_trail }));
  } catch (error) {
    logger.error('GET /admin/disputes/:id error', { error: error.message });
    return next(error);
  }
});

// Task 13.5.11: PATCH /admin/disputes/:id/resolve
router.patch('/disputes/:id/resolve', authenticate, roleGuard(['admin']), validate(disputeResolveSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, refund_amount, notes } = req.body;
    const adminId = req.user.userId;
    const { data: dispute, error: fetchError } = await supabase.from('disputes').select('id,order_id,customer_id,orders!inner(total_amount,payment_id)').eq('id', id).single();
    if (fetchError || !dispute) return next(new AppError(NOT_FOUND, 'Dispute not found', 404));
    if (refund_amount < 0 || refund_amount > dispute.orders?.[0]?.total_amount) return next(new AppError(VALIDATION_ERROR, 'Invalid refund amount', 400));
    let refund_id = null;
    if (decision === 'approve' && refund_amount > 0) {
      try {
        const refundResult = await cashfreeRefund(
          dispute.orders?.[0]?.payment_id,
          refund_amount,
          `Dispute resolution by admin: ${notes || 'No notes'}`
        );
        refund_id = refundResult?.cf_refund_id || refundResult?.id || null;
      } catch (e) {
        logger.error('Cashfree refund failed', { error: e.message });
      }
    }
    const now = new Date().toISOString();
    const resolution_status = decision === 'approve' ? 'resolved' : 'closed';
    const { error: updateError } = await supabase.from('disputes').update({ status: resolution_status, resolved_at: now, resolved_by_admin: adminId, refund_id, refund_amount, resolution_notes: notes }).eq('id', id);
    if (updateError) return next(new AppError(INTERNAL_ERROR, 'Failed to resolve dispute', 500));
    const smsText = decision === 'approve' ? `Refund of ₹${refund_amount / 100} will be credited in 24-48 hours.` : 'Your dispute has been denied.';
    const phone = dispute.customers?.[0]?.phone;
    if (phone) {
      // Check SMS rate limit before sending
      const canSendSms = await checkSmsBroadcastLimit(req, phone, 'dispute_resolution');
      if (canSendSms) {
        msg91.sendSMS(phone, smsText).catch(e => logger.error('SMS send failed', { error: e.message }));
      } else {
        logger.warn('SMS rate limit exceeded for dispute resolution', { phone: maskPhone(phone) });
      }
    }
    if (fcm && fcm.sendNotification) fcm.sendNotification({ title: 'Dispute Resolved', body: decision === 'approve' ? `Refund approved: ₹${refund_amount / 100}` : 'Dispute denied', topic: `customer_${dispute.customer_id}` }).catch(e => logger.error('FCM send failed', { error: e.message }));
    logger.info('Dispute resolved', { disputeId: id, decision, refund_amount });
    return res.status(200).json(successResponse({ dispute_id: id, decision, refund_amount, refund_id, resolved_at: now }));
  } catch (error) {
    logger.error('PATCH /admin/disputes/:id/resolve error', { error: error.message });
    return next(error);
  }
});


// Mount sub-routers for Sprint 13.6-13.7 endpoints
router.use('/analytics', adminAnalyticsRouter);
router.use('/delivery-partners', adminPartnersRouter);
router.use('/moderation', adminModerationRouter);
router.use('/broadcast', adminBroadcastRouter);

export default router;
