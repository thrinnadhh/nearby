/**
 * Assignment list screen — displays active and completed assignments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useAssignmentStore } from '@/store/assignment';
import { useAuthStore } from '@/store/auth';
import { listDeliveryOrders } from '@/services/assignment';
import { AppErrorClass } from '@/types/common';
import logger from '@/utils/logger';

interface AssignmentListProps {
  onSelectAssignment: (orderId: string) => void;
}

interface OrderItem {
  id: string;
  shopName: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  distance?: number;
}

export function AssignmentList({
  onSelectAssignment,
}: AssignmentListProps): React.ReactElement {
  const { acceptedAssignments } = useAssignmentStore();
  const partnerId = useAuthStore((state) => state.partnerId);
  const token = useAuthStore((state) => state.token);

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  const loadOrders = async (status?: string) => {
    if (!token) {
      logger.error('No token available');
      setError('Not authenticated');
      return;
    }

    try {
      setError('');
      const data = await listDeliveryOrders(status);
      setOrders(Array.isArray(data) ? data : []);
      logger.info('Orders loaded successfully', {
        count: Array.isArray(data) ? data.length : 0,
      });
    } catch (err) {
      const message =
        err instanceof AppErrorClass
          ? err.message
          : 'Failed to load assignments';
      logger.error('Failed to load orders', { error: message });
      setError(message);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadOrders(selectedStatus).finally(() => setIsLoading(false));
  }, [selectedStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders(selectedStatus);
    setRefreshing(false);
  };

  const handleStatusFilter = (status: string | undefined) => {
    setSelectedStatus(status);
  };

  const formatCurrency = (paise: number): string => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'assigned':
        return '#3b82f6';
      case 'picked_up':
        return '#f59e0b';
      case 'out_for_delivery':
        return '#8b5cf6';
      case 'delivered':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string): string => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <Pressable
      onPress={() => onSelectAssignment(item.id)}
      style={styles.orderCard}
      accessible
      accessibilityLabel={`Order from ${item.shopName}`}
      accessibilityRole="button"
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.shopName} numberOfLines={1}>
            {item.shopName}
          </Text>
          <Text style={styles.orderId} numberOfLines={1}>
            {item.id.substring(0, 8)}...
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.amount}>
          {formatCurrency(item.totalAmount)}
        </Text>
        <Text style={styles.time}>
          {new Date(item.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </Pressable>
  );

  const emptyStateMessage =
    orders.length === 0
      ? selectedStatus
        ? `No ${selectedStatus} assignments`
        : 'No assignments yet'
      : 'No matching assignments';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Assignments</Text>
        {acceptedAssignments.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{acceptedAssignments.length}</Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        bounces={false}
      >
        <Pressable
          onPress={() => handleStatusFilter(undefined)}
          style={[
            styles.filterButton,
            !selectedStatus && styles.filterButtonActive,
          ]}
          accessible
          accessibilityLabel="All assignments"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.filterText,
              !selectedStatus && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>

        {['assigned', 'picked_up', 'out_for_delivery', 'delivered'].map(
          (status) => (
            <Pressable
              key={status}
              onPress={() => handleStatusFilter(status)}
              style={[
                styles.filterButton,
                selectedStatus === status && styles.filterButtonActive,
              ]}
              accessible
              accessibilityLabel={getStatusLabel(status)}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.filterText,
                  selectedStatus === status && styles.filterTextActive,
                ]}
              >
                {getStatusLabel(status)}
              </Text>
            </Pressable>
          )
        )}
      </ScrollView>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText} accessible accessibilityRole="alert">
            {error}
          </Text>
        </View>
      )}

      {/* Orders List */}
      {isLoading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>{emptyStateMessage}</Text>
              <Text style={styles.emptyStateText}>
                Assignments will appear here when available
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563eb']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  badge: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  time: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
});
