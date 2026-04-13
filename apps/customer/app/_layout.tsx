import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth';

// Must be called at module level — before any render cycle — so the splash
// screen stays visible while fonts and the auth store both hydrate.
SplashScreen.preventAutoHideAsync();

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
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
