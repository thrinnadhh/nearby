/**
 * Splash screen — checks JWT in secure store and routes appropriately
 * If authenticated: redirect to (tabs)
 * If not authenticated: redirect to (auth)/login
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { colors } from '@/constants/theme';
import logger from '@/utils/logger';

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // Small delay to ensure router is ready
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        logger.info('Redirecting to main app');
        router.replace('(tabs)');
      } else {
        logger.info('Redirecting to login');
        router.replace('(auth)/login');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
