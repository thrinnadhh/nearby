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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import {
  getOrderHistory,
  reorderFromHistory,
  getStatusLabel,
  getStatusColor,
} from '@/services/order-history';
import { useLocationStore } from '@/store/location';
import logger from '@/utils/logger';
import { paise } from '@/utils/currency';
import type { Order } from '@/types';

/**
 * Order History Screen (Task 10.1)
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

const PAGE_SIZE = 10;

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { deliveryAddress, deliveryCoords } = useLocationStore();
  const { setActiveOrder } = useOrdersStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [isReordering, setIsReordering] = useState<string | null>(null);

  // Guard: prevent double-fetch on mount (initial load + filter effect both fire on first render)
  const didMountRef = useRef(false);

  const loadOrders = useCallback(
    async (page: number, isRefresh = false) => {
      if (!token) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      try {
        if (isRefresh) {
          setIsRefreshing(true);
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const statuses = getStatusesForFilter(selectedFilter);
        const response = await getOrderHistory(
          {
            page,
            limit: PAGE_SIZE,
            status: statuses as Parameters<typeof getOrderHistory>[0]['status'],
            sort_by: 'created_at',
            sort_order: 'desc',
          },
          token
        );

        setCurrentPage(page);
        setTotalPages(response.meta.pages);
        setOrders((prev) => (isRefresh ? response.data : [...prev, ...response.data]));
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load orders';
        setError(message);
        logger.error('Order history load error', { message, page, filter: selectedFilter });
      } finally {
        setIsRefreshing(false);
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedFilter, token]
  );

  // Single effect: runs on mount (via didMountRef guard) and whenever filter changes.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
    }
    loadOrders(1, true);
  }, [selectedFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  // loadOrders is intentionally excluded — including it would cause an infinite loop
  // because loadOrders recreates when selectedFilter changes, which is already in the dep array.

  const handleEndReached = useCallback(() => {
    if (!isLoadingMore && !isLoading && currentPage < totalPages) {
      loadOrders(currentPage + 1);
    }
  }, [isLoadingMore, isLoading, currentPage, totalPages, loadOrders]);

  const handleRefresh = useCallback(() => {
    loadOrders(1, true);
  }, [loadOrders]);

  const handleOrderPress = useCallback(
    (order: Order) => {
      setActiveOrder(order);
      router.push(`/(tabs)/order-detail/${order.id}`);
    },
    [router, setActiveOrder]
  );

  const handleReorder = useCallback(
    async (order: Order) => {
      if (!deliveryAddress || !deliveryCoords) {
        Alert.alert(
          'Delivery Address Required',
          'Please set a delivery address first',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Set Address', onPress: () => router.push('/address-picker') },
          ]
        );
        return;
      }

      if (order.shop?.is_open === false) {
        Alert.alert(
          'Shop Closed',
          `${order.shop.name} is currently closed. Please try again later.`,
          [{ text: 'OK' }]
        );
        return;
      }

      setIsReordering(order.id);

      try {
        const newOrder = await reorderFromHistory(
          order.id,
          { address: deliveryAddress, coordinates: deliveryCoords },
          token
        );

        Alert.alert('Order Created', 'Your reorder has been placed successfully!', [
          {
            text: 'View Order',
            onPress: () => {
              setActiveOrder(newOrder);
              router.push(`/(tabs)/order-confirmed/${newOrder.order_id}`);
            },
          },
          { text: 'OK', style: 'cancel' },
        ]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to reorder';
        logger.error('Reorder error', { orderId: order.id, message });
        Alert.alert('Reorder Failed', message);
      } finally {
        setIsReordering(null);
      }
    },
    [deliveryAddress, deliveryCoords, token, router, setActiveOrder]
  );

  const renderOrderItem = useCallback(
    ({ item: order }: { item: Order }) => {
      const isReorderingThis = isReordering === order.id;
      const canReorder =
        order.order_status === 'delivered' && order.shop && order.shop.is_open !== false;

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
            <Text style={styles.orderAmount}>{paise(order.total_amount)}</Text>
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
                <ActivityIndicator size="small" color={styles.reorderText.color} />
              ) : (
                <>
                  <Ionicons name="refresh" size={14} color={styles.reorderText.color} />
                  <Text style={styles.reorderText}>Reorder</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [isReordering, handleOrderPress, handleReorder]
  );

  const renderFilter = useCallback(
    (filter: (typeof STATUS_FILTERS)[0]) => {
      const isSelected = selectedFilter === filter.value;
      return (
        <TouchableOpacity
          key={filter.value}
          style={[styles.filterButton, isSelected && styles.filterButtonActive]}
          onPress={() => setSelectedFilter(filter.value)}
        >
          <Text
            style={[styles.filterButtonText, isSelected && styles.filterButtonTextActive]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedFilter]
  );

  if (isLoading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={BRAND_GREEN} />
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
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleRefresh}>
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
        <View style={styles.filterContainer}>{STATUS_FILTERS.map(renderFilter)}</View>
        <View style={styles.centerContent}>
          <Ionicons name="cube-outline" size={48} color="#9ca3af" style={{ marginBottom: 16 }} />
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
      </View>

      <View style={styles.filterContainer}>{STATUS_FILTERS.map(renderFilter)}</View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Connection issue — showing cached results</Text>
        </View>
      )}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND_GREEN}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={BRAND_GREEN} />
              <Text style={styles.loadingText}>Loading more...</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// Single source-of-truth for the brand green used across this screen.
// Replace with `colors.success` once the theme exports it.
const BRAND_GREEN = '#10b981';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },

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
  filterButtonActive: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  filterButtonText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterButtonTextActive: { color: '#fff' },

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
  errorBannerText: { fontSize: 12, fontWeight: '600', color: '#92400e' },

  listContent: { paddingHorizontal: 12, paddingVertical: 8 },

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
  orderId: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  orderDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  orderAmount: { fontSize: 16, fontWeight: '700', color: BRAND_GREEN },

  orderInfo: { marginBottom: 10 },
  shopName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  itemCount: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND_GREEN,
    backgroundColor: '#f0fdf4',
  },
  reorderButtonDisabled: { opacity: 0.6 },
  reorderText: { fontSize: 12, fontWeight: '600', color: BRAND_GREEN },

  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  emptyStateMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },

  errorTitle: { fontSize: 18, fontWeight: '700', color: '#dc2626', marginBottom: 8 },
  errorMessage: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 20,
  },

  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },

  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: { backgroundColor: BRAND_GREEN },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
