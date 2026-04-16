/**
 * ShopStatusToggle Component — toggle shop open/closed status
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';

interface Props {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => Promise<void>;
}

export function ShopStatusToggle({ isOpen, onToggle }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (value: boolean) => {
    setLoading(true);
    setError(null);

    try {
      await onToggle(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Shop Status</Text>
          <Text style={styles.subtitle}>
            {isOpen ? 'Currently Open' : 'Currently Closed'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={isOpen}
            onValueChange={handleToggle}
            trackColor={{ false: '#ccc', true: colors.primaryLight }}
            thumbColor={isOpen ? colors.primary : '#f4f3f4'}
          />
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {isOpen
            ? 'Your shop is visible to customers and you will receive orders.'
            : 'Your shop is hidden from customers and you will not receive new orders.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  titleSection: {
    flex: 1,
  },

  title: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },

  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },

  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
  },

  infoBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },

  infoText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.primary,
    lineHeight: 18,
  },
});
