/**
 * PackChecklistHeader — Header showing order info and packing progress
 * Displays customer name, deadline, and "X of Y items ready"
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Order } from '@/types/orders';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';

interface Props {
  order: Order;
  readyCount: number;
  totalCount: number;
}

export function PackChecklistHeader({
  order,
  readyCount,
  totalCount,
}: Props) {
  const progressPercentage = useMemo(
    () => Math.round((readyCount / totalCount) * 100),
    [readyCount, totalCount]
  );

  const isComplete = readyCount === totalCount;
  const acceptedAt = order.acceptedAt
    ? new Date(order.acceptedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  return (
    <View style={styles.container}>
      {/* Order Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="account-circle"
            size={40}
            color={colors.primary}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {order.customerName}
            </Text>
            <Text style={styles.customerId}>Order #{order.id.slice(0, 8)}</Text>
          </View>
        </View>

        {isComplete && (
          <View style={styles.readyBadge}>
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color={colors.success}
            />
            <Text style={styles.readyText}>Ready</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>
            {readyCount} of {totalCount} items packed
          </Text>
          <Text style={styles.progressPercent}>{progressPercentage}%</Text>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(progressPercentage, 5)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={18}
            color={colors.textSecondary}
          />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Accepted at</Text>
            <Text style={styles.detailValue}>{acceptedAt}</Text>
          </View>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailItem}>
          <MaterialCommunityIcons
            name="currency-inr"
            size={18}
            color={colors.textSecondary}
          />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Order Total</Text>
            <Text style={styles.detailValue}>
              ₹{(order.total / 100).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  headerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },

  customerName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  customerId: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },

  readyBadge: {
    alignItems: 'center',
    paddingLeft: spacing.lg,
  },

  readyText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    color: colors.success,
    marginTop: spacing.xs,
  },

  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  progressLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },

  progressPercent: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },

  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },

  details: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  detailContent: {
    marginLeft: spacing.md,
  },

  detailLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
  },

  detailValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },

  detailDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
});
