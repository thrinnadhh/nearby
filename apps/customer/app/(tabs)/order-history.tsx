import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { getOrderHistory, reorderFromHistory, getStatusLabel, getStatusColor, getStatusIcon } from '@/services/order-history';
import { useLocationStore } from '@/store/location';
import logger from '@/utils/logger';
import type { Order } from '@/types';

/**
 * Order History Screen (Task 9.7)
 * 
 * Displays customer's complete order history with:
 * - Infinite scroll pagination
 * - Status filtering
 * - Re-ordering from history
 * - Order detail navigation
 * 
 * Statuses: pending, accepted, packing, ready, assigned, picked_up, out_for_delivery, delivered, cancelled, rejected
 */

type FilterStatus = 'all' | 'active' | 'delivered' | 'cancelled';

const STATUS_FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'All Orders', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const getStatusesForFilter = (filter: FilterStatus) => {
  switch (filter) {
    case 'active':
      return ['pending', 'accepted', 'packing', 'ready', 'assigned', 'picked_up', 'out_for_delivery'];
    case 'delivered':
      return ['delivered'];
    case 'cancelled':
      return ['cancelled', 'rejected'];
    default:
      return undefined;
  }
};

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { deliveryAddress, deliveryCoords } = useLocationStore();
  const { setActiveOrder } = useOrdersStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [isReordering, setIsReordering] = useState<string | null>(null);

  const pageSize = 10;

  // Initial load
  useEffect(() => {
    loadOrders(1, true);
  }, []);

  // Reload when filter changes
  useEffect(() => {
    loadOrders(1, true);
  }, [selectedFilter]);

  const loadOrders = async (page: number, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      if (!token) {
        setError('Authentication required');
        return;
      }

      const statuses = getStatusesForFilter(selectedFilter);
      const response = await getOrderHistory(
        {
          page,
          limit: pageSize,
          status: statuses,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
        token
      );

      setCurrentPage(page);
      setTotalPages(response.meta.pages);

      if (isRefresh) {
        setOrders(response.data);
      } else {
        setOrders((prev) => [...prev, ...response.data]);
      }

      setError(null);
    } catch (err: any) {
      const message = err?.message || 'Failed to load orders';
      setError(message);
      logger.error('Order history load error', { message, page, filter: selectedFilter });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleEndReached = () => {
    if (!isLoadingMore && !isLoading && currentPage < totalPages) {
      loadOrders(currentPage + 1);
    }
  };

  const handleRefresh = () => {
    loadOrders(1, true);
  };

  const handleOrderPress = (order: any) => {
    setActiveOrder(order);
    router.push(`/(tabs)/order-detail/${order.id}`);
  };

  const handleReorder = async (order: any) => {
    if (!deliveryAddress || !deliveryCoords) {
      Alert.alert(
        'Delivery Address Required',
        'Please set a delivery address first',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set Address',
            onPress: () => router.push('/address-picker'),
          },
        ]
      );
      return;
    }

    // Verify shop is still available
    if (order.shop?.is_open === false) {
      Alert.alert(
        'Shop Closed',
        `${order.shop.name} is currently closed. Please try again later.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setIsReordering(order.id);

    try {
      if (!deliveryCoords) {
        Alert.alert('Error', 'Delivery coordinates are required for reorder');
        return;
      }
      const newOrder = await reorderFromHistory(
        order.id,
        {
          address: deliveryAddress,
          coordinates: deliveryCoords,
        },
        token
      );

      Alert.alert(
        'Order Created',
        'Your reorder has been placed successfully!',
        [
          {
            text: 'View Order',
            onPress: () => {
              setActiveOrder(newOrder);
              router.push(`/(tabs)/order-confirmed/${newOrder.order_id}`);
            },
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      logger.error('Reorder error', { orderId: order.id, message }
    } catch (err: any) {
      const message = err?.message || 'Failed to reorder';
      Alert.alert('Reorder Failed', message);
      console.error('Reorder error:', message);
    } finally {
      setIsReordering(null);Order
    }
  };

  const renderOrderItem = ({ item: order }: { item: any }) => {
    const isReorderingThis = isReordering === order.id;
    const canReorder =
      order.order_status === 'delivered' &&
      order.shop &&
      order.shop.is_open !== false;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(order)}
        activeOpacity={0.7}
      >
        {/* Header: Date and Amount */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>
              {new Date(order.created_at).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.orderAmount}>
            ₹{(order.total_amount / 100).toFixed(2)}
          </Text>
        </View>

        {/* Shop and Items */}
        <View style={styles.orderInfo}>
          <Text style={styles.shopName}>{order.shop?.name || 'Unknown Shop'}</Text>
          <Text style={styles.itemCount}>
            {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(order.order_status)}20` },
          ]}
        >
          <Text style={[styles.statusIcon, { color: getStatusColor(order.order_status) }]}>
            {getStatusIcon(order.order_status)}
          </Text>
          <Text style={[styles.statusText, { color: getStatusColor(order.order_status) }]}>
            {getStatusLabel(order.order_status)}
          </Text>
        </View>

        {/* Reorder Button */}
        {canReorder && (
          <TouchableOpacity
            style={[styles.reorderButton, isReorderingThis && styles.reorderButtonDisabled]}
            onPress={() => handleReorder(order)}
            disabled={isReorderingThis}
          >
            {isReorderingThis ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <>
                <Text style={styles.reorderIcon}>🔄</Text>
                <Text style={styles.reorderText}>Reorder</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilter = (filter: typeof STATUS_FILTERS[0]) => {
    const isSelected = selectedFilter === filter.value;

    return (
      <TouchableOpacity
        key={filter.value}
        style={[
          styles.filterButton,
          isSelected && styles.filterButtonActive,
        ]}
        onPress={() => setSelectedFilter(filter.value)}
      >
        <Text
          style={[
            styles.filterButtonText,
            isSelected && styles.filterButtonTextActive,
          ]}
        >
          {filter.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Unable to Load Orders</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRefresh}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isLoading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Order History</Text>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          {STATUS_FILTERS.map(renderFilter)}
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.emptyStateEmoji}>📦</Text>
          <Text style={styles.emptyStateTitle}>No Orders Yet</Text>
          <Text style={styles.emptyStateMessage}>
            {selectedFilter === 'all'
              ? 'Start ordering to see your history here'
              : `No ${selectedFilter} orders`}
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Text style={styles.buttonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {STATUS_FILTERS.map(renderFilter)}
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#10b981"
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.loadingText}>Loading more...</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Filters
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },

  // Error Banner
  errorBanner: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 6,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },

  // List
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  // Order Card
  orderCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  orderDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },

  // Order Info
  orderInfo: {
    marginBottom: 10,
  },
  shopName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  itemCount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  statusIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Reorder Button
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  reorderButtonDisabled: {
    opacity: 0.6,
  },
  reorderIcon: {
    fontSize: 14,
  },
  reorderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },

  // Empty State
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Error State
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Loading Footer
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },

  // Button
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
