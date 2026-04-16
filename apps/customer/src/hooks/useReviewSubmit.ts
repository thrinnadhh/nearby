/**
 * useReviewSubmit hook — submit review with optimistic update and rollback
 */

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { submitOrderReview } from '@/services/reviews-submit';
import type { ReviewSubmitPayload, ReviewResponse } from '@/types/reviews';
import logger from '@/utils/logger';

interface UseReviewSubmitResult {
  loading: boolean;
  error: Error | null;
  submit: (rating: number, comment?: string) => Promise<void>;
}

export function useReviewSubmit(orderId: string): UseReviewSubmitResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const token = useAuthStore((s) => s.token);
  const { activeOrder, setActiveOrder } = useOrdersStore();

  const submit = useCallback(
    async (rating: number, comment?: string) => {
      if (!token) {
        setError(new Error('Not authenticated'));
        return;
      }

      setLoading(true);
      setError(null);

      // Store previous state in case we need to rollback
      const previousOrder = activeOrder;

      try {
        const payload: ReviewSubmitPayload = {
          order_id: orderId,
          rating,
          comment,
        };

        const response = await submitOrderReview(payload, token);

        // Server returned review — update store with real data
        if (previousOrder) {
          setActiveOrder({
            ...previousOrder,
            review: response,
          });
        }

        logger.info('Review submitted successfully', { orderId, rating });
      } catch (err) {
        // Rollback optimistic update on error
        if (previousOrder) {
          setActiveOrder(previousOrder);
        }

        const errorMsg = err instanceof Error ? err.message : 'Failed to submit review';
        setError(new Error(errorMsg));
        logger.error('Failed to submit review', { orderId, error: errorMsg });
      } finally {
        setLoading(false);
      }
    },
    [token, orderId, activeOrder, setActiveOrder]
  );

  return { loading, error, submit };
}
