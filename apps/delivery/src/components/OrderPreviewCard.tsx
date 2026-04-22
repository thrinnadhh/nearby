/**
 * Order preview card component — displays order details for assignment decision
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { OrderForDelivery } from '@/types/assignment';

interface OrderPreviewCardProps {
  order: OrderForDelivery;
  distanceKm: number;
  estimatedPickupTime: number;
  estimatedDeliveryTime: number;
  onAccept: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

function formatTime(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function OrderPreviewCard({
  order,
  distanceKm,
  estimatedPickupTime,
  estimatedDeliveryTime,
  onAccept,
  onReject,
  isLoading = false,
}: OrderPreviewCardProps): React.ReactElement {
  const totalTime = useMemo(
    () => estimatedPickupTime + estimatedDeliveryTime,
    [estimatedPickupTime, estimatedDeliveryTime]
  );

  const itemCount = useMemo(
    () =>
      order.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [order.items]
  );

  return (
    <View style={styles.card}>
      <ScrollView
        scrollEnabled
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.shopName} numberOfLines={2}>
            {order.shopName}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={styles.metricValue}>{distanceKm.toFixed(1)} km</Text>
          </View>
          <View style={[styles.metric, styles.metricSeparator]}>
            <Text style={styles.metricLabel}>Pickup Time</Text>
            <Text style={styles.metricValue}>
              {formatTime(estimatedPickupTime)}
            </Text>
          </View>
          <View style={[styles.metric, styles.metricSeparator]}>
            <Text style={styles.metricLabel}>Total Time</Text>
            <Text style={styles.metricValue}>{formatTime(totalTime)}</Text>
          </View>
        </View>

        {/* Delivery Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Customer Phone</Text>
            <Text style={styles.detailValue}>
              {order.customerPhone}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue} numberOfLines={3}>
              {order.deliveryAddress}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order Amount</Text>
            <Text style={styles.detailValueHighlight}>
              {formatCurrency(order.totalAmount)}
            </Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items.map((item, idx) => (
            <View
              key={`${item.id}-${idx}`}
              style={styles.itemRow}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text style={styles.itemQuantity}>
                  Qty: {item.quantity}
                </Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable
          onPress={onReject}
          disabled={isLoading}
          style={[styles.button, styles.rejectButton]}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </Pressable>
        <Pressable
          onPress={onAccept}
          disabled={isLoading}
          style={[styles.button, styles.acceptButton]}
        >
          <Text style={styles.acceptButtonText}>
            {isLoading ? 'Accepting...' : 'Accept'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
    color: '#1f2937',
  },
  badge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricSeparator: {
    borderLeftWidth: 1,
    borderLeftColor: '#d1d5db',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  detailsSection: {
    marginBottom: 16,
  },
  itemsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  detailValueHighlight: {
    fontSize: 14,
    color: '#059669',
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#f3f4f6',
  },
  rejectButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  acceptButton: {
    backgroundColor: '#2563eb',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
