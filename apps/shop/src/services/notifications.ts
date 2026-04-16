/**
 * Firebase FCM notification service
 * Handles token registration and deep-link routing
 */

import * as Notifications from 'expo-notifications';
import logger from '@/utils/logger';

/**
 * Configure notification appearance when app is in foreground
 * Call this at module load time (in _layout.tsx)
 */
export function configureForegroundNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      logger.info('Foreground notification received', {
        title: notification.request.content.title,
      });

      // Always show notification even if app is in foreground
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
}

/**
 * Get FCM token for this device
 * Returns null if permissions not granted
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) {
      logger.warn('Notification permissions not granted');
      return null;
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EAS_PROJECT_ID || 'nearby-shop',
      })
    ).data;

    logger.info('FCM token obtained', { token: token.substring(0, 20) + '...' });
    return token;
  } catch (error) {
    logger.error('Failed to get FCM token', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    logger.info('Notification permissions requested', { granted });
    return granted;
  } catch (error) {
    logger.error('Failed to request notification permissions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Listen to notification responses (user tapped notification)
 * Returns cleanup function to remove listener
 */
export function onNotificationResponse(
  callback: (notification: Notifications.Notification) => void
): () => void {
  const listener = Notifications.addNotificationResponseReceivedListener(
    ({ notification }) => {
      logger.info('Notification response', {
        title: notification.request.content.title,
      });
      callback(notification);
    }
  );

  // Return cleanup function
  return () => {
    listener.remove();
  };
}
