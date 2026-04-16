import React, { useState, useCallback, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import {
  getDisputes,
  getDisputeStatusColor,
  getDisputeStatusLabel,
  getResolutionStatusLabel,
} from '@/services/disputes';

/**
 * Disputes List Screen (Task 9.8)
 * 
 * Displays customer's disputes with:
 * - Status filtering (open, under_review, resolved, rejected, refunded)
 * - Infinite scroll pagination
 * - Resolution status tracking
 * - Navigation to dispute detail
 */

type FilterStatus = 'all' | 'open' | 'under_review' | 'resolved';

const STATUS_FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Resolved', value: 'resolved' },
];

const getStatusesForFilter = (filter: FilterStatus) => {
  switch (filter) {
    case 'open':
      return ['open'];
    case 'under_review':
      return ['under_review'];
    case 'resolved':
      return ['resolved', 'refunded', 'rejected'];
    default:
      return undefined;
  }
};

export default function DisputesListScreen() {
  const router = useRouter();
  const { token } = useAuthStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');

  const pageSize = 10;

  // Initial load
  useEffect(() => {
    loadDisputes(1, true);
  }, []);

  // Reload when filter changes
  useEffect(() => {
    loadDisputes(1, true);
  }, [selectedFilter]);

  const loadDisputes = async (page: number, isRefresh: boolean = false) => {
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
      const response = await getDisputes(
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
        setDisputes(response.data);
      } else {
        setDisputes((prev) => [...prev, ...response.data]);
      }

      setError(null);
    } catch (err: any) {
      const message = err?.message || 'Failed to load disputes';
      setError(message);
      console.error('Disputes load error:', message);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleEndReached = () => {
    if (!isLoadingMore && !isLoading && currentPage < totalPages) {
      loadDisputes(currentPage + 1);
    }
  };

  const handleRefresh = () => {
    loadDisputes(1, true);
  };

  const handleDisputePress = (dispute: any) => {
    router.push(`/(tabs)/disputes/${dispute.id}`);
  };

  const handleNewDispute = () => {
    router.push('/(tabs)/orders?section=disputes');
  };

  const renderDisputeItem = ({ item: dispute }: { item: any }) => {
    const orderRef = dispute.order?.id.slice(0, 8).toUpperCase() || 'Unknown';
    const shopName = dispute.order?.shop?.name || 'Unknown Shop';
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <TouchableOpacity
        style={styles.disputeCard}
        onPress={() => handleDisputePress(dispute)}
        activeOpacity={0.7}
      >
        {/* Header: Order ref, Date, Status */}
        <View style={styles.disputeHeader}>
          <View>
            <Text style={styles.orderRef}>Order #{orderRef}</Text>
            <Text style={styles.shopName}>{shopName}</Text>
          </View>
          <View style={styles.statusSection}>
            <Text style={styles.daysAgo}>
              {daysSinceCreated}d ago
            </Text>
          </View>
        </View>

        {/* Reason */}
        <Text style={styles.reason}>{dispute.reason}</Text>

        {/* Status Badges */}
        <View style={styles.badgesContainer}>
          {/* Dispute Status */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getDisputeStatusColor(dispute.status)}20` },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: getDisputeStatusColor(dispute.status) },
              ]}
            >
              {getDisputeStatusLabel(dispute.status)}
            </Text>
          </View>

          {/* Resolution Status */}
          <View style={styles.resolutionBadge}>
            <Text style={styles.resolutionText}>
              {getResolutionStatusLabel(dispute.resolution_status)}
            </Text>
          </View>
        </View>

        {/* Refund Amount (if applicable) */}
        {dispute.refund_amount && (
          <View style={styles.refundSection}>
            <Text style={styles.refundLabel}>Refund Amount:</Text>
            <Text style={styles.refundAmount}>
              ₹{(dispute.refund_amount / 100).toFixed(2)}
            </Text>
          </View>
        )}

        {/* Arrow Indicator */}
        <Text style={styles.arrow}>→</Text>
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

  if (isLoading && disputes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading disputes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && disputes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Unable to Load Disputes</Text>
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

  if (!isLoading && disputes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Support & Disputes</Text>
        </View>

        <View style={styles.filterContainer}>
          {STATUS_FILTERS.map(renderFilter)}
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.emptyStateEmoji}>😊</Text>
          <Text style={styles.emptyStateTitle}>No Disputes Yet</Text>
          <Text style={styles.emptyStateMessage}>
            {selectedFilter === 'all'
              ? 'You have no open disputes. We hope your orders are going smoothly!'
              : `No ${selectedFilter} disputes`}
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Text style={styles.buttonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with New Dispute Button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Support & Disputes</Text>
          <Text style={styles.headerSubtitle}>Manage your order disputes</Text>
        </View>
        <TouchableOpacity
          style={styles.newDisputeButton}
          onPress={handleNewDispute}
        >
          <Text style={styles.newDisputeIcon}>+</Text>
        </TouchableOpacity>
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

      {/* Disputes List */}
      <FlatList
        data={disputes}
        keyExtractor={(item) => item.id}
        renderItem={renderDisputeItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#ef4444"
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#ef4444" />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  newDisputeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newDisputeIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
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
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
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

  // Dispute Card
  disputeCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderRef: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  shopName: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  daysAgo: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },

  // Reason
  reason: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },

  // Badges
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resolutionBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  resolutionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },

  // Refund Section
  refundSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  refundLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  refundAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },

  // Arrow
  arrow: {
    position: 'absolute',
    right: 12,
    top: 12,
    fontSize: 16,
    color: '#d1d5db',
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
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
