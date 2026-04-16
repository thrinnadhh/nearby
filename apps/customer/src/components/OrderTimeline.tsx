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
import type { Order, OrderStatus } from '@/types';

/**
 * OrderTimeline Component (Task 10.2)
 * 
 * Displays a vertical timeline of order status events
 */

interface TimelineEvent {
  status: OrderStatus;
  label: string;
  timestamp: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

function getTimelineEvents(order: Order): TimelineEvent[] {
  const statusSequence: OrderStatus[] = [
    'pending',
    'accepted',
    'packing',
    'ready',
    'assigned',
    'picked_up',
    'out_for_delivery',
    'delivered',
  ];

  const statusLabels: Record<OrderStatus, string> = {
    pending: 'Order Placed',
    accepted: 'Shop Accepted',
    packing: 'Being Packed',
    ready: 'Ready for Pickup',
    assigned: 'Assigned to Partner',
    picked_up: 'Picked Up',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Order Cancelled',
  };

  if (order.status === 'cancelled') {
    return [
      {
        status: 'pending',
        label: 'Order Placed',
        timestamp: new Date(order.created_at).toLocaleTimeString('en-IN'),
        isCompleted: true,
        isCurrent: false,
      },
      {
        status: 'cancelled',
        label: 'Order Cancelled',
        timestamp: new Date(order.created_at).toLocaleTimeString('en-IN'),
        isCompleted: true,
        isCurrent: true,
      },
    ];
  }

  return statusSequence.map((status, index) => {
    const currentIndex = statusSequence.indexOf(order.status);
    const isCompleted = index <= currentIndex;
    const isCurrent = index === currentIndex;

    return {
      status,
      label: statusLabels[status],
      timestamp: new Date(order.created_at).toLocaleTimeString('en-IN'),
      isCompleted,
      isCurrent,
    };
  });
}

function getStatusIcon(status: OrderStatus): string {
  const icons: Record<OrderStatus, string> = {
    pending: 'time',
    accepted: 'thumbs-up',
    packing: 'cube',
    ready: 'checkmark-circle',
    assigned: 'car',
    picked_up: 'checkbox',
    out_for_delivery: 'car',
    delivered: 'checkmark-done-circle',
    cancelled: 'close-circle',
  };
  return icons[status] || 'ellipsis-horizontal';
}

interface OrderTimelineProps {
  order: Order;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const events = getTimelineEvents(order);

  return (
    <View style={styles.timeline}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const statusColor = event.isCompleted ? colors.success : colors.textSecondary;

        return (
          <View key={event.status} style={styles.timelineItem}>
            {/* Timeline line (before circle) */}
            {!isLast && (
              <View
                style={[
                  styles.timelineLine,
                  {
                    backgroundColor: event.isCompleted ? colors.success : colors.border,
                  },
                ]}
              />
            )}

            {/* Timeline circle + content */}
            <View style={styles.timelineContent}>
              {/* Status circle */}
              <View
                style={[
                  styles.timelineCircle,
                  {
                    backgroundColor: statusColor,
                    borderColor: event.isCompleted ? colors.success : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={getStatusIcon(event.status)}
                  size={14}
                  color={event.isCompleted ? colors.surface : colors.textSecondary}
                />
              </View>

              {/* Status info */}
              <View style={styles.timelineInfo}>
                <Text
                  style={[
                    styles.timelineLabel,
                    {
                      color: event.isCompleted
                        ? colors.textPrimary
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {event.label}
                </Text>
                {event.isCompleted && (
                  <Text style={styles.timelineTime}>{event.timestamp}</Text>
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
  timeline: {
    paddingLeft: spacing.md,
  },

  timelineItem: {
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
  },

  timelineLine: {
    position: 'absolute',
    left: 17,
    top: 44,
    width: 2,
    height: 40,
  },

  timelineContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: colors.surface,
  },

  timelineInfo: {
    flex: 1,
    paddingTop: spacing.xs,
  },

  timelineLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },

  timelineTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
