/**
 * SettlementHistoryScreen
 * Shows settlement history with pagination
 */

import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettlements } from '@/hooks/useSettlements';
import { SettlementItem } from '@/components/SettlementItem';
import { SettlementEmptyState } from '@/components/SettlementEmptyState';
import logger from '@/utils/logger';

export default function SettlementHistoryScreen() {
  const {
    settlements,
    loading,
    error,
    page,
    pages,
    hasNextPage,
    hasPreviousPage,
    fetchSettlements,
    goToPage,
    isOffline,
  } = useSettlements();

  const handleRefresh = useCallback(async () => {
    logger.info('SettlementHistoryScreen: Refresh triggered');
    await fetchSettlements(1);
  }, [fetchSettlements]);

  const handleNextPage = useCallback(async () => {
    if (hasNextPage) {
      logger.info('SettlementHistoryScreen: Going to next page', {
        currentPage: page,
        nextPage: page + 1,
      });
      await goToPage(page + 1);
    }
  }, [hasNextPage, page, goToPage]);

  const handlePreviousPage = useCallback(async () => {
    if (hasPreviousPage) {
      logger.info('SettlementHistoryScreen: Going to previous page', {
        currentPage: page,
        previousPage: page - 1,
      });
      await goToPage(page - 1);
    }
  }, [hasPreviousPage, page, goToPage]);

  const handleSettlementPress = useCallback((settlementId: string) => {
    logger.info('SettlementHistoryScreen: Settlement pressed', {
      settlementId,
    });
    // TODO: Navigate to settlement detail screen if needed
  }, []);

  if (error && !settlements.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color="#E53935"
            style={styles.errorIcon}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
            testID="settlement-retry-button"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = settlements.length === 0 && !loading;

  return (
    <SafeAreaView style={styles.container}>
      {/* Offline indicator */}
      {isOffline && (
        <View style={styles.offlineIndicator}>
          <MaterialIcons name="cloud-off" size={16} color="#FFF" />
          <Text style={styles.offlineText}>Offline - Showing cached data</Text>
        </View>
      )}

      <FlatList
        data={settlements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SettlementItem
            settlement={item}
            onPress={() => handleSettlementPress(item.id)}
            testID={`settlement-item-${item.id}`}
          />
        )}
        ListEmptyComponent={isEmpty ? <SettlementEmptyState /> : null}
        contentContainerStyle={isEmpty ? styles.emptyListContent : undefined}
        refreshControl={
          <RefreshControl
            refreshing={loading && page === 1}
            onRefresh={handleRefresh}
            tintColor="#1976D2"
          />
        }
        scrollEventThrottle={16}
      />

      {/* Pagination controls */}
      {pages > 1 && !isEmpty && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              !hasPreviousPage && styles.paginationButtonDisabled,
            ]}
            onPress={handlePreviousPage}
            disabled={!hasPreviousPage}
            testID="settlement-previous-button"
          >
            <MaterialIcons
              name="chevron-left"
              size={24}
              color={hasPreviousPage ? '#1976D2' : '#CCC'}
            />
          </TouchableOpacity>

          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>
              Page {page} of {pages}
            </Text>
            {loading && <ActivityIndicator size="small" color="#1976D2" />}
          </View>

          <TouchableOpacity
            style={[
              styles.paginationButton,
              !hasNextPage && styles.paginationButtonDisabled,
            ]}
            onPress={handleNextPage}
            disabled={!hasNextPage}
            testID="settlement-next-button"
          >
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={hasNextPage ? '#1976D2' : '#CCC'}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Loading indicator for page loads */}
      {loading && page > 1 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  offlineIndicator: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 12,
    color: '#FFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  emptyListContent: {
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#E53935',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  paginationButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paginationText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
