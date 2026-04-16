import { api } from './api';
import { client } from './api';
import type { Order } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface CreateOrderPayload {
  shop_id: string;
  items: Array<{
    product_id: string;
    name: string;
    qty: number;
    price: number; // Will be validated server-side
  }>;
  delivery_address: string;
  delivery_coords: { lat: number; lng: number };
  payment_method: 'upi' | 'cod';
  total_paise: number;
  idempotency_key: string;
}

interface CreateOrderResponse {
  success: boolean;
  data?: { id: string; status: string };
  error?: { code: string; message: string };
}

/**
 * Create an order.
 * @throws Error if API fails
 */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const response = await api.post<CreateOrderResponse>('/api/v1/orders', payload);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to create order');
  }

  const { id } = response.data.data;
  return getOrder(id);
}

/**
 * Fetch a single order by ID.
 */
export async function getOrder(orderId: string): Promise<Order> {
  const response = await api.get<{
    success: boolean;
    data?: Order;
    error?: { code: string; message: string };
  }>(\`/api/v1/orders/${orderId}\`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to fetch order');
  }

  return response.data.data;
}

/**
 * Get order detail with full information (Task 10.2)
 * Includes: timeline, items, partner info, refund status
 */
export async function getOrderDetail(
  orderId: string,
  token?: string
): Promise<Order> {
  try {
    const response = await client.get<{
      success: boolean;
      data?: Order;
      error?: { code: string; message: string };
    }>(\`/api/v1/orders/${orderId}\`, {
      headers: token ? { Authorization: \`Bearer ${token}\` } : undefined,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Order not found');
    }

    return response.data.data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to fetch order details');
  }
}

/**
 * Fetch all orders for the current user.
 */
export async function getOrders(): Promise<Order[]> {
  const response = await api.get<{
    success: boolean;
    data?: Order[];
    error?: { code: string; message: string };
  }>('/api/v1/orders');

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to fetch orders');
  }

  return response.data.data;
}

/**
 * Cancel an order by ID with reason (Task 10.3)
 * Only works for orders in 'pending' or 'accepted' status
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  token?: string
): Promise<void> {
  try {
    const response = await client.patch<{
      success: boolean;
      error?: { code: string; message: string };
    }>(
      \`/api/v1/orders/${orderId}/cancel\`,
      { reason },
      {
        headers: token ? { Authorization: \`Bearer ${token}\` } : undefined,
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to cancel order');
    }
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to cancel order');
  }
}

/**
 * Reorder items from a previous order (Task 10.4)
 * Checks availability and current prices, prefills cart
 */
export async function reorderFromOrder(
  orderId: string,
  deliveryAddress: string,
  deliveryCoords: [number, number],
  token?: string
): Promise<{
  newOrderId: string;
  unavailableItems: string[];
  priceChanges: Array<{
    productId: string;
    oldPrice: number;
    newPrice: number;
  }>;
}> {
  try {
    const response = await client.post<{
      success: boolean;
      data?: {
        new_order_id?: string;
        order_id?: string;
        unavailable_items?: string[];
        price_changes?: Array<{
          product_id: string;
          old_price: number;
          new_price: number;
        }>;
      };
      error?: { code: string; message: string };
    }>(
      \`/api/v1/orders/${orderId}/reorder\`,
      {
        delivery_address: deliveryAddress,
        delivery_coords: deliveryCoords,
      },
      {
        headers: token ? { Authorization: \`Bearer ${token}\` } : undefined,
      }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to reorder');
    }

    const data = response.data.data;
    return {
      newOrderId: data.new_order_id || data.order_id || '',
      unavailableItems: data.unavailable_items || [],
      priceChanges: data.price_changes?.map((pc) => ({
        productId: pc.product_id,
        oldPrice: pc.old_price,
        newPrice: pc.new_price,
      })) || [],
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to reorder');
  }
}

/**
 * Initiate a payment session via Cashfree (UPI/Card).
 * Returns payment link for deep-linking into Cashfree checkout.
 */
export async function initiatePayment(orderId: string): Promise<{
  session_url: string;
  order_id: string;
}> {
  const response = await api.post<{
    success: boolean;
    data?: { session_url: string; order_id: string };
    error?: { code: string; message: string };
  }>(\`/api/v1/payments/initiate\`, { order_id: orderId });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to initiate payment');
  }

  return response.data.data;
}

/**
 * Get payment status for an order.
 */
export async function getPaymentStatus(
  orderId: string
): Promise<{
  status: string;
  paid: boolean;
  error?: string;
}> {
  const response = await api.get<{
    success: boolean;
    data?: { status: string; paid: boolean; error?: string };
    error?: { code: string; message: string };
  }>(\`/api/v1/payments/${orderId}\`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to get payment status');
  }

  return response.data.data;
}

/**
 * Generate a unique idempotency key for order creation.
 */
export function generateIdempotencyKey(): string {
  return uuidv4();
}
