/**
 * useFCM hook — Firebase Cloud Messaging setup and notification handling
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { useNotificationsStore } from '@/store/notifications';
import {
  configureForegroundNotifications,
  getFCMToken,
  requestNotificationPermissions,
  onNotificationResponse,
} from '@/services/notifications';
import * as Notifications from 'expo-notifications';
import logger from '@/utils/logger';

interface UseFCMActions {
  registerFCMToken: () => Promise<string | null>;
  requestPermissions: () => Promise<boolean>;
  retryRegistration: () => Promise<void>;
}

/**
 * Initialize FCM and handle notification deep-links
 */
export function useFCM(): UseFCMActions {
  const { setDeepLinkTarget } = useNotificationsStore();

  // Configure foreground notifications on mount
  useEffect(() => {
    configureForegroundNotifications();
  }, []);

  // Listen for notification taps and handle deep-links
  useEffect(() => {
    const unsubscribe = onNotificationResponse((notification) => {
      const deepLink = notification.request.content.data?.deepLink;
      if (deepLink) {
        logger.info('Notification deep-link', { deepLink });
        setDeepLinkTarget(deepLink);
      }
    });

    return unsubscribe;
  }, [setDeepLinkTarget]);

  const registerFCMToken = useCallback(async (): Promise<string | null> => {
    try {
      // Request permissions first
      const granted = await requestNotificationPermissions();
      if (!granted) {
        logger.warn('Notification permissions denied');
        return null;
      }

      // Get FCM token
      const token = await getFCMToken();
      if (token) {
        logger.info('FCM token registered', {
          token: token.substring(0, 20) + '...',
        });
        return token;
      }
    } catch (error) {
      logger.error('FCM token registration failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }, []);

  const requestPermissions = useCallback(
    async (): Promise<boolean> => {
      try {
        return await requestNotificationPermissions();
      } catch (error) {
        logger.error('Failed to request notification permissions', {
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },
    []
  );

  const retryRegistration = useCallback(async (): Promise<void> => {
    await registerFCMToken();
  }, [registerFCMToken]);

  return {
    registerFCMToken,
    requestPermissions,
    retryRegistration,
  };
}
