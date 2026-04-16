/**
 * Notification constants and routes
 */

export const NOTIFICATION_ROUTES = {
  order_detail: '/(tabs)/order-detail/[id]',
  tracking: '/(tabs)/tracking/[orderId]',
  review: '/(tabs)/reviews/compose/[orderId]',
  chat: '/chat/[shopId]',
  refund_status: '/(tabs)/order-detail/[id]',
} as const;

export const NOTIFICATION_ACTIONS = [
  'order_detail',
  'tracking',
  'review',
  'chat',
  'refund_status',
] as const;

/**
 * Validate notification payload structure
 */
export function isValidNotificationPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;

  const payload = data as Record<string, any>;
  const { type, orderId } = payload;

  // type is required and must be valid
  if (!type || !NOTIFICATION_ACTIONS.includes(type)) return false;

  // Most actions require orderId
  if (['order_detail', 'tracking', 'review', 'refund_status'].includes(type)) {
    if (!orderId || typeof orderId !== 'string') return false;
  }

  // chat requires shopId
  if (type === 'chat') {
    if (!payload.shopId || typeof payload.shopId !== 'string') return false;
  }

  return true;
}
