import { supabase } from './supabase.js';
import { emitOrderEvent } from '../socket/ioRegistry.js';
import { assignDeliveryQueue } from '../jobs/assignDelivery.js';
import logger from '../utils/logger.js';
import {
  AppError,
  ORDER_NOT_FOUND,
  FORBIDDEN,
  ORDER_INVALID_TRANSITION,
  INTERNAL_ERROR,
} from '../utils/errors.js';

// Exact column names from 004_orders.sql
const ORDER_SELECT = `
  id, customer_id, shop_id, delivery_partner_id, status,
  total_paise, payment_method, payment_status, payment_id,
  cashfree_order_id, idempotency_key, accepted_at, delivered_at,
  created_at, updated_at
`;

/**
 * Map a raw DB order row to the camelCase API response shape.
 * Keeps DB internals (cashfree_order_id, idempotency_key) out of the public response.
 */
function toOrderResponse(order) {
  return Object.freeze({
    id: order.id,
    customerId: order.customer_id,
    shopId: order.shop_id,
    deliveryPartnerId: order.delivery_partner_id,
    status: order.status,
    totalPaise: order.total_paise,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    acceptedAt: order.accepted_at,
    deliveredAt: order.delivered_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  });
}

async function _fetchOrder(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .single();

  if (error || !data) {
    throw new AppError(ORDER_NOT_FOUND, 'Order not found.', 404);
  }

  return data;
}

function _assertOwnership(order, userId) {
  if (order.delivery_partner_id !== userId) {
    throw new AppError(FORBIDDEN, 'You are not assigned to this order.', 403);
  }
}

function _assertStatus(order, allowedStatuses) {
  if (!allowedStatuses.includes(order.status)) {
    throw new AppError(
      ORDER_INVALID_TRANSITION,
      `Invalid transition: order is '${order.status}', expected one of: ${allowedStatuses.join(', ')}`,
      409
    );
  }
}

/**
 * List orders for the authenticated delivery partner, optionally filtered by status.
 */
export async function listOrders(userId, statusFilter) {
  let query = supabase
    .from('orders')
    .select(`${ORDER_SELECT}, order_items(*)`)
    .eq('delivery_partner_id', userId);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new AppError(INTERNAL_ERROR, 'Failed to fetch orders.', 500);
  }

  return (data || []).map(toOrderResponse);
}

/**
 * Acknowledge assignment — no status change; used to confirm awareness.
 * The order stays 'assigned' until pickup.
 */
export async function acceptAssignment(userId, orderId) {
  const order = await _fetchOrder(orderId);
  _assertOwnership(order, userId);
  _assertStatus(order, ['assigned']);

  emitOrderEvent(orderId, 'order:status_updated', { orderId, status: order.status });

  logger.info('Delivery partner accepted assignment', { orderId, userId });
  return toOrderResponse(order);
}

/**
 * Reject assignment — resets partner back to null and re-queues the assign job.
 */
export async function rejectAssignment(userId, orderId) {
  const order = await _fetchOrder(orderId);
  _assertOwnership(order, userId);
  _assertStatus(order, ['assigned']);

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('orders')
    .update({ delivery_partner_id: null, status: 'ready', updated_at: now })
    .eq('id', orderId)
    .eq('status', 'assigned')
    .select()
    .single();

  if (error || !updated) {
    throw new AppError(
      ORDER_INVALID_TRANSITION,
      'Assignment could not be processed. Please try again.',
      409
    );
  }

  // Enqueue AFTER confirmed DB update — prevents duplicate jobs from concurrent calls
  await assignDeliveryQueue.add('assign-delivery', {
    orderId,
    shopId: order.shop_id,
    customerId: order.customer_id,
  });

  emitOrderEvent(orderId, 'order:status_updated', { orderId, status: updated.status });

  logger.info('Delivery partner rejected order, re-assigning', { orderId, userId });
  return toOrderResponse(updated);
}

/**
 * Transition assigned → picked_up.
 */
export async function markPickedUp(userId, orderId) {
  const order = await _fetchOrder(orderId);
  _assertOwnership(order, userId);
  _assertStatus(order, ['assigned']);

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('orders')
    .update({ status: 'picked_up', updated_at: now })
    .eq('id', orderId)
    .eq('status', 'assigned')
    .select()
    .single();

  if (error || !updated) {
    throw new AppError(ORDER_INVALID_TRANSITION, 'Failed to mark order as picked up.', 409);
  }

  const { notifyCustomerQueue } = await import('../jobs/notifyCustomer.js');
  await notifyCustomerQueue.add('notify-customer', {
    orderId,
    customerId: order.customer_id,
    status: 'picked_up',
  });

  emitOrderEvent(orderId, 'order:status_updated', { orderId, status: 'picked_up' });

  logger.info('Order picked up', { orderId, userId });
  return toOrderResponse(updated);
}

/**
 * Transition picked_up|out_for_delivery → delivered.
 */
export async function markDelivered(userId, orderId) {
  const order = await _fetchOrder(orderId);
  _assertOwnership(order, userId);
  _assertStatus(order, ['picked_up', 'out_for_delivery']);

  const deliveredAt = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('orders')
    .update({ status: 'delivered', delivered_at: deliveredAt, updated_at: deliveredAt })
    .eq('id', orderId)
    .in('status', ['picked_up', 'out_for_delivery'])
    .select()
    .single();

  if (error || !updated) {
    throw new AppError(ORDER_INVALID_TRANSITION, 'Failed to mark order as delivered.', 409);
  }

  const { notifyCustomerQueue } = await import('../jobs/notifyCustomer.js');
  await notifyCustomerQueue.add('notify-customer', {
    orderId,
    customerId: order.customer_id,
    status: 'delivered',
  });

  emitOrderEvent(orderId, 'order:status_updated', { orderId, status: 'delivered' });

  logger.info('Order delivered', { orderId, userId, deliveredAt });
  return toOrderResponse(updated);
}
