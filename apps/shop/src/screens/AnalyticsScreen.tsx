/**
 * AnalyticsScreen for Task 12.10
 * Main shop analytics dashboard
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useShopAnalytics } from '@/hooks/useShopAnalytics';
import { useAuthStore } from '@/store/auth';
import { AnalyticsDateRange } from '@/types/analytics';
import logger from '@/utils/logger';

export default function AnalyticsScreen() {
  const shopId = useAuthStore((s) => s.shopId);
  const {
    data,
    topProducts,
    loading,
    error,
    dateRange,
    isOffline,
    fetchAnalytics,
    retry,
  } = useShopAnalytics();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchAnalytics(dateRange);
    } catch (err) {
      logger.error('Refresh failed', { error: err instanceof Error ? err.message : 'Unknown' });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAnalytics, dateRange]);

  const handleDateRangeChange = useCallback(
    async (range: AnalyticsDateRange) => {
      logger.info('Date range changed', { range });
      await fetchAnalytics(range);
    },
    [fetchAnalytics]
  );

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialIcons name='error' size={48} color='#EF4444' />
          <Text style={styles.emptyStateText}>Shop ID not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = !data || (!data.today && data.topProducts?.length === 0);
  const showError = error && !isEmpty;
  const showOffline = isOffline && isEmpty;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>
          {new Date().toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>

      {showError && (
        <View style={styles.errorBanner}>
          <MaterialIcons name='error' size={20} color='#EF4444' />
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>Failed to load analytics</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
          <TouchableOpacity onPress={handleRetry} testID='retry-button'>
            <MaterialIcons name='refresh' size={20} color='#EF4444' />
          </TouchableOpacity>
        </View>
      )}

      {showOffline && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name='cloud-off' size={20} color='#F59E0B' />
          <Text style={styles.offlineText}>
            You are offline. Showing cached data.
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
          />
        }
      >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <MaterialIcons name='bar-chart' size={48} color='#D1D5DB' />
            <Text style={styles.emptyStateText}>No analytics data yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Complete your first order to see analytics
            </Text>
          </View>
        ) : (
          <>
            {/* Date Range Selector */}
            <View style={styles.dateRangeSelector}>
              {(['7d', '30d', '90d'] as AnalyticsDateRange[]).map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.dateRangeButton,
                    dateRange === range && styles.dateRangeButtonActive,
                  ]}
                  onPress={() => handleDateRangeChange(range)}
                  testID={`range-${range}`}
                >
                  <Text
                    style={[
                      styles.dateRangeText,
                      dateRange === range && styles.dateRangeTextActive,
                    ]}
                  >
                    {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Metrics Cards */}
            {data && (
              <View style={styles.metricsContainer}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Today Views</Text>
                  <Text style={styles.metricValue}>{data.today?.views || 0}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Today Orders</Text>
                  <Text style={styles.metricValue}>{data.today?.orders || 0}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Today Revenue</Text>
                  <Text style={styles.metricValue}>
                    ₹{Math.floor((data.today?.revenuePaise || 0) / 100)}
                  </Text>
                </View>
              </View>
            )}

            {/* Top Products */}
            {topProducts && topProducts.length > 0 && (
              <View style={styles.topProductsSection}>
                <Text style={styles.sectionTitle}>Top Products</Text>
                <FlatList
                  data={topProducts}
                  keyExtractor={(item) => item.productId}
                  renderItem={({ item }) => (
                    <View style={styles.productItem}>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {item.productName}
                        </Text>
                        <Text style={styles.productStats}>
                          {item.totalSales} sold • ₹{Math.floor(item.totalRevenuePaise / 100)}
                        </Text>
                      </View>
                      <View style={styles.productRating}>
                        <MaterialIcons name='star' size={16} color='#F59E0B' />
                        <Text style={styles.ratingText}>
                          {(item.avgRating || 0).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  )}
                  scrollEnabled={false}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorContent: {
    flex: 1,
    marginLeft: 12,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  errorMessage: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
  },
  offlineBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  dateRangeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateRangeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dateRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  dateRangeTextActive: {
    color: '#FFFFFF',
  },
  metricsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  topProductsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  productItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productStats: {
    fontSize: 11,
    color: '#6B7280',
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
});
