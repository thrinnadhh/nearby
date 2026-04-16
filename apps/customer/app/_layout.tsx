import { useEffect, useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { useAuthStore } from '@/store/auth';
import { configureForegroundNotifications } from '@/services/notifications';
import { PaymentCallbackListener } from '@/components/PaymentCallbackListener';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import logger from '@/utils/logger';

// Must be called at module level — before any render cycle — so the splash
// screen stays visible while fonts and the auth store both hydrate.
SplashScreen.preventAutoHideAsync();

// Configure how notifications look when the app is in the foreground.
// Must run at module level so it is set before the first notification arrives.
configureForegroundNotifications();

export default function RootLayout() {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [paymentCallbackHandled, setPaymentCallbackHandled] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  // Handle payment callbacks from Cashfree
  const handlePaymentCallback = useCallback(
    (orderId: string, status: 'success' | 'failed') => {
      logger.info('Root payment callback handler triggered', { orderId, status });
      setPaymentCallbackHandled(true);
      
      // Payment screen will handle the actual callback via PaymentCallbackListener
      // This is just for logging/debugging at the app root level
    },
    []
  );

  const ready = (fontsLoaded || fontError != null) && hasHydrated;

  useEffect(() => {
    if (fontError) {
      // Font failure is fatal in dev (fonts are bundled in release builds).
      console.error('Font loading error:', fontError);
    }
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready, fontError]);

  // Hold the splash until both fonts and auth store are ready — prevents the
  // login screen from flashing before persisted auth state is restored.
  if (!ready) return null;

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
      
      {/* Listen for payment callbacks from Cashfree redirect at app root */}
      <PaymentCallbackListener onPaymentCallback={handlePaymentCallback} />
    </ErrorBoundary>
  );
}
