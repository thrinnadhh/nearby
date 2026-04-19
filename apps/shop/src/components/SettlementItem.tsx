/**
 * SettlementItem component
 * Card showing settlement details
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Settlement } from '@/types/settlement';
import { formatCurrency } from '@/utils/formatters';

interface SettlementItemProps {
  settlement: Settlement;
  onPress?: () => void;
  testID?: string;
}

export function SettlementItem({
  settlement,
  onPress,
  testID,
}: SettlementItemProps) {
  const statusColor = {
    pending: '#FFA500',
    initiated: '#4A90E2',
    completed: '#7CB342',
    failed: '#E53935',
  }[settlement.status];

  const statusLabel = {
    pending: 'Pending',
    initiated: 'Initiated',
    completed: 'Completed',
    failed: 'Failed',
  }[settlement.status];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      testID={testID}
      activeOpacity={0.7}
    >
      {/* Top row: Period dates and status */}
      <View style={styles.header}>
        <View style={styles.periodContainer}>
          <Text style={styles.periodLabel}>
            {new Date(settlement.periodStartDate).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            -{' '}
            {new Date(settlement.periodEndDate).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      {/* Middle row: Amount and UTR */}
      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Net Amount</Text>
          <Text style={styles.amount}>
            {formatCurrency(settlement.netAmount)}
          </Text>
        </View>
        {settlement.utrNumber && (
          <View style={styles.utrContainer}>
            <Text style={styles.utrLabel}>UTR</Text>
            <Text style={styles.utrValue}>{settlement.utrNumber}</Text>
          </View>
        )}
      </View>

      {/* Bottom row: Breakdown */}
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownText}>
          Gross: {formatCurrency(settlement.grossAmount)}
        </Text>
        <Text style={styles.breakdownText}>
          Commission: {formatCurrency(settlement.commission)}
        </Text>
        <Text style={styles.breakdownText}>
          Fees: {formatCurrency(settlement.fees)}
        </Text>
      </View>

      {/* Settlement date */}
      {settlement.completedAt && (
        <Text style={styles.completedDate}>
          Settled on{' '}
          {new Date(settlement.completedAt).toLocaleDateString('en-IN')}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodContainer: {
    flex: 1,
  },
  periodLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
  },
  utrContainer: {
    alignItems: 'flex-end',
  },
  utrLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  utrValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginBottom: 8,
  },
  breakdownText: {
    fontSize: 11,
    color: '#666',
  },
  completedDate: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
