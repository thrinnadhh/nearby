/**
 * ResultsStep Component — final step of bulk upload flow
 * Shows upload results with success/failure breakdown
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { UploadResults, ProductUploadResult } from '@/types/csv';
import logger from '@/utils/logger';

interface ResultsStepProps {
  results: UploadResults;
  onDone: () => void;
  onRetryFailed?: (failedCount: number) => void;
}

export function ResultsStep({
  results,
  onDone,
  onRetryFailed,
}: ResultsStepProps) {
  // Separate successful and failed results
  const { successfulResults, failedResults } = useMemo(() => {
    return {
      successfulResults: results.results.filter((r) => r.status === 'success'),
      failedResults: results.results.filter((r) => r.status === 'failed'),
    };
  }, [results.results]);

  const successPercentage = Math.round(
    (results.successfulCount / results.totalProcessed) * 100
  );

  const handleDone = React.useCallback(() => {
    logger.info('Results step closed', {
      successful: results.successfulCount,
      failed: results.failedCount,
    });
    onDone();
  }, [results, onDone]);

  const handleRetry = React.useCallback(() => {
    if (onRetryFailed && results.failedCount > 0) {
      logger.info('Retrying failed products', { count: results.failedCount });
      onRetryFailed(results.failedCount);
    }
  }, [results, onRetryFailed]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header with status */}
        <View style={styles.header}>
          {results.failedCount === 0 ? (
            <>
              <MaterialCommunityIcons
                name="check-circle"
                size={64}
                color={colors.success}
              />
              <Text style={styles.successTitle}>Upload Complete!</Text>
              <Text style={styles.subtitle}>
                All products imported successfully
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons
                name="alert-circle"
                size={64}
                color={colors.warning}
              />
              <Text style={styles.partialTitle}>Upload Partial</Text>
              <Text style={styles.subtitle}>
                Some products had errors
              </Text>
            </>
          )}
        </View>

        {/* Results summary card */}
        <View style={[styles.summaryCard, shadows.md]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryColumn}>
              <Text style={styles.summaryLabel}>Total Processed</Text>
              <Text style={styles.summaryValue}>{results.totalProcessed}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryColumn}>
              <Text style={styles.summaryLabel}>Successful</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                {results.successfulCount}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryColumn}>
              <Text style={styles.summaryLabel}>Failed</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                {results.failedCount}
              </Text>
            </View>
          </View>

          {/* Success percentage */}
          <View style={styles.percentageSection}>
            <View style={styles.percentageBar}>
              <View
                style={[
                  styles.percentageFill,
                  { width: `${successPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.percentageText}>
              {successPercentage}% success rate
            </Text>
          </View>

          {/* Time info */}
          <View style={styles.timeSection}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.timeText}>
              Completed in {(results.duration / 1000).toFixed(1)}s
            </Text>
          </View>
        </View>

        {/* Detailed results */}
        {results.failedCount > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color={colors.error}
              />
              <Text style={styles.sectionTitle}>
                {results.failedCount} Failed Product
                {results.failedCount !== 1 ? 's' : ''}
              </Text>
            </View>

            <FlatList
              scrollEnabled={false}
              data={failedResults}
              keyExtractor={(item) => `failed-${item.rowNumber}`}
              renderItem={({ item }) => (
                <ResultItem
                  result={item}
                  type="failed"
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
            />
          </>
        )}

        {results.successfulCount > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.sectionTitle}>
                {results.successfulCount} Successful Product
                {results.successfulCount !== 1 ? 's' : ''}
              </Text>
            </View>

            {results.successfulCount > 10 ? (
              <Text style={styles.showAllText}>
                Showing first 10 of {results.successfulCount}
              </Text>
            ) : null}

            <FlatList
              scrollEnabled={false}
              data={successfulResults.slice(0, 10)}
              keyExtractor={(item) => `success-${item.rowNumber}`}
              renderItem={({ item }) => (
                <ResultItem
                  result={item}
                  type="successful"
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
            />
          </>
        )}

        {/* Action buttons */}
        <View style={styles.buttonSection}>
          {results.failedCount > 0 && onRetryFailed && (
            <TouchableOpacity
              style={[styles.retryButton, shadows.sm]}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="reload"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.retryButtonText}>
                Retry {results.failedCount} Failed
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.doneButton, shadows.md]}
            onPress={handleDone}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>
              {results.failedCount === 0 ? 'Done' : 'Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ResultItemProps {
  result: ProductUploadResult;
  type: 'successful' | 'failed';
}

function ResultItem({ result, type }: ResultItemProps) {
  const isSuccess = type === 'successful';

  return (
    <View style={[styles.resultItem, isSuccess && styles.resultItemSuccess]}>
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <MaterialCommunityIcons
            name={isSuccess ? 'check-circle' : 'alert-circle'}
            size={20}
            color={isSuccess ? colors.success : colors.error}
          />
          <Text style={styles.resultRowNumber}>Row #{result.rowNumber}</Text>
        </View>

        {!isSuccess && result.error && (
          <Text style={styles.resultError}>{result.error}</Text>
        )}

        {isSuccess && result.productId && (
          <Text style={styles.resultProductId}>ID: {result.productId}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.success,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  partialTitle: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.warning,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  percentageSection: {
    gap: spacing.sm,
  },
  percentageBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
  },
  percentageText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTopColor: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTopColor: spacing.md,
  },
  timeText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  showAllText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  listContent: {
    marginBottom: spacing.lg,
  },
  separator: {
    height: 8,
    backgroundColor: 'transparent',
  },
  resultItem: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  resultItemSuccess: {
    backgroundColor: colors.successLight,
    borderLeftColor: colors.success,
  },
  resultContent: {
    gap: spacing.xs,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultRowNumber: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  resultError: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginLeft: spacing.lg,
  },
  resultProductId: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.success,
    marginLeft: spacing.lg,
  },
  buttonSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  doneButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: 'white',
  },
});
