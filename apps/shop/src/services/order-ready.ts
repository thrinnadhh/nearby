/**
 * Order marking service — mark order as ready for pickup
 * This should be merged into services/orders.ts
 * PATCH /orders/:id/ready endpoint
 */

import axios from 'axios';
import { client } from './api';
import { Order, OrderDetailResponse } from '@/types/orders';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: { message?: string } })
      ?.error?.message;
    return message || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * PATCH /orders/:id/ready — Mark order as ready for customer pickup
 * State machine: status must be 'accepted' or 'packing' → 'ready'
 * Called after shop owner completes packing
 * Emits Socket.IO 'order:ready' event to order room
 * Customer receives notification that order is ready
 */
export async function markOrderReady(orderId: string): Promise<Order> {
  try {
    const url = `/orders/${orderId}/ready`;
    const payload = {}; // No data needed, just marking status

    const { data } = await client.patch<OrderDetailResponse>(url, payload);

    logger.info('Order marked as ready', { orderId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to mark order ready', { orderId, error: message });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      if (error.response?.status === 409) {
        throw new AppError(
          'ORDER_STATUS_INVALID',
          'Order is not in a valid state for marking as ready',
          409
        );
      }
    }

    throw new AppError('ORDER_MARK_READY_FAILED', message);
  }
}
