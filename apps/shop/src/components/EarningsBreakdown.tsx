/**
 * EarningsBreakdown component
 * Modal showing breakdown: gross - commission - fee = net
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AnalyticsRecord } from '@/types/earnings';
import { formatCurrencyIndian } from '@/utils/earningsFormatter';

interface EarningsBreakdownProps {
  record: AnalyticsRecord | null;
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

// Commission rate as per business config (from backend)
const COMMISSION_RATE = 0.0175; // 1.75%

export function EarningsBreakdown({
  record,
  visible,
  onClose,
  testID,
}: EarningsBreakdownProps) {
  if (!record) {
    return null;
  }

  const gross = record.grossRevenuePaise;
  const commission = Math.round(gross * COMMISSION_RATE);
  const net = record.netRevenuePaise;

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      testID={testID}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Earnings Breakdown</Text>
            <TouchableOpacity onPress={onClose} testID='close-button'>
              <MaterialIcons name='close' size={24} color='#111827' />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <View style={styles.row}>
                <Text style={styles.label}>Gross Revenue</Text>
                <Text style={styles.value}>
                  {formatCurrencyIndian(gross)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View>
                  <Text style={styles.label}>NearBy Commission</Text>
                  <Text style={styles.sublabel}>
                    {(COMMISSION_RATE * 100).toFixed(2)}%
                  </Text>
                </View>
                <Text style={[styles.value, styles.deduction]}>
                  − {formatCurrencyIndian(commission)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={[styles.row, styles.highlight]}>
                <Text style={styles.labelBold}>Net Earnings</Text>
                <Text style={[styles.valueBold, styles.net]}>
                  {formatCurrencyIndian(net)}
                </Text>
              </View>

              <View style={styles.spacer} />

              <View style={styles.info}>
                <MaterialIcons
                  name='info'
                  size={16}
                  color='#0EA5E9'
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>
                  Net earnings are deposited to your bank account within 1-2
                  business days after order delivery.
                </Text>
              </View>

              <View style={styles.details}>
                <Text style={styles.detailsTitle}>Additional Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Orders</Text>
                  <Text style={styles.detailValue}>
                    {record.totalOrders}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Completed Orders</Text>
                  <Text style={styles.detailValue}>
                    {record.completedOrders}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Completion Rate</Text>
                  <Text style={styles.detailValue}>
                    {record.completionRate.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            testID='close-modal-button'
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  sublabel: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  deduction: {
    color: '#EF4444',
  },
  labelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  valueBold: {
    fontSize: 18,
    fontWeight: '700',
  },
  net: {
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  highlight: {
    marginVertical: 8,
  },
  spacer: {
    height: 16,
  },
  info: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  details: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    backgroundColor: '#3B82F6',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
