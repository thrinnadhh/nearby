import { client } from './api';

/**
 * Order History Service (Task 9.7)
 * 
 * Handles order retrieval with pagination, filtering, and sorting
 */

export type OrderStatus = 'pending' | 'accepted' | 'packing' | 'ready' | 'assigned' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected';

export interface OrderHistoryParams {
  page?: number;
  limit?: number;
  status?: OrderStatus | OrderStatus[];
  sort_by?: 'created_at' | 'updated_at' | 'total_amount';
  sort_order?: 'asc' | 'desc';
}

export interface OrderHistoryResponse {
  data: any[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * GET /api/v1/orders
 * Get customer's order history with pagination and filtering
 * 
 * Supports:
 * - Pagination (page, limit)
 * - Status filtering (single or multiple)
 * - Sorting by date or amount
 */
export async function getOrderHistory(
  params: OrderHistoryParams,
  token?: string
): Promise<OrderHistoryResponse> {
  const { data } = await client.get<{ success: boolean } & OrderHistoryResponse>(
    '/orders',
    {
      params: {
        page: params.page || 1,
        limit: params.limit || 10,
        ...(params.status && { 
          status: Array.isArray(params.status) 
            ? params.status.join(',') 
            : params.status 
        }),
        sort_by: params.sort_by || 'created_at',
        sort_order: params.sort_order || 'desc',
      },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
  return { data: data.data, meta: data.meta };
}

/**
 * GET /api/v1/orders/:id
 * Get detailed order information
 */
export async function getOrderDetail(orderId: string, token?: string): Promise<any> {
  const { data } = await client.get(`/orders/${orderId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data.data;
}

/**
 * POST /api/v1/orders/:id/reorder
 * Re-order the same items from a previous order
 * 
 * Returns: New order ID
 */
export async function reorderFromHistory(
  previousOrderId: string,
  deliveryAddress: {
    address: string;
    coordinates: [number, number];
  },
  token?: string
): Promise<{ order_id: string; order_status: string }> {
  const { data } = await client.post(
    `/orders/${previousOrderId}/reorder`,
    {
      delivery_address: deliveryAddress.address,
      delivery_coordinates: deliveryAddress.coordinates,
    },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
  return data.data;
}

/**
 * GET /api/v1/orders/:id/status
 * Get current order status (for polling)
 */
export async function getOrderStatus(orderId: string, token?: string): Promise<any> {
  const { data } = await client.get(`/orders/${orderId}/status`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data.data;
}

/**
 * Helper: Get friendly status label
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Waiting for shop',
    accepted: 'Shop accepted',
    packing: 'Being packed',
    ready: 'Ready for pickup',
    assigned: 'Assigned to partner',
    picked_up: 'Picked up',
    out_for_delivery: 'On the way',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
  };
  return labels[status] || status;
}

/**
 * Helper: Get status color for UI
 */
export function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return '#10b981';
    case 'cancelled':
    case 'rejected':
      return '#ef4444';
    case 'pending':
    case 'packing':
      return '#f59e0b';
    case 'accepted':
    case 'ready':
      return '#3b82f6';
    case 'assigned':
    case 'picked_up':
    case 'out_for_delivery':
      return '#8b5cf6';
    default:
      return '#6b7280';
  }
}

/**
 * Helper: Get status icon emoji
 */
export function getStatusIcon(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return '✓';
    case 'cancelled':
    case 'rejected':
      return '✗';
    case 'pending':
      return '⏳';
    case 'accepted':
      return '👍';
    case 'packing':
      return '📦';
    case 'ready':
      return '✅';
    case 'assigned':
    case 'picked_up':
      return '🚗';
    case 'out_for_delivery':
      return '🚚';
    default:
      return '•';
  }
}
