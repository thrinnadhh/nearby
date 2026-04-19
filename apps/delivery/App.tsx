/**
 * App.tsx — Root application component with notification setup
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/store/auth';
import { RootNavigator } from '@/navigation/RootNavigator';
import logger from '@/utils/logger';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  useEffect(() => {
    // Register for push notifications
    const registerForPushNotifications = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          if (newStatus !== 'granted') {
            logger.warn('Push notification permission denied');
            return;
          }
        }

        // Get FCM token and store it (for Sprint 13.4)
        logger.info('Push notifications enabled');
      } catch (error) {
        logger.error('Failed to setup push notifications', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    registerForPushNotifications();
  }, []);

  // Wait for auth store to hydrate
  const { _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return null; // Expo splash screen will show
  }

  return (
    <>
      <RootNavigator />
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
    </>
  );
}
