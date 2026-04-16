import { client } from './api';
import type { GetShopReviewsParams, GetShopReviewsResponse } from '@/types';

/**
 * Review Service - Customer Review API Operations
 * 
 * Task 9.5: Review Submission
 * Handles review creation, retrieval, and management for delivery partners
 */

interface SubmitReviewRequest {
  order_id: string;
  reviewed_user_id: string;
  rating: number;
  review_text?: string;
}

interface ReviewSubmissionResponse {
  id: string;
  order_id: string;
  reviewed_user_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
}

interface ReviewEditsRequest {
  rating?: number;
  review_text?: string;
}

interface ReviewStatsResponse {
  average_rating: number;
  total_reviews: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

/** GET /shops/:shopId/reviews — paginated review list */
export async function getShopReviews(
  shopId: string,
  params: GetShopReviewsParams,
  token?: string
): Promise<GetShopReviewsResponse> {
  const { data } = await client.get<{ success: boolean } & GetShopReviewsResponse>(
    `/shops/${shopId}/reviews`,
    {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
  return { data: data.data, meta: data.meta };
}

/**
 * POST /api/v1/reviews/submit
 * Submit a review for a delivery partner or shop
 * 
 * Task 9.5: Allows customers to rate delivery partners after delivery
 */
export async function submitReview(
  payload: SubmitReviewRequest,
  token?: string
): Promise<ReviewSubmissionResponse> {
  const { data } = await client.post<{ success: boolean; data: ReviewSubmissionResponse }>(
    '/reviews/submit',
    payload,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
  return data.data;
}

/**
 * GET /api/v1/reviews/:orderId/check
 * Check if current user has already reviewed this order
 */
export async function checkReviewExists(
  orderId: string,
  token?: string
): Promise<{ hasReviewed: boolean; reviewId?: string }> {
  const { data } = await client.get<{
    success: boolean;
    data: { hasReviewed: boolean; reviewId?: string };
  }>(`/reviews/${orderId}/check`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data.data;
}

/**
 * GET /api/v1/reviews/:reviewId
 * Retrieve a specific review
 */
export async function getReview(reviewId: string, token?: string): Promise<any> {
  const { data } = await client.get(`/reviews/${reviewId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data.data;
}

/**
 * GET /api/v1/reviews/user/:userId/stats
 * Get review statistics for a user (average rating, distribution, etc.)
 */
export async function getReviewStats(
  userId: string,
  token?: string
): Promise<ReviewStatsResponse> {
  const { data } = await client.get<{
    success: boolean;
    data: ReviewStatsResponse;
  }>(`/reviews/user/${userId}/stats`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data.data;
}

/**
 * PATCH /api/v1/reviews/:reviewId
 * Update an existing review
 */
export async function updateReview(
  reviewId: string,
  payload: ReviewEditsRequest,
  token?: string
): Promise<ReviewSubmissionResponse> {
  const { data } = await client.patch<{
    success: boolean;
    data: ReviewSubmissionResponse;
  }>(`/reviews/${reviewId}`, payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data.data;
}

/**
 * DELETE /api/v1/reviews/:reviewId
 * Delete a review (soft or hard delete as per backend policy)
 */
export async function deleteReview(reviewId: string, token?: string): Promise<void> {
  await client.delete(`/reviews/${reviewId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

/**
 * GET /api/v1/reviews/user/:userId/list
 * Get all reviews written by current user (paginated)
 */
export async function getReviewsForUser(
  userId: string,
  params?: { page?: number; limit?: number },
  token?: string
): Promise<any> {
  const { data } = await client.get(`/reviews/user/${userId}/list`, {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}
