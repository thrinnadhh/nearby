/**
 * Low Stock Alerts Screen — displays products below low stock threshold
 * Features:
 *  - Pull-to-refresh with dismissal clearing
 *  - Configurable stock threshold (1-999)
 *  - Sorting by stock, name, or updated_at
 *  - Per-product dismissal with AsyncStorage persistence
 *  - Pagination (load more)
 *  - Empty state handling
 *  - Error handling and retry
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Modal,
  Switch,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';
import { useLowStockDismissal } from '@/hooks/useLowStockDismissal';
import { LowStockAlertItem } from '@/components/product/LowStockAlertItem';
import { LowStockEmptyState } from '@/components/product/LowStockEmptyState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import logger from '@/utils/logger';

const screenHeight = Dimensions.get('window').height;

export default function LowStockAlertsScreen() {
  // State
  const {
    products,
    loading,
    refreshing,
    error,
    pagination,
    fetchProducts,
    loadMore,
    refresh,
    setThreshold,
    setSortBy,
    retry,
  } = useLowStockAlerts();

  const {
    isDismissed,
    dismissProduct,
    undismissProduct,
    clearAllDismissals,
  } = useLowStockDismissal();

  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(pagination.threshold);
  const [currentSortBy, setCurrentSortBy] = useState<'stock' | 'name' | 'updated_at'>('stock');
  const [dismissedClearedMessage, setDismissedClearedMessage] = useState(false);

  // Filter out dismissed products
  const visibleProducts = useMemo(
    () => products.filter((p) => !isDismissed(p.id)),
    [products, isDismissed]
  );

  // Focus effect: reset temp threshold when pagination changes
  useFocusEffect(
    useCallback(() => {
      setTempThreshold(pagination.threshold);
      logger.info('Low stock alerts screen focused');
    }, [pagination.threshold])
  );

  // Handle refresh with dismissal clearing
  const handleRefresh = useCallback(async () => {
    try {
      await clearAllDismissals();
      await refresh();
      setDismissedClearedMessage(true);
      setTimeout(() => setDismissedClearedMessage(false), 2000);
      logger.info('Low stock alerts refreshed and dismissals cleared');
    } catch (err) {
      logger.error('Failed to refresh low stock alerts', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [clearAllDismissals, refresh]);

  // Handle threshold save
  const handleThresholdSave = useCallback(async () => {
    const newThreshold = Math.max(1, Math.min(999, parseInt(tempThreshold.toString(), 10) || 5));
    setShowThresholdModal(false);
    await setThreshold(newThreshold);
    logger.info('Threshold updated', { threshold: newThreshold });
  }, [tempThreshold, setThreshold]);

  // Handle sort change
  const handleSortChange = useCallback(
    async (newSort: 'stock' | 'name' | 'updated_at') => {
      setCurrentSortBy(newSort);
      await setSortBy(newSort);
      logger.info('Sort order changed', { sortBy: newSort });
    },
    [setSortBy]
  );

  // Handle dismiss product
  const handleDismissProduct = useCallback(
    async (productId: string) => {
      try {
        await dismissProduct(productId, 'manual_dismiss');
        logger.info('Product dismissed', { productId });
      } catch (err) {
        logger.error('Failed to dismiss product', { productId });
      }
    },
    [dismissProduct]
  );

  // Handle undismiss product
  const handleUndismissProduct = useCallback(
    async (productId: string) => {
      try {
        await undismissProduct(productId);
        logger.info('Product undismissed', { productId });
      } catch (err) {
        logger.error('Failed to undismiss product', { productId });
      }
    },
    [undismissProduct]
  );

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Low Stock Alerts</Text>
          <Text style={styles.headerSubtitle}>
            {pagination.lowStockCount} product{pagination.lowStockCount !== 1 ? 's' : ''} below {pagination.threshold} unit{pagination.threshold !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowThresholdModal(true)}
        >
          <MaterialCommunityIcons name="cog" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <View style={styles.sortOptions}>
        {(['stock', 'name', 'updated_at'] as const).map((sort) => (
          <TouchableOpacity
            key={sort}
            style={[
              styles.sortButton,
              currentSortBy === sort && styles.sortButtonActive,
            ]}
            onPress={() => handleSortChange(sort)}
          >
            <Text
              style={[
                styles.sortButtonText,
                currentSortBy === sort && styles.sortButtonTextActive,
              ]}
            >
              {sort === 'stock' ? 'Stock' : sort === 'name' ? 'Name' : 'Updated'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Dismissed Message */}
      {dismissedClearedMessage && (
        <View style={styles.messageBar}>
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={colors.success}
            style={{ marginRight: spacing.sm }}
          />
          <Text style={styles.messageText}>Dismissed alerts cleared</Text>
        </View>
      )}
    </View>
  );

  // Render empty state
  if (visibleProducts.length === 0 && !loading && !error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <LowStockEmptyState
          threshold={pagination.threshold}
          isDismissedAllCleared={dismissedClearedMessage}
          onAdjustThreshold={() => setShowThresholdModal(true)}
          onRetry={retry}
          error={null}
        />
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && visibleProducts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <LowStockEmptyState
          threshold={pagination.threshold}
          error={error}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={visibleProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LowStockAlertItem
              product={item}
              isDismissed={isDismissed(item.id)}
              onDismiss={handleDismissProduct}
              onUndismiss={handleUndismissProduct}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            loading ? (
              <View style={{ height: screenHeight * 0.5, justifyContent: 'center' }}>
                <LoadingSpinner />
              </View>
            ) : (
              <LowStockEmptyState
                threshold={pagination.threshold}
                onAdjustThreshold={() => setShowThresholdModal(true)}
              />
            )
          }
          onEndReached={() => {
            if (!loading && pagination.page < pagination.pages) {
              loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
        />

        {/* Threshold Modal */}
        <Modal
          visible={showThresholdModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowThresholdModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Low Stock Threshold</Text>
                <TouchableOpacity onPress={() => setShowThresholdModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Alert when stock reaches:</Text>
                <View style={styles.thresholdInput}>
                  <TouchableOpacity
                    onPress={() => setTempThreshold(Math.max(1, tempThreshold - 1))}
                    style={styles.thresholdButton}
                  >
                    <MaterialCommunityIcons name="minus" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.thresholdValue}>{tempThreshold}</Text>
                  <TouchableOpacity
                    onPress={() => setTempThreshold(Math.min(999, tempThreshold + 1))}
                    style={styles.thresholdButton}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.thresholdHint}>
                  Products with stock ≤ {tempThreshold} unit{tempThreshold !== 1 ? 's' : ''} will appear in alerts
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleThresholdSave}
              >
                <Text style={styles.modalButtonText}>Save Threshold</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  sortOptions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  sortButtonTextActive: {
    color: colors.white,
  },
  messageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontFamily: fontFamily.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  modalBody: {
    marginBottom: spacing.lg,
  },
  modalLabel: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  thresholdInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  thresholdButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thresholdValue: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginHorizontal: spacing.lg,
    minWidth: 50,
    textAlign: 'center',
  },
  thresholdHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.white,
  },
});
