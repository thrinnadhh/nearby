/**
 * Review types — customer reviews, ratings, submissions
 */

export interface ReviewSubmitPayload {
  order_id: string;
  rating: number; // 1–5 stars
  comment?: string;
}

export interface ReviewResponse {
  id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ReviewStore {
  submittedReviews: Record<string, ReviewResponse>; // order_id -> review
  loading: boolean;
  error: Error | null;

  // Actions
  submitReview: (orderId: string, payload: ReviewSubmitPayload) => Promise<ReviewResponse>;
  addOptimisticReview: (orderId: string, review: ReviewResponse) => void;
  removeOptimisticReview: (orderId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
}

export interface CheckReviewStatusResponse {
  has_reviewed: boolean;
  review?: ReviewResponse;
}
