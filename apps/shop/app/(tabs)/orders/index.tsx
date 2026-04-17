/**
 * Order Inbox Screen (Task 11.6) — List of pending orders with countdown timers
 * Listens to Socket.IO events for real-time new orders
 */

import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Text,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useOrders } from '@/hooks/useOrders';
import { useOrderSocket } from '@/hooks/useOrderSocket.ts';
import { useFCM } from '@/hooks/useFCM';
import { useOrdersStore } from '@/store/orders';
import { OrderCard } from '@/components/order/OrderCard';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
} from '@/constants/theme';
import logger from '@/utils/logger';

export default function OrdersListScreen() {
  const router = useRouter();
  const { orders, loading, error, fetchOrders, retry } = useOrders();
  const { onNewOrder } = useOrderSocket();
  const { registerFCMToken } = useFCM();
  const { addOrder: addOrderToStore } = useOrdersStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'accepted' | 'packing' | 'ready' | 'picked_up'>('all');

  // Register FCM token on mount
  useEffect(() => {
    const registerToken = async () => {
      const token = await registerFCMToken();
      if (token) {
        logger.info('FCM token registered for orders');
      }
    };
    registerToken();
  }, [registerFCMToken]);

  // Listen to Socket.IO new order events
  useEffect(() => {
    const unsubscribe = onNewOrder((event: any) => {
      logger.info('New order received via Socket.IO', { orderId: event.orderId });
      // Add to store to update list
      const newOrder: Order = {
        id: event.orderId,
        shopId: '', // Will be populated from JWT
        customerId: event.customerId,
        customerName: event.customerName,
        customerPhone: '',
        deliveryAddress: '',
        items: [],
        subtotal: 0,
        deliveryFee: 0,
        total: event.total,
        status: 'pending',
        paymentMode: 'upi',
        createdAt: event.createdAt,
        updatedAt: event.createdAt,
        acceptanceDeadline: new Date(
          new Date(event.createdAt).getTime() + 3 * 60 * 1000
        ).toISOString(),
      };
      addOrderToStore(newOrder);
    });

    return unsubscribe;
  }, [onNewOrder, addOrderToStore]);

  // Fetch orders on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchOrders();
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders]);

  const handleOrderPress = useCallback(
    (orderId: string) => {
      logger.info('Opening order detail', { orderId });
      router.push({
        pathname: '(tabs)/orders/[id]',
        params: { id: orderId },
      });
    },
    [router]
  );

  // Filter orders based on active filter
  const filteredOrders = activeFilter === 'all' 
    ? orders 
    : orders.filter((order) => order.status === activeFilter);

  const filterTabs = useMemo(() => {
    const statusMap: Record<string, number> = {
      pending: 0,
      accepted: 0,
      packing: 0,
      ready: 0,
      picked_up: 0,
    };

    orders.forEach((order) => {
      if (order.status in statusMap) {
        statusMap[order.status]++;
      }
    });

    return [
      { label: 'All', value: 'all' as const, count: orders.length },
      { label: 'Pending', value: 'pending' as const, count: statusMap.pending },
      { label: 'Accepted', value: 'accepted' as const, count: statusMap.accepted },
      { label: 'Packing', value: 'packing' as const, count: statusMap.packing },
      { label: 'Ready', value: 'ready' as const, count: statusMap.ready },
      { label: 'Picked Up', value: 'picked_up' as const, count: statusMap.picked_up },
    ];
  }, [orders]);

  const renderEmptyState = () => {
    const filterLabel = filterTabs.find(tab => tab.value === activeFilter)?.label || 'Pending';
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No {filterLabel} Orders</Text>
        <Text style={styles.emptyMessage}>
          {activeFilter === 'all' 
            ? "You're all caught up! Check back soon for new orders."
            : `No orders in ${filterLabel.toLowerCase()} status yet.`
          }
        </Text>
      </View>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Failed to Load Orders</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <PrimaryButton label="Retry" onPress={retry} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incoming Orders</Text>
        <Text style={styles.headerSubtitle}>
          {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} 
          {activeFilter !== 'all' ? ` (${activeFilter.replace('_', ' ')})` : ''}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          data={filterTabs}
          keyExtractor={(item) => item.value}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                activeFilter === item.value && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === item.value && styles.filterTabTextActive,
                ]}
              >
                {item.label}
              </Text>
              {item.count > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    activeFilter === item.value && styles.filterBadgeActive,
                  ]}
                >
                  <Text style={styles.filterBadgeText}>{item.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterTabsContent}
        />
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => handleOrderPress(item.id)} />
        )}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerTitle: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },

  headerSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  filterContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  filterTabsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },

  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  filterTabActive: {
    backgroundColor: colors.primary,
  },

  filterTabText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  filterTabTextActive: {
    color: colors.surface,
  },

  filterBadge: {
    backgroundColor: colors.background,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterBadgeActive: {
    backgroundColor: colors.surface,
  },

  filterBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  errorTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.error,
    marginBottom: spacing.md,
  },

  errorMessage: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  listContent: {
    paddingVertical: spacing.md,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },

  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  emptyMessage: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
