/**
 * Assignment service — handles delivery order assignment API calls
 */

import axios from 'axios';
import { client } from './api';
import { AppErrorClass } from '@/types/common';
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
 * GET /api/v1/delivery/orders
 * List orders assigned to the authenticated delivery partner
 */
export async function listDeliveryOrders(status?: string): Promise<any> {
  try {
    const params = status ? { status } : undefined;
    const { data } = await client.get<{ success: boolean; data: any }>(
      '/delivery/orders',
      { params }
    );

    logger.info('Delivery orders retrieved successfully', {
      count: data.data.length,
      status,
    });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to retrieve delivery orders', {
      error: message,
      status,
    });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new AppErrorClass('UNAUTHORIZED', 'Please log in again', 401);
      }
      if (error.response?.status === 429) {
        throw new AppErrorClass(
          'RATE_LIMITED',
          'Too many requests. Try again later.',
          429
        );
      }
    }

    throw new AppErrorClass('LIST_ORDERS_FAILED', message);
  }
}

/**
 * PATCH /api/v1/delivery/orders/:orderId/accept
 * Accept a delivery assignment
 */
export async function acceptAssignment(orderId: string): Promise<any> {
  try {
    const { data } = await client.patch<{ success: boolean; data: any }>(
      `/delivery/orders/${orderId}/accept`,
      {}
    );

    logger.info('Assignment accepted successfully', { orderId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to accept assignment', { orderId, error: message });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new AppErrorClass('UNAUTHORIZED', 'Please log in again', 401);
      }
      if (error.response?.status === 404) {
        throw new AppErrorClass('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      if (error.response?.status === 409) {
        throw new AppErrorClass(
          'ORDER_ALREADY_ASSIGNED',
          'This order was already assigned to another partner',
          409
        );
      }
      if (error.response?.status === 429) {
        throw new AppErrorClass(
          'RATE_LIMITED',
          'Too many requests. Try again later.',
          429
        );
      }
    }

    throw new AppErrorClass('ACCEPT_FAILED', message);
  }
}

/**
 * PATCH /api/v1/delivery/orders/:orderId/reject
 * Reject a delivery assignment
 */
export async function rejectAssignment(orderId: string): Promise<any> {
  try {
    const { data } = await client.patch<{ success: boolean; data: any }>(
      `/delivery/orders/${orderId}/reject`,
      {}
    );

    logger.info('Assignment rejected successfully', { orderId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to reject assignment', { orderId, error: message });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new AppErrorClass('UNAUTHORIZED', 'Please log in again', 401);
      }
      if (error.response?.status === 404) {
        throw new AppErrorClass('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      if (error.response?.status === 429) {
        throw new AppErrorClass(
          'RATE_LIMITED',
          'Too many requests. Try again later.',
          429
        );
      }
    }

    throw new AppErrorClass('REJECT_FAILED', message);
  }
}

/**
 * PATCH /api/v1/delivery/orders/:orderId/pickup
 * Mark order as picked up
 */
export async function markPickedUp(orderId: string): Promise<any> {
  try {
    const { data } = await client.patch<{ success: boolean; data: any }>(
      `/delivery/orders/${orderId}/pickup`,
      {}
    );

    logger.info('Order marked as picked up', { orderId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to mark order as picked up', { orderId, error: message });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new AppErrorClass('UNAUTHORIZED', 'Please log in again', 401);
      }
      if (error.response?.status === 404) {
        throw new AppErrorClass('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      if (error.response?.status === 400) {
        throw new AppErrorClass(
          'INVALID_STATUS',
          'Order is not in assigned state',
          400
        );
      }
      if (error.response?.status === 429) {
        throw new AppErrorClass(
          'RATE_LIMITED',
          'Too many requests. Try again later.',
          429
        );
      }
    }

    throw new AppErrorClass('PICKUP_FAILED', message);
  }
}

/**
 * PATCH /api/v1/delivery/orders/:orderId/deliver
 * Mark order as delivered
 */
export async function markDelivered(orderId: string): Promise<any> {
  try {
    const { data } = await client.patch<{ success: boolean; data: any }>(
      `/delivery/orders/${orderId}/deliver`,
      {}
    );

    logger.info('Order marked as delivered', { orderId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to mark order as delivered', {
      orderId,
      error: message,
    });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new AppErrorClass('UNAUTHORIZED', 'Please log in again', 401);
      }
      if (error.response?.status === 404) {
        throw new AppErrorClass('ORDER_NOT_FOUND', 'Order not found', 404);
      }
      if (error.response?.status === 400) {
        throw new AppErrorClass(
          'INVALID_STATUS',
          'Order is not in picked up state',
          400
        );
      }
      if (error.response?.status === 429) {
        throw new AppErrorClass(
          'RATE_LIMITED',
          'Too many requests. Try again later.',
          429
        );
      }
    }

    throw new AppErrorClass('DELIVER_FAILED', message);
  }
}
