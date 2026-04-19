/**
 * EarningsChartCard component
 * 7-day line chart showing daily earnings trend
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { AnalyticsRecord } from '@/types/earnings';
import { formatCurrencyIndian, formatDateShort } from '@/utils/earningsFormatter';

interface EarningsChartCardProps {
  weekData: AnalyticsRecord[];
  testID?: string;
}

/**
 * Simple bar chart implementation since react-native-chart-kit might not be available
 * Uses simple bars with relative heights
 */
export function EarningsChartCard({
  weekData,
  testID,
}: EarningsChartCardProps) {
  if (!weekData || weekData.length === 0) {
    return (
      <View style={styles.card} testID={testID}>
        <Text style={styles.title}>7-Day Earnings</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  // Find max revenue for scaling
  const maxRevenue = Math.max(
    ...weekData.map((d) => d.netRevenuePaise),
    1
  );

  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.title}>7-Day Earnings</Text>

      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          <Text style={styles.yLabel} testID="y-axis-label-max">
            {formatCurrencyIndian(maxRevenue)}
          </Text>
          <Text style={styles.yLabel} testID="y-axis-label-mid">
            {formatCurrencyIndian(maxRevenue / 2)}
          </Text>
          <Text style={styles.yLabel} testID="y-axis-label-zero">₹0</Text>
        </View>

        <View style={styles.bars}>
          {weekData.map((record, index) => {
            const height = Math.max(
              (record.netRevenuePaise / maxRevenue) * 150,
              5
            );

            return (
              <View key={index} style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    { height },
                    record.netRevenuePaise === 0 && styles.barZero,
                  ]}
                />
                <Text style={styles.barLabel} testID={`date-label-${index}`}>
                  {formatDateShort(record.date)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendItem, { backgroundColor: '#3B82F6' }]} />
        <Text style={styles.legendLabel}>Net Revenue</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 12,
  },
  yAxis: {
    width: 60,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  yLabel: {
    fontSize: 10,
    color: '#999999',
    fontWeight: '400',
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingLeft: 4,
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    marginBottom: 8,
  },
  barZero: {
    backgroundColor: '#E5E7EB',
  },
  barLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '400',
  },
  emptyState: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendItem: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
});
