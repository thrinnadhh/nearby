import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { validate } from '../middleware/validate.js';
import { successResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';
import { redis } from '../services/redis.js';
import { broadcastQueue } from '../services/bullQueue.js';
import { AppError, INTERNAL_ERROR, VALIDATION_ERROR } from '../utils/errors.js';
import Joi from 'joi';

const router = Router();

const broadcastSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  body: Joi.string().min(10).max(500).required(),
  deep_link: Joi.string().uri().optional(),
  target: Joi.string().valid('customers', 'shops', 'delivery').required(),
  scheduled_at: Joi.date().iso().optional()
});

/**
 * Task 13.7.1: POST /admin/broadcast
 * Send campaign to customers/shops/delivery partners
 * Rate limit: 1/hour per admin
 */
router.post('/', authenticate, roleGuard(['admin']), validate(broadcastSchema), async (req, res, next) => {
  try {
    const { title, body, deep_link, target, scheduled_at } = req.body;
    const adminId = req.user.userId;
    
    // Rate limiting: 1 broadcast per hour per admin
    const rateLimitKey = `broadcast:admin:${adminId}`;
    const lastBroadcast = await redis.get(rateLimitKey);
    
    if (lastBroadcast) {
      return next(new AppError(VALIDATION_ERROR, 'Rate limit: Only 1 broadcast per hour', 429));
    }
    
    const now = new Date().toISOString();
    const broadcastId = `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save broadcast record
    const { error: insertError } = await supabase
      .from('broadcasts')
      .insert({
        id: broadcastId,
        title,
        body,
        deep_link: deep_link || null,
        target,
        created_by_admin: adminId,
        created_at: now,
        scheduled_at: scheduled_at || now,
        status: scheduled_at && new Date(scheduled_at) > new Date(now) ? 'scheduled' : 'pending'
      });
    
    if (insertError) return next(new AppError(INTERNAL_ERROR, 'Failed to create broadcast', 500));
    
    // Queue broadcast job
    const jobData = {
      broadcastId,
      title,
      body,
      deep_link: deep_link || null,
      target,
      adminId
    };
    
    const scheduleTime = scheduled_at ? new Date(scheduled_at).getTime() - Date.now() : 0;
    
    if (scheduleTime > 0) {
      // Schedule for future
      await broadcastQueue.add('broadcast', jobData, {
        delay: scheduleTime,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
    } else {
      // Send immediately
      await broadcastQueue.add('broadcast', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
    }
    
    // Set rate limit
    await redis.set(rateLimitKey, '1', 'EX', 3600);
    
    logger.info('Broadcast created', { broadcastId, target, adminId });
    
    return res.status(201).json(successResponse({
      broadcast_id: broadcastId,
      status: scheduled_at ? 'scheduled' : 'pending',
      target,
      created_at: now,
      scheduled_at: scheduled_at || now
    }));
  } catch (error) {
    logger.error('POST /admin/broadcast error', { error: error.message });
    return next(error);
  }
});

/**
 * Task 13.7.2: GET /admin/broadcast/history
 * Get list of broadcast campaigns
 */
router.get('/history', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, target = '', status = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    let query = supabase
      .from('broadcasts')
      .select('id, title, target, status, sent_count, created_at, scheduled_at, created_by_admin', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (target) {
      query = query.eq('target', target);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    query = query.range(offset, offset + limitNum - 1);
    
    const { data: broadcasts, error: queryError, count } = await query;
    
    if (queryError) return next(new AppError(INTERNAL_ERROR, 'Failed to fetch broadcasts', 500));
    
    return res.status(200).json(successResponse({
      broadcasts: (broadcasts || []).map(b => ({
        id: b.id,
        title: b.title,
        target: b.target,
        status: b.status,
        sent_count: b.sent_count || 0,
        created_at: b.created_at,
        scheduled_at: b.scheduled_at
      })),
      meta: {
        page: pageNum,
        total: count || 0,
        pages: Math.ceil((count || 0) / limitNum),
        limit: limitNum
      }
    }));
  } catch (error) {
    logger.error('GET /admin/broadcast/history error', { error: error.message });
    return next(error);
  }
});

export default router;
