/**
 * EarningsScreen
 * Main earnings dashboard for shop owners
 * Shows today/week/month earnings with pull-to-refresh
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEarningsData } from '@/hooks/useEarningsData';
import { useEarningsRefresh } from '@/hooks/useEarningsRefresh';
import { useAuthStore } from '@/store/auth';
import { EarningsSummaryCard } from '@/components/EarningsSummaryCard';
import { EarningsChartCard } from '@/components/EarningsChartCard';
import { EarningsBreakdown } from '@/components/EarningsBreakdown';
import { EarningsEmptyState } from '@/components/EarningsEmptyState';
import { DateRange } from '@/types/earnings';
import logger from '@/utils/logger';

export default function EarningsScreen() {
  const shopId = useAuthStore((s) => s.shopId);
  const {
    earnings,
    loading,
    error,
    dateRange,
    isOffline,
    fetchEarnings,
  } = useEarningsData();

  // ✅ FIXED (BUG 1): Define showToast FIRST (before its usage in useEarningsRefresh)
  function showToast(message: string, type: 'success' | 'error') {
    // Using Alert for simplicity (in production, use a toast library)
    logger.debug('Toast', { message, type });
  }

  // ✅ Now showToast is available (already defined)
  const { handleRefresh, isRefreshing } = useEarningsRefresh(
    shopId,
    dateRange,
    showToast
  );

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleDateRangeChange = useCallback(
    async (range: DateRange) => {
      logger.info('Date range changed', { range });
      await fetchEarnings(range);
    },
    [fetchEarnings]
  );

  const openBreakdown = useCallback((date: string) => {
    setSelectedDate(date);
    setShowBreakdown(true);
  }, []);

  const closeBreakdown = useCallback(() => {
    setShowBreakdown(false);
    setSelectedDate(null);
  }, []);

  const handleRetry = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const selectedRecord = earnings?.today;

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <EarningsEmptyState reason='error' testID='empty-state' />
      </SafeAreaView>
    );
  }

  const isEmpty =
    !earnings || (earnings.today === null && earnings.week.length === 0);
  const showError = error && !isEmpty;
  const showOffline = isOffline && isEmpty;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        {earnings && !isEmpty && (
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        )}
      </View>

      {showError && (
        <View style={styles.errorBanner}>
          <MaterialIcons name='error' size={20} color='#EF4444' />
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>Failed to load earnings</Text>
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
            tintColor='#3B82F6'
          />
        }
        testID='earnings-scroll-view'
      >
        {isEmpty ? (
          <EarningsEmptyState
            reason={showOffline ? 'offline' : 'noData'}
            testID='empty-state'
          />
        ) : (
          <>
            {/* Date Range Selector */}
            <View style={styles.rangeSelector}>
              {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.rangeButton,
                    dateRange === range && styles.rangeButtonActive,
                  ]}
                  onPress={() => handleDateRangeChange(range)}
                  testID={`date-range-${range}`}
                >
                  <Text
                    style={[
                      styles.rangeButtonText,
                      dateRange === range &&
                        styles.rangeButtonTextActive,
                    ]}
                  >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary Cards */}
            <View style={styles.cardsSection}>
              {earnings.today && (
                <TouchableOpacity
                  onPress={() => openBreakdown(earnings.today!.date)}
                  activeOpacity={0.7}
                >
                  <EarningsSummaryCard
                    label='Today'
                    value={earnings.today.netRevenuePaise}
                    previousValue={earnings.summary.previous_day_total}
                    testID='today-card'
                  />
                </TouchableOpacity>
              )}

              <EarningsSummaryCard
                label='This Week'
                value={earnings.summary.week_total}
                previousValue={earnings.summary.previous_week_total}
                testID='week-card'
              />

              <EarningsSummaryCard
                label='This Month'
                value={earnings.summary.month_total}
                previousValue={earnings.summary.previous_month_total}
                testID='month-card'
              />
            </View>

            {/* 7-Day Chart */}
            {earnings.week.length > 0 && (
              <EarningsChartCard weekData={earnings.week} testID='chart-card' />
            )}

            {/* Breakdown Button */}
            {earnings.today && (
              <TouchableOpacity
                style={styles.breakdownButton}
                onPress={() => openBreakdown(earnings.today!.date)}
                testID='breakdown-button'
              >
                <View style={styles.breakdownContent}>
                  <MaterialIcons name='receipt' size={20} color='#3B82F6' />
                  <View style={styles.breakdownText}>
                    <Text style={styles.breakdownTitle}>View Breakdown</Text>
                    <Text style={styles.breakdownSubtitle}>
                      See commission and fee details
                    </Text>
                  </View>
                </View>
                <MaterialIcons name='chevron-right' size={24} color='#D1D5DB' />
              </TouchableOpacity>
            )}

            <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>

      {/* Breakdown Modal */}
      <EarningsBreakdown
        record={selectedRecord || null}
        visible={showBreakdown}
        onClose={closeBreakdown}
        testID='breakdown-modal'
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  errorMessage: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },
  offlineBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  offlineText: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  rangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rangeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  rangeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  rangeButtonTextActive: {
    color: '#FFFFFF',
  },
  cardsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  breakdownButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  breakdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  breakdownText: {
    flex: 1,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  breakdownSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  bottomSpacer: {
    height: 24,
  },
});
