/**
 * OrderStatusTimeline Component — visual representation of order status progression
 *
 * Shows the progression through order states: pending → accepted → packing → ready → picked_up → delivered
 * Marks completed states and indicates current position
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
} from '@/constants/theme';
import { Order, OrderStatus } from '@/types/orders';

const STATUS_SEQUENCE: Array<{ status: OrderStatus; label: string; icon: string }> =
  [
    { status: 'pending', label: 'Pending', icon: 'clock-outline' },
    { status: 'accepted', label: 'Accepted', icon: 'check-circle-outline' },
    { status: 'packing', label: 'Packing', icon: 'package-open' },
    { status: 'ready', label: 'Ready', icon: 'check-all' },
    { status: 'picked_up', label: 'Picked Up', icon: 'truck-outline' },
    { status: 'delivered', label: 'Delivered', icon: 'check-decagram' },
  ];

interface OrderStatusTimelineProps {
  order: Order;
}

/**
 * Get the index of the current status in the sequence
 */
function getStatusIndex(status: OrderStatus): number {
  return STATUS_SEQUENCE.findIndex((s) => s.status === status);
}

/**
 * Determine if a status has been completed
 */
function isStatusComplete(status: OrderStatus, currentStatus: OrderStatus): boolean {
  const statusIndex = getStatusIndex(status);
  const currentIndex = getStatusIndex(currentStatus);
  return statusIndex < currentIndex;
}

/**
 * Determine if a status is the current status
 */
function isCurrentStatus(status: OrderStatus, currentStatus: OrderStatus): boolean {
  return status === currentStatus;
}

/**
 * OrderStatusTimeline Component
 * Displays a vertical timeline of order status progression
 */
export function OrderStatusTimeline({ order }: OrderStatusTimelineProps) {
  //  Get the index of the current status
  const currentStatusIndex = getStatusIndex(order.status);

  return (
    <View style={styles.container}>
      {STATUS_SEQUENCE.map((item, index) => {
        const isComplete = isStatusComplete(item.status, order.status);
        const isCurrent = isCurrentStatus(item.status, order.status);
        const isUpcoming = !isComplete && !isCurrent;

        return (
          <View key={item.status} style={styles.timelineItemContainer}>
            {/* Vertical line connecting to next status */}
            {index < STATUS_SEQUENCE.length - 1 && (
              <View
                style={[
                  styles.verticalConnector,
                  isComplete && styles.verticalConnectorComplete,
                  isCurrent && styles.verticalConnectorPartial,
                ]}
              />
            )}

            {/* Status item */}
            <View style={styles.timelineItem}>
              {/* Status icon */}
              <View
                style={[
                  styles.statusCircle,
                  isComplete && styles.statusCircleComplete,
                  isCurrent && styles.statusCircleCurrent,
                  isUpcoming && styles.statusCircleUpcoming,
                ]}
              >
                {isComplete && (
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color={colors.white}
                  />
                )}
                {isCurrent && (
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={16}
                    color={colors.white}
                  />
                )}
                {isUpcoming && (
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={16}
                    color={colors.textTertiary}
                  />
                )}
              </View>

              {/* Status label */}
              <View style={styles.statusLabelContainer}>
                <Text
                  style={[
                    styles.statusLabel,
                    (isComplete || isCurrent) && styles.statusLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
                {isCurrent && (
                  <Text style={styles.currentBadge}>In Progress</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },

  timelineItemContainer: {
    marginBottom: spacing.lg,
    position: 'relative',
  },

  verticalConnector: {
    position: 'absolute',
    left: 20,
    top: 40,
    width: 2,
    height: spacing.lg + 8,
    backgroundColor: colors.border,
    zIndex: 0,
  },

  verticalConnectorComplete: {
    backgroundColor: colors.success,
  },

  verticalConnectorPartial: {
    backgroundColor: colors.primary,
  },

  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 1,
  },

  statusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    position: 'relative',
    zIndex: 2,
  },

  statusCircleComplete: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },

  statusCircleCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  statusCircleUpcoming: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },

  statusLabelContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  statusLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },

  statusLabelActive: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  currentBadge: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.primary,
    marginTop: spacing.xs,
  },
});
