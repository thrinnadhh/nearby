/**
 * EarningsSummaryCard component
 * Metric card showing value, trend, and label
 * Used for Today, Week, Month earnings display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatCurrencyIndian, getTrendIndicator } from '@/utils/earningsFormatter';

interface EarningsSummaryCardProps {
  label: string;
  value: number; // in paise
  previousValue: number; // in paise, for trend calculation
  icon?: string;
  testID?: string;
}

export function EarningsSummaryCard({
  label,
  value,
  previousValue,
  icon = 'trending-up',
  testID,
}: EarningsSummaryCardProps) {
  const trend = getTrendIndicator(
    previousValue === 0 ? 0 : ((value - previousValue) / previousValue) * 100
  );
  const trendPercent =
    previousValue === 0
      ? 0
      : Math.round(((value - previousValue) / previousValue) * 1000) / 10;

  const trendColor =
    trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#999999';
  const trendIcon =
    trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'trending-flat';

  return (
    <View style={styles.card} testID={testID || 'card'}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <MaterialIcons name={trendIcon} size={16} color={trendColor} />
      </View>

      <Text style={styles.value}>{formatCurrencyIndian(value)}</Text>

      <View style={styles.footer}>
        <Text style={[styles.trend, { color: trendColor }]}>
          {trendPercent > 0 ? '+' : ''}{trendPercent}%
        </Text>
        {previousValue > 0 && (
          <Text style={styles.previousValue}>
            from {formatCurrencyIndian(previousValue)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trend: {
    fontSize: 14,
    fontWeight: '600',
  },
  previousValue: {
    fontSize: 12,
    color: '#999999',
  },
});
