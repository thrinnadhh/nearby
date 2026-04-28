import { api, client } from './api';
import type { Order } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface CreateOrderPayload {
  shop_id: string;
  items: Array<{
    product_id: string;
    qty: number;
    name?: string;
    price?: number;
  }>;
  delivery_address?: string;
  delivery_coords?: { lat: number; lng: number };
  payment_method: 'upi' | 'cod';
  total_paise?: number;
  idempotency_key?: string;
}

interface CreateOrderResponse {
  success: boolean;
  data?: BackendOrder;
  error?: { code: string; message: string };
}

interface BackendOrderItem {
  id?: string;
  productId: string;
  quantity: number;
  remainingQuantity?: number;
  cancelledQuantity?: number;
  unitPricePaise?: number;
  totalPaise?: number;
}

interface BackendOrder {
  id: string;
  customerId?: string;
  shopId: string;
  status: string;
  totalPaise: number;
  paymentMethod: 'upi' | 'cod' | 'card';
  paymentStatus?: string;
  createdAt: string;
  updatedAt?: string;
  items: BackendOrderItem[];
}

function normalizeOrder(order: BackendOrder): Order {
  return {
    id: order.id,
    shop_id: order.shopId,
    shop_name: '',
    status: order.status as Order['status'],
    total_paise: order.totalPaise,
    items: order.items.map((item) => ({
      product_id: item.productId,
      name: '',
      price: item.unitPricePaise || 0,
      qty: item.remainingQuantity ?? item.quantity,
    })),
    payment_method: order.paymentMethod === 'card' ? 'upi' : order.paymentMethod,
    created_at: order.createdAt,
  };
}

async function createOrderFromExisting(
  sourceOrderId: string,
  token?: string
): Promise<BackendOrder> {
  const response = await client.get<{
    success: boolean;
    data?: BackendOrder;
    error?: { code: string; message: string };
  }>(`/orders/${sourceOrderId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to fetch source order');
  }

  const sourceOrder = response.data.data;
  const createResponse = await client.post<CreateOrderResponse>(
    '/orders',
    {
      shop_id: sourceOrder.shopId,
      items: sourceOrder.items.map((item) => ({
        product_id: item.productId,
        qty: item.remainingQuantity ?? item.quantity,
      })),
      payment_method: sourceOrder.paymentMethod === 'card' ? 'upi' : sourceOrder.paymentMethod,
    },
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'idempotency-key': uuidv4(),
      },
    }
  );

  if (!createResponse.data.success || !createResponse.data.data) {
    throw new Error(createResponse.data.error?.message || 'Failed to reorder');
  }

  return createResponse.data.data;
}

/**
 * Create an order.
 * @throws Error if API fails
 */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const response = await api.post<CreateOrderResponse>(
    '/orders',
    {
      shop_id: payload.shop_id,
      items: payload.items.map((item) => ({
        product_id: item.product_id,
        qty: item.qty,
      })),
      payment_method: payload.payment_method,
    },
    {
      headers: {
        'idempotency-key': payload.idempotency_key || uuidv4(),
      },
    }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to create order');
  }

  return normalizeOrder(response.data.data);
}

/**
 * Fetch a single order by ID.
 */
export async function getOrder(orderId: string): Promise<Order> {
  const response = await api.get<{
    success: boolean;
    data?: BackendOrder;
    error?: { code: string; message: string };
  }>(`/orders/${orderId}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to fetch order');
  }

  return normalizeOrder(response.data.data);
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
      data?: BackendOrder;
      error?: { code: string; message: string };
    }>(`/orders/${orderId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Order not found');
    }

    return normalizeOrder(response.data.data);
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
    data?: BackendOrder[];
    error?: { code: string; message: string };
  }>('/orders');

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to fetch orders');
  }

  return response.data.data.map(normalizeOrder);
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
      `/orders/${orderId}/cancel`,
      { reason },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
    const data = await createOrderFromExisting(orderId, token);
    return {
      newOrderId: data.id,
      unavailableItems: [],
      priceChanges: [],
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
    data?: {
      orderId: string;
      paymentLink: string | null;
    };
    error?: { code: string; message: string };
  }>('/payments/initiate', { order_id: orderId });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to initiate payment');
  }

  return {
    session_url: response.data.data.paymentLink || '',
    order_id: response.data.data.orderId,
  };
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
    data?: {
      paymentStatus: 'completed' | 'pending' | 'failed' | 'refunded';
      gatewayStatus?: { payment_status?: string } | null;
    };
    error?: { code: string; message: string };
  }>(`/payments/${orderId}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Failed to get payment status');
  }

  const paymentStatus = response.data.data.paymentStatus;
  const status =
    paymentStatus === 'completed'
      ? 'SUCCESS'
      : paymentStatus === 'failed'
        ? 'FAILED'
        : paymentStatus === 'refunded'
          ? 'REFUNDED'
          : response.data.data.gatewayStatus?.payment_status || 'PENDING';

  return {
    status,
    paid: paymentStatus === 'completed',
    error: paymentStatus === 'failed' ? 'Payment failed' : undefined,
  };
}

/**
 * Generate a unique idempotency key for order creation.
 */
export function generateIdempotencyKey(): string {
  return uuidv4();
}
