/**
 * Reviews service enhanced for Task 10.5 — Review submission for orders/shops
 */

import { client } from './api';
import type { ReviewSubmitPayload, ReviewResponse, CheckReviewStatusResponse } from '@/types/reviews';

interface SubmitReviewRequest {
  order_id: string;
  rating: number;
  comment?: string;
}

interface SubmitReviewResponse {
  success: boolean;
  data?: ReviewResponse;
  error?: { code: string; message: string };
}

interface CheckReviewResponse {
  success: boolean;
  data?: CheckReviewStatusResponse;
  error?: { code: string; message: string };
}

/**
 * POST /api/v1/reviews
 * Submit a review for a delivered order
 * @throws Error if API fails
 */
export async function submitOrderReview(
  payload: ReviewSubmitPayload,
  token: string
): Promise<ReviewResponse> {
  try {
    const response = await client.post<SubmitReviewResponse>('/api/v1/reviews', payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to submit review');
    }

    return response.data.data;
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message || 'Failed to submit review';
    throw new Error(message);
  }
}

/**
 * GET /api/v1/reviews/:orderId/check
 * Check if user has already reviewed this order
 * @throws Error if API fails
 */
export async function checkReviewStatus(
  orderId: string,
  token: string
): Promise<CheckReviewStatusResponse> {
  try {
    const response = await client.get<CheckReviewResponse>(
      `/api/v1/reviews/${orderId}/check`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to check review status');
    }

    return response.data.data;
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message || 'Failed to check review status';
    throw new Error(message);
  }
}
