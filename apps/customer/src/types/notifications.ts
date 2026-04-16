/**
 * Notification types — FCM payloads, deep-link routing, notification state
 */

export type NotificationAction =
  | 'order_detail'
  | 'tracking'
  | 'review'
  | 'chat'
  | 'refund_status';

export interface NotificationPayload {
  type: NotificationAction;
  orderId: string;
  shopId?: string;
  message: string;
  timestamp?: string;
}

export interface DeepLinkAction {
  action: NotificationAction;
  orderId?: string;
  shopId?: string;
}

export interface NotificationStore {
  pendingNotifications: NotificationPayload[];
  seenNotificationIds: Set<string>;
  loading: boolean;

  // Actions
  addNotification: (notification: NotificationPayload) => void;
  markAsSeen: (notificationId: string) => void;
  clearNotifications: () => void;
  setLoading: (loading: boolean) => void;
}

export interface NotificationRouter {
  route: (payload: NotificationPayload) => string; // route to push
  validate: (payload: unknown) => boolean; // deep-link validation
}
