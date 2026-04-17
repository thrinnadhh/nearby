/**
 * KYCStatusDisplay — Shows KYC approval status with icons and colors
 * Used by waiting.tsx screen during review process
 */

import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';

type KYCStatus = 'pending' | 'approved' | 'rejected' | 'loading';

interface Props {
  status: KYCStatus;
  reason?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

const STATUS_CONFIG: Record<
  KYCStatus,
  {
    icon: string;
    color: string;
    backgroundColor: string;
    title: string;
    description: string;
  }
> = {
  loading: {
    icon: 'progress-clock',
    color: colors.info,
    backgroundColor: `${colors.info}20`,
    title: 'Checking Status',
    description: 'Please wait while we verify your KYC...',
  },
  pending: {
    icon: 'clock-outline',
    color: colors.warning,
    backgroundColor: `${colors.warning}20`,
    title: 'Under Review',
    description: 'Your KYC is being reviewed by our team',
  },
  approved: {
    icon: 'check-circle',
    color: colors.success,
    backgroundColor: `${colors.success}20`,
    title: 'Approved',
    description: 'Your KYC has been approved!',
  },
  rejected: {
    icon: 'close-circle',
    color: colors.error,
    backgroundColor: `${colors.error}20`,
    title: 'Rejected',
    description: 'Your KYC requires attention',
  },
};

export function KYCStatusDisplay({
  status,
  reason,
  approvedAt,
  rejectedAt,
}: Props) {
  const config = STATUS_CONFIG[status];

  const formattedDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
      <View style={styles.content}>
        {status === 'loading' ? (
          <ActivityIndicator size="large" color={config.color} />
        ) : (
          <MaterialCommunityIcons
            name={config.icon}
            size={56}
            color={config.color}
          />
        )}

        <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>
        <Text style={styles.description}>{config.description}</Text>

        {/* Show additional details based on status */}
        {status === 'rejected' && reason && (
          <View style={styles.reasonContainer}>
            <MaterialCommunityIcons
              name="information"
              size={16}
              color={colors.error}
              style={styles.reasonIcon}
            />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        {status === 'approved' && approvedAt && (
          <Text style={styles.timestamp}>
            Approved on {formattedDate(approvedAt)}
          </Text>
        )}

        {status === 'rejected' && rejectedAt && (
          <Text style={styles.timestamp}>
            Rejected on {formattedDate(rejectedAt)}
          </Text>
        )}

        {status === 'pending' && (
          <View style={styles.estimateContainer}>
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color={colors.warning}
            />
            <Text style={styles.estimateText}>
              Typically reviewed within 24 hours
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },

  content: {
    alignItems: 'center',
  },

  title: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  description: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  reasonContainer: {
    flexDirection: 'row',
    backgroundColor: `${colors.error}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },

  reasonIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },

  reasonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    flex: 1,
  },

  estimateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },

  estimateText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.warning,
    marginLeft: spacing.xs,
  },

  timestamp: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
});
