/**
 * Notification Router Utility (Task 10.7)
 * Maps notification data to deep-link routes
 */

import type { Href, useRouter } from 'expo-router';
import type { NotificationPayload } from '@/types/notifications';
import {
  NOTIFICATION_ROUTES,
  isValidNotificationPayload,
} from '@/constants/notifications';
import logger from '@/utils/logger';

/**
 * Convert notification payload to a navigable route
 * Returns null if payload is invalid
 */
export function getRouteFromNotification(payload: unknown): Href<string> | null {
  if (!isValidNotificationPayload(payload)) {
    logger.warn('Invalid notification payload received', { payload });
    return null;
  }

  const notification = payload as NotificationPayload;
  const { type, orderId, shopId } = notification;

  switch (type) {
    case 'order_detail':
      return {
        pathname: '/(tabs)/order-detail/[id]' as const,
        params: { id: orderId },
      };
    case 'tracking':
      return {
        pathname: '/(tabs)/tracking/[orderId]' as const,
        params: { orderId },
      };
    case 'review':
      return {
        pathname: '/(tabs)/reviews/compose/[orderId]' as const,
        params: { orderId },
      };
    case 'chat':
      return {
        pathname: '/chat/[shopId]' as const,
        params: { shopId: shopId || '' },
      };
    case 'refund_status':
      return {
        pathname: '/(tabs)/order-detail/[id]' as const,
        params: { id: orderId },
      };
    default:
      logger.warn('Unknown notification type', { type });
      return null;
  }
}

/**
 * Handle notification tap — navigate to appropriate screen
 * Idempotent: multiple taps on same notification navigate once
 */
export function handleNotificationTap(
  payload: unknown,
  router: ReturnType<typeof useRouter>
): void {
  const route = getRouteFromNotification(payload);

  if (!route) {
    logger.warn('Could not determine route for notification', { payload });
    return;
  }

  try {
    router.push(route);
    logger.info('Navigated from notification', { payload });
  } catch (err) {
    logger.error('Failed to navigate from notification', {
      payload,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
