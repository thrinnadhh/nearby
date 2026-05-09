import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { client } from './api';
import logger from '@/utils/logger';

// expo-notifications Android push support was removed from Expo Go in SDK 53.
// We guard all usage behind a runtime check so the app works in Expo Go
// (dev/testing) without crashing, while still working in production builds.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

type NotificationsModule = typeof import('expo-notifications');

function getNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

/**
 * Request push-notification permissions, obtain the device push token (raw
 * FCM token on Android / APNs token on iOS), and register it with the NearBy
 * backend so the server can send targeted FCM pushes to this device.
 *
 * This is a fire-and-forget call — errors are silently swallowed because
 * notification permission is optional and should never block the login flow.
 * In Expo Go this is a no-op (push notifications are not supported there).
 */
export async function registerPushToken(authToken: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) {
    logger.info('[notifications] Push token registration skipped in Expo Go');
    return;
  }

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
 * In Expo Go this is a no-op.
 */
export function configureForegroundNotifications(): void {
  const Notifications = getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
