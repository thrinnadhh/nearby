import { supabase } from './supabase.js';
import logger from '../utils/logger.js';
import {
  AppError,
  ORDER_NOT_FOUND,
  ORDER_NOT_DELIVERED,
  REVIEW_ALREADY_EXISTS,
  FORBIDDEN,
  INTERNAL_ERROR,
} from '../utils/errors.js';

class ReviewService {
  static async _fetchOrder(orderId) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, customer_id, shop_id, status, delivered_at')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new AppError(ORDER_NOT_FOUND, 'Order not found.', 404);
    }

    return order;
  }

  static _assertCustomerOwnership(order, customerId) {
    if (order.customer_id !== customerId) {
      throw new AppError(FORBIDDEN, 'You can only review your own orders.', 403);
    }
  }

  static _assertOrderDelivered(order) {
    if (order.status !== 'delivered') {
      throw new AppError(
        ORDER_NOT_DELIVERED,
        'Only delivered orders can be reviewed.',
        400
      );
    }
  }

  static async createReview(customerId, { order_id: orderId, rating, comment }) {
    // 1. Fetch and validate order
    const order = await this._fetchOrder(orderId);
    this._assertCustomerOwnership(order, customerId);
    this._assertOrderDelivered(order);

    // 2. Check if review already exists (unique constraint on order_id)
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existing) {
      throw new AppError(
        REVIEW_ALREADY_EXISTS,
        'You have already reviewed this order.',
        409
      );
    }

    // 3. Create review
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        order_id: orderId,
        customer_id: customerId,
        shop_id: order.shop_id,
        rating,
        comment: comment || null,
        is_visible: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create review', {
        orderId,
        customerId,
        error: error.message,
      });
      throw new AppError(INTERNAL_ERROR, 'Failed to create review.', 500);
    }

    logger.info('Review created', {
      reviewId: review.id,
      orderId,
      customerId,
      rating,
    });

    return this._toResponse(review);
  }

  static async getReviewsByShop(shopId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    const { data: reviews, error, count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppError(INTERNAL_ERROR, 'Failed to fetch reviews.', 500);
    }

    return {
      reviews: (reviews || []).map((r) => this._toResponse(r)),
      meta: {
        total: count || 0,
        page,
        pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  static async getReviewStats(shopId) {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('shop_id', shopId)
      .eq('is_visible', true);

    if (error || !reviews || reviews.length === 0) {
      return {
        avgRating: 0,
        reviewCount: 0,
      };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = sum / reviews.length;

    return {
      avgRating: parseFloat(avgRating.toFixed(2)),
      reviewCount: reviews.length,
    };
  }

  static _toResponse(review) {
    return Object.freeze({
      id: review.id,
      orderId: review.order_id,
      customerId: review.customer_id,
      shopId: review.shop_id,
      rating: review.rating,
      comment: review.comment || null,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    });
  }
}

export default ReviewService;
