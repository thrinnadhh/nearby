/**
 * EarningsSummary Component — displays today's and weekly earnings
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { TodayEarnings, WeeklyEarnings } from '@/types/shop';
import { formatCurrency } from '@/utils/formatters';

interface Props {
  todayEarnings: TodayEarnings;
  weeklyEarnings: WeeklyEarnings;
}

export function EarningsSummary({
  todayEarnings,
  weeklyEarnings,
}: Props) {
  const weeklyTotal = Object.values(weeklyEarnings).reduce(
    (sum, amount) => sum + amount,
    0
  );

  return (
    <View style={styles.container}>
      {/* Today's Earnings */}
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons
            name="cash-multiple"
            size={24}
            color={colors.success}
          />
          <Text style={styles.cardTitle}>Today's Earnings</Text>
        </View>

        <Text style={styles.earningsAmount}>
          {formatCurrency(todayEarnings.totalEarnings)}
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Orders</Text>
            <Text style={styles.statValue}>{todayEarnings.ordersCount}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statValue}>{todayEarnings.completedOrders}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>{todayEarnings.pendingOrders}</Text>
          </View>
        </View>
      </View>

      {/* Weekly Earnings */}
      <View style={[styles.card, styles.weeklyCard, shadows.sm]}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons
            name="chart-line"
            size={24}
            color={colors.info}
          />
          <Text style={styles.cardTitle}>Weekly Total</Text>
        </View>

        <Text style={styles.earningsAmount}>
          {formatCurrency(weeklyTotal)}
        </Text>

        <View style={styles.weekdayGrid}>
          {Object.entries(weeklyEarnings).map(([day, amount]) => (
            <View key={day} style={styles.weekdayItem}>
              <Text style={styles.weekdayLabel}>
                {day.slice(0, 3).toUpperCase()}
              </Text>
              <Text style={styles.weekdayAmount}>
                {formatCurrency(amount)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    gap: spacing.md,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },

  weeklyCard: {
    marginBottom: spacing.lg,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },

  cardTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },

  earningsAmount: {
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginBottom: spacing.lg,
  },

  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
  },

  stat: {
    flex: 1,
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
    color: colors.textPrimary,
  },

  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },

  weekdayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  weekdayItem: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
  },

  weekdayLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  weekdayAmount: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
});
