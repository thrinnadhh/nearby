/**
 * Root layout wrapper with ErrorBoundary and OfflineBanner
 * Handles font loading and auth state hydration
 */

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth';
import { configureForegroundNotifications } from '@/services/notifications';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import logger from '@/utils/logger';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Configure notification appearance in foreground
configureForegroundNotifications();

export default function RootLayout() {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  const ready = (fontsLoaded || fontError != null) && hasHydrated;

  useEffect(() => {
    if (fontError) {
      logger.error('Font loading error', { error: fontError.message });
    }
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready, fontError]);

  // Hold splash until both fonts and auth store hydrate
  if (!ready) return null;

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
