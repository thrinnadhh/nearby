import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { successResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import { supabase } from '../services/supabase.js';
import { fcm } from '../services/fcm.js';
import { typesense } from '../services/typesense.js';
import { AppError, INTERNAL_ERROR, NOT_FOUND } from '../utils/errors.js';

const router = Router();

/**
 * Task 13.6.8: GET /admin/moderation/queue
 * Get flagged content (reviews, products)
 */
router.get('/queue', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    
    // Fetch flagged reviews
    let allFlagged = [];
    
    if (type === '' || type === 'reviews') {
      const { data: reviews, error: reviewError } = await supabase
        .from('reviews')
        .select('id, creator_id, order_id, rating, comment, created_at, flag_count, is_flagged')
        .eq('is_flagged', true)
        .order('created_at', { ascending: false });
      
      if (!reviewError && reviews) {
        allFlagged = allFlagged.concat(reviews.map(r => ({
          id: r.id,
          content_type: 'review',
          creator_id: r.creator_id,
          content: `${r.rating}⭐ - ${r.comment}`,
          created_at: r.created_at,
          flag_count: r.flag_count || 0,
          reason: 'User flagged'
        })));
      }
    }
    
    // Fetch flagged products
    if (type === '' || type === 'products') {
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, shop_id, name, created_at, flag_count, is_flagged')
        .eq('is_flagged', true)
        .order('created_at', { ascending: false });
      
      if (!productError && products) {
        allFlagged = allFlagged.concat(products.map(p => ({
          id: p.id,
          content_type: 'product',
          creator_id: p.shop_id,
          content: p.name,
          created_at: p.created_at,
          flag_count: p.flag_count || 0,
          reason: 'Inappropriate content'
        })));
      }
    }
    
    // Sort by flag_count descending
    allFlagged.sort((a, b) => b.flag_count - a.flag_count);
    
    // Paginate
    const paginated = allFlagged.slice(offset, offset + limitNum);
    
    return res.status(200).json(successResponse({
      moderation_queue: paginated,
      meta: {
        page: pageNum,
        total: allFlagged.length,
        pages: Math.ceil(allFlagged.length / limitNum),
        limit: limitNum
      }
    }));
  } catch (error) {
    logger.error('GET /admin/moderation/queue error', { error: error.message });
    return next(error);
  }
});

/**
 * Task 13.6.9: POST /admin/moderation/:id/approve
 * Approve/unflag content
 */
router.post('/:id/approve', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content_type = 'review' } = req.body;
    const adminId = req.user.userId;
    const now = new Date().toISOString();
    
    const table = content_type === 'review' ? 'reviews' : 'products';
    
    // Get content
    const { data: content, error: fetchError } = await supabase
      .from(table)
      .select('id, creator_id, is_flagged')
      .eq('id', id)
      .single();
    
    if (fetchError || !content) {
      return next(new AppError(NOT_FOUND, `${content_type} not found`, 404));
    }
    
    // Unflag content
    const { error: updateError } = await supabase
      .from(table)
      .update({
        is_flagged: false,
        flag_count: 0,
        approved_by_admin: adminId,
        approved_at: now
      })
      .eq('id', id);
    
    if (updateError) return next(new AppError(INTERNAL_ERROR, 'Failed to approve content', 500));
    
    // Notify creator
    if (fcm && fcm.sendNotification && content.creator_id) {
      const topicPrefix = content_type === 'review' ? 'customer' : 'shop';
      fcm.sendNotification({
        title: 'Content Approved',
        body: `Your ${content_type} has been approved.`,
        topic: `${topicPrefix}_${content.creator_id}`
      }).catch(e => logger.error('FCM send failed', { error: e.message }));
    }
    
    logger.info('Content approved', { id, content_type });
    
    return res.status(200).json(successResponse({
      id,
      content_type,
      status: 'approved',
      approved_at: now
    }));
  } catch (error) {
    logger.error('POST /admin/moderation/:id/approve error', { error: error.message });
    return next(error);
  }
});

/**
 * Task 13.6.10: POST /admin/moderation/:id/remove
 * Remove flagged content (soft delete)
 */
router.post('/:id/remove', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content_type = 'review', reason = 'Violates community guidelines' } = req.body;
    const adminId = req.user.userId;
    const now = new Date().toISOString();
    
    const table = content_type === 'review' ? 'reviews' : 'products';
    
    // Get content
    const { data: content, error: fetchError } = await supabase
      .from(table)
      .select('id, creator_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !content) {
      return next(new AppError(NOT_FOUND, `${content_type} not found`, 404));
    }
    
    // Soft delete
    const { error: updateError } = await supabase
      .from(table)
      .update({
        deleted_at: now,
        is_flagged: false,
        removed_by_admin: adminId,
        removal_reason: reason
      })
      .eq('id', id);
    
    if (updateError) return next(new AppError(INTERNAL_ERROR, 'Failed to remove content', 500));
    
    // Remove from Typesense if applicable
    if (content_type === 'product') {
      try {
        await typesense.collections('products').documents(id).delete();
      } catch (e) {
        logger.error('Typesense delete failed', { error: e.message });
      }
    }
    
    // Notify creator
    if (fcm && fcm.sendNotification && content.creator_id) {
      const topicPrefix = content_type === 'review' ? 'customer' : 'shop';
      fcm.sendNotification({
        title: 'Content Removed',
        body: `Your ${content_type} has been removed. Reason: ${reason}`,
        topic: `${topicPrefix}_${content.creator_id}`
      }).catch(e => logger.error('FCM send failed', { error: e.message }));
    }
    
    logger.info('Content removed', { id, content_type, reason });
    
    return res.status(200).json(successResponse({
      id,
      content_type,
      status: 'removed',
      removed_at: now,
      reason
    }));
  } catch (error) {
    logger.error('POST /admin/moderation/:id/remove error', { error: error.message });
    return next(error);
  }
});

/**
 * Task 13.6.11: Admin schema setup for moderation
 * Set up Typesense index for flagged content search
 */
router.post('/schema/setup', authenticate, roleGuard(['admin']), async (req, res, next) => {
  try {
    // Define schema for flagged content
    const schema = {
      name: 'moderation',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'content_type', type: 'string', facet: true },
        { name: 'creator_id', type: 'string' },
        { name: 'flag_count', type: 'int32' },
        { name: 'created_at', type: 'int64' },
        { name: 'is_flagged', type: 'bool' },
        { name: 'content', type: 'string' }
      ],
      default_sorting_field: 'created_at'
    };
    
    try {
      // Try to create collection (will fail if exists, which is fine)
      await typesense.collections().create(schema);
      logger.info('Moderation schema created');
    } catch (e) {
      if (!e.message.includes('already exists')) {
        throw e;
      }
      logger.info('Moderation schema already exists');
    }
    
    return res.status(200).json(successResponse({
      schema_name: 'moderation',
      status: 'ready',
      fields: schema.fields.length
    }));
  } catch (error) {
    logger.error('POST /admin/moderation/schema/setup error', { error: error.message });
    return next(error);
  }
});

export default router;
