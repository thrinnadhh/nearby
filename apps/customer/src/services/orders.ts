import { api } from './api';
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
  }>(`/api/v1/orders/${orderId}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to fetch order');
  }

  return response.data.data;
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
  }>(`/api/v1/payments/initiate`, { order_id: orderId });

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
  }>(`/api/v1/payments/${orderId}`);

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
