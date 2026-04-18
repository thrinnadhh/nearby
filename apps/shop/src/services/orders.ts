/**
 * Orders service — fetch, accept, and reject orders
 */

import axios from 'axios';
import { client } from './api';
import { ORDER_ENDPOINTS } from '@/constants/api';
import {
  Order,
  OrdersListResponse,
  OrderDetailResponse,
  AcceptOrderPayload,
  RejectOrderPayload,
  OrderActionResponse,
} from '@/types/orders';
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
 * GET /orders — Fetch all orders for the authenticated shop
 * Backend filters by JWT shopId, no need to pass it
 */
export async function getOrders(
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<OrdersListResponse> {
  try {
    const params = { page, limit, ...(status ? { status } : {}) };

    const { data } = await client.get<OrdersListResponse>(
      ORDER_ENDPOINTS.LIST_ORDERS,
      { params }
    );

    logger.info('Orders fetched', { page, limit, count: data.data.length });
    return data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to fetch orders', { error: message });
    throw new AppError('ORDERS_FETCH_FAILED', message);
  }
}

/**
 * GET /orders/:id — Fetch single order detail (backend authoritative)
 * Verifies that order belongs to authenticated shop owner's shop
 */
export async function getOrderDetail(orderId: string): Promise<Order> {
  try {
    const url = ORDER_ENDPOINTS.GET_ORDER.replace(':id', orderId);
    const { data } = await client.get<OrderDetailResponse>(url);

    logger.info('Order detail fetched', { orderId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to fetch order detail', { orderId, error: message });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new AppError(
        'ORDER_NOT_AUTHORIZED',
        'You are not authorized to access this order',
        403
      );
    }

    throw new AppError('ORDER_DETAIL_FETCH_FAILED', message);
  }
}

/**
 * PATCH /orders/:id/accept — Accept order
 * State machine: status must be 'pending' → 'accepted'
 * Emits Socket.IO 'order:accepted' event to order room
 */
export async function acceptOrder(orderId: string): Promise<Order> {
  try {
    const url = ORDER_ENDPOINTS.ACCEPT_ORDER.replace(':id', orderId);
    const payload: AcceptOrderPayload = { status: 'accepted' };

    const { data } = await client.patch<OrderDetailResponse>(url, payload);

    logger.info('Order accepted', { orderId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to accept order', { orderId, error: message });

    if (axios.isAxiosError(error)) {
      const code = (error.response?.data as { error?: { code?: string } })
        ?.error?.code;
      if (code === 'ORDER_ALREADY_ACCEPTED') {
        throw new AppError(
          'ORDER_ALREADY_ACCEPTED',
          'Order has already been accepted',
          409
        );
      }
      if (code === 'ORDER_EXPIRED') {
        throw new AppError(
          'ORDER_EXPIRED',
          'Order acceptance window has expired',
          409
        );
      }
      if (error.response?.status === 404) {
        throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
    }

    throw new AppError('ORDER_ACCEPT_FAILED', message);
  }
}

/**
 * PATCH /orders/:id/reject — Reject order with reason
 * State machine: status must be 'pending' → 'cancelled'
 * Reason should explain why (out of stock, shop closed, etc.)
 */
export async function rejectOrder(
  orderId: string,
  reason: string
): Promise<Order> {
  try {
    const url = ORDER_ENDPOINTS.REJECT_ORDER.replace(':id', orderId);
    const payload: RejectOrderPayload = { status: 'rejected', reason };

    const { data } = await client.patch<OrderDetailResponse>(url, payload);

    logger.info('Order rejected', { orderId, reason });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to reject order', { orderId, error: message });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      if (error.response?.status === 409) {
        throw new AppError(
          'ORDER_CANNOT_REJECT',
          'This order cannot be rejected',
          409
        );
      }
    }

    throw new AppError('ORDER_REJECT_FAILED', message);
  }
}
