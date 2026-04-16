import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';

/**
 * RefundStatusBadge Component (Task 10.2)
 * 
 * Displays refund status information when an order is cancelled
 */

interface RefundStatusBadgeProps {
  orderId: string;
  status?: 'processing' | 'completed';
  refundAmount?: number;
}

export function RefundStatusBadge({
  orderId,
  status = 'processing',
  refundAmount,
}: RefundStatusBadgeProps) {
  const isCompleted = status === 'completed';

  return (
    <View style={[styles.badge, isCompleted && styles.badgeCompleted]}>
      <Ionicons
        name={isCompleted ? 'checkmark-circle' : 'time'}
        size={20}
        color={isCompleted ? colors.success : colors.warning}
      />
      <View style={styles.content}>
        <Text style={styles.title}>
          {isCompleted ? 'Refund Completed' : 'Refund Processing'}
        </Text>
        <Text style={styles.description}>
          {isCompleted
            ? refundAmount
              ? `₹${(refundAmount / 100).toFixed(2)} refunded to your account`
              : 'Amount refunded to your account'
            : 'May take 3-5 business days'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#fef3c7',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },

  badgeCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
  },

  description: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
