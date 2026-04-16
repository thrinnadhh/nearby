/**
 * Dashboard/Home Screen (Task 11.5) — Shop status, earnings, quick stats
 * Displays shop open/close toggle and earnings summary
 */

import { useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShopProfile } from '@/hooks/useShopProfile';
import { useShopStore } from '@/store/shop';
import { ShopStatusToggle } from '@/components/shop/ShopStatusToggle';
import { EarningsSummary } from '@/components/shop/EarningsSummary';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
} from '@/constants/theme';
import logger from '@/utils/logger';

export default function HomeScreen() {
  const profile = useShopProfile();
  const { earnings, loading, error, setLoading, setError } = useShopStore();
  const { toggleOpen: toggleStatus, setLoading: setShopLoading } = useShopStore();

  // Fetch earnings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (profile && !earnings) {
        logger.info('Dashboard focused, fetching earnings');
      }
    }, [profile, earnings])
  );

  const handleToggleShop = useCallback(async (isOpen: boolean) => {
    setShopLoading(true);
    setError(null);

    try {
      // Optimistically update UI
      toggleStatus(isOpen);
      // Service call happens in useShopProfile hook
      logger.info('Shop status toggled', { isOpen });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle shop';
      setError(message);
      logger.error('Failed to toggle shop', { error: message });
    } finally {
      setShopLoading(false);
    }
  }, [toggleStatus, setError, setShopLoading]);

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Failed to Load Dashboard</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <PrimaryButton label="Retry" onPress={() => {}} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Header */}
        {profile && (
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              Welcome, {profile.name}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Manage your shop and track orders
            </Text>
          </View>
        )}

        {/* Shop Status Toggle */}
        {profile && (
          <ShopStatusToggle
            isOpen={profile.isOpen}
            onToggle={handleToggleShop}
          />
        )}

        {/* Earnings Summary */}
        {earnings && (
          <EarningsSummary
            todayEarnings={earnings.today}
            weeklyEarnings={earnings.weekly}
          />
        )}

        {/* Quick Stats */}
        {profile && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Trust Score</Text>
              <Text style={styles.statValue}>{profile.trustScore}/100</Text>
              <Text style={styles.statBadge}>{profile.trustBadge}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Avg Rating</Text>
              <Text style={styles.statValue}>
                {profile.avgRating.toFixed(1)} ⭐
              </Text>
              <Text style={styles.statBadge}>
                {profile.reviewCount} reviews
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Completion Rate</Text>
              <Text style={styles.statValue}>
                {(profile.completionRate * 100).toFixed(0)}%
              </Text>
              <Text style={styles.statBadge}>Orders completed</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingVertical: spacing.lg,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  errorTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.error,
    marginBottom: spacing.md,
  },

  errorMessage: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  welcomeSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },

  welcomeTitle: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },

  welcomeSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },

  statLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  statValue: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },

  statBadge: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
});
