/**
 * LowStockEmptyState — displays when no low stock products found
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';

interface LowStockEmptyStateProps {
  threshold?: number;
  isDismissedAllCleared?: boolean;
  onAdjustThreshold?: () => void;
  onRetry?: () => void;
  error?: string | null;
}

export const LowStockEmptyState: React.FC<LowStockEmptyStateProps> = ({
  threshold = 5,
  isDismissedAllCleared = false,
  onAdjustThreshold,
  onRetry,
  error,
}) => {
  const showError = error && !isDismissedAllCleared;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {showError ? (
          <>
            <MaterialCommunityIcons
              name="alert-circle"
              size={64}
              color={colors.error}
              style={styles.icon}
            />
            <Text style={styles.title}>Unable to Load Alerts</Text>
            <Text style={styles.message}>{error}</Text>
            {onRetry && (
              <TouchableOpacity
                style={styles.button}
                onPress={onRetry}
              >
                <MaterialCommunityIcons
                  name="reload"
                  size={20}
                  color={colors.white}
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </>
        ) : isDismissedAllCleared ? (
          <>
            <MaterialCommunityIcons
              name="information"
              size={64}
              color={colors.info}
              style={styles.icon}
            />
            <Text style={styles.title}>Dismissed Alerts Cleared</Text>
            <Text style={styles.message}>
              All previously dismissed products will be shown when they go below the threshold again.
            </Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons
              name="check-all"
              size={64}
              color={colors.success}
              style={styles.icon}
            />
            <Text style={styles.title}>All Good!</Text>
            <Text style={styles.message}>
              No products below{' '}
              <Text style={styles.threshold}>{threshold} {threshold === 1 ? 'unit' : 'units'}</Text>.
              All inventory levels are healthy.
            </Text>
            {onAdjustThreshold && (
              <TouchableOpacity
                style={styles.button}
                onPress={onAdjustThreshold}
              >
                <MaterialCommunityIcons
                  name="chart-line"
                  size={20}
                  color={colors.white}
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={styles.buttonText}>Adjust Threshold</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  threshold: {
    fontFamily: fontFamily.bold,
    color: colors.warning,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.white,
  },
});
