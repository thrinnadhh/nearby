import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { client } from './api';
import logger from '@/utils/logger';

/**
 * Request push-notification permissions, obtain the device push token (raw
 * FCM token on Android / APNs token on iOS), and register it with the NearBy
 * backend so the server can send targeted FCM pushes to this device.
 *
 * This is a fire-and-forget call — errors are silently swallowed because
 * notification permission is optional and should never block the login flow.
 */
export async function registerPushToken(authToken: string): Promise<void> {
  // Android requires an explicit notification channel for FCM.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'NearBy',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Request permission — if denied, stop silently.
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // Get the raw device push token (FCM registration token on Android,
  // APNs device token on iOS). The backend fcm.js service uses this directly.
  const tokenData = await Notifications.getDevicePushTokenAsync();

  // Send to backend via shared client — stored in the user's profile row for downstream FCM use.
  // Errors are caught and logged silently; push-token registration must never block login.
  try {
    await client.patch(
      '/auth/profile',
      { push_token: tokenData.data, push_platform: tokenData.type },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
  } catch (err: unknown) {
    logger.warn('Push token registration failed — notifications may not work', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Top-level handler so foreground notifications display a banner.
 * Call this once at app startup (in _layout.tsx).
 */
export function configureForegroundNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}
