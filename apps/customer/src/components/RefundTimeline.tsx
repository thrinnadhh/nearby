/**
 * RefundTimeline Component (Task 10.8)
 * Displays refund events with timestamps in a timeline format
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';

interface RefundEvent {
  status: 'initiated' | 'processing' | 'credited';
  timestamp: string;
  amount?: number; // in paise
}

interface RefundTimelineProps {
  events: RefundEvent[];
}

export function RefundTimeline({ events }: RefundTimelineProps) {
  const getStatusIcon = (status: RefundEvent['status']): string => {
    switch (status) {
      case 'initiated':
        return 'clock-start';
      case 'processing':
        return 'progress-clock';
      case 'credited':
        return 'check-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: RefundEvent['status']): string => {
    switch (status) {
      case 'initiated':
        return 'Refund Initiated';
      case 'processing':
        return 'Refund Processing';
      case 'credited':
        return 'Refund Credited';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: RefundEvent['status']): string => {
    switch (status) {
      case 'initiated':
        return colors.textSecondary;
      case 'processing':
        return colors.warning;
      case 'credited':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.timeline}>
      {events.map((event, index) => {
        const statusColor = getStatusColor(event.status);
        const isLast = index === events.length - 1;

        return (
          <View key={index} style={styles.eventContainer}>
            <View style={styles.timlineLeft}>
              <View style={[styles.dot, { backgroundColor: statusColor }]} />
              {!isLast && <View style={[styles.line, { backgroundColor: statusColor }]} />}
            </View>
            <View style={styles.eventContent}>
              <Text style={styles.eventLabel}>{getStatusLabel(event.status)}</Text>
              <Text style={styles.eventTime}>{formatDate(event.timestamp)}</Text>
              {event.amount && (
                <Text style={styles.eventAmount}>
                  ₹{(event.amount / 100).toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    paddingVertical: spacing.md,
  },

  eventContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },

  timlineLeft: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.md,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  line: {
    width: 2,
    flex: 1,
    marginTop: spacing.sm,
  },

  eventContent: {
    flex: 1,
    paddingBottom: spacing.md,
  },

  eventLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  eventTime: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  eventAmount: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.success,
  },
});
