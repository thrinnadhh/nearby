/**
 * PreviewStep Component — second step of bulk upload flow
 * Shows CSV data preview with validation results
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ScrollView,
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
import { CsvPreviewData, CsvRowWithErrors } from '@/types/csv';
import { PreviewRow } from './PreviewRow';
import logger from '@/utils/logger';

interface PreviewStepProps {
  previewData: CsvPreviewData;
  onConfirm: (rows: CsvRowWithErrors[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function PreviewStep({
  previewData,
  onConfirm,
  onCancel,
  isLoading,
}: PreviewStepProps) {
  const [expandedRow, setExpandedRow] = React.useState<number | null>(null);

  // Separate valid and invalid rows
  const { validRows, invalidRows } = useMemo(() => {
    return {
      validRows: previewData.rows.filter((r) => r.isValid),
      invalidRows: previewData.rows.filter((r) => !r.isValid),
    };
  }, [previewData.rows]);

  // Filter to show (all by default, or just invalid if user clicks)
  const [showOnlyInvalid, setShowOnlyInvalid] = React.useState(false);

  const rowsToDisplay = useMemo(
    () => (showOnlyInvalid ? invalidRows : previewData.rows),
    [previewData.rows, invalidRows, showOnlyInvalid]
  );

  const handleConfirm = useCallback(() => {
    logger.info('Confirmed CSV preview', {
      totalRows: previewData.totalRows,
      validRows: previewData.validRows,
    });
    onConfirm(previewData.rows);
  }, [previewData, onConfirm]);

  const handleCancel = useCallback(() => {
    logger.info('Cancelled CSV preview');
    onCancel();
  }, [onCancel]);

  // If no rows, show empty state
  if (previewData.rows.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="inbox-outline"
          size={48}
          color={colors.textTertiary}
        />
        <Text style={styles.emptyTitle}>No Data to Preview</Text>
        <Text style={styles.emptyText}>The CSV file appears to be empty</Text>
      </View>
    );
  }

  const validPercentage = Math.round(
    (previewData.validRows / previewData.totalRows) * 100
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Review Your Data</Text>
          <Text style={styles.subtitle}>
            {previewData.fileName} • {previewData.totalRows} rows •{' '}
            {(previewData.fileSize / 1024).toFixed(1)} KB
          </Text>
        </View>

        {/* Statistics Card */}
        <View style={[styles.statsCard, shadows.sm]}>
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{previewData.totalRows}</Text>
            <Text style={styles.statLabel}>Total Rows</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {previewData.validRows}
            </Text>
            <Text style={styles.statLabel}>Valid</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={[styles.statValue, { color: colors.error }]}>
              {previewData.invalidRows}
            </Text>
            <Text style={styles.statLabel}>Invalid</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{validPercentage}%</Text>
            <Text style={styles.statLabel}>Valid</Text>
          </View>
        </View>

        {/* Filter toggle (show if there are invalid rows) */}
        {previewData.invalidRows > 0 && (
          <TouchableOpacity
            style={[styles.filterButton, showOnlyInvalid && styles.filterButtonActive]}
            onPress={() => setShowOnlyInvalid(!showOnlyInvalid)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="filter"
              size={18}
              color={showOnlyInvalid ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterButtonText,
                showOnlyInvalid && styles.filterButtonTextActive,
              ]}
            >
              {showOnlyInvalid ? 'Showing Invalid Only' : 'Show All Rows'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Info message for invalid rows */}
        {previewData.invalidRows > 0 && !showOnlyInvalid && (
          <View style={[styles.infoBox, shadows.sm]}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color={colors.warning}
            />
            <Text style={styles.infoText}>
              {previewData.invalidRows} row(s) have errors and won't be uploaded.
              Fix them or they'll be skipped.
            </Text>
          </View>
        )}

        {/* Rows list */}
        <View style={styles.rowsContainer}>
          {rowsToDisplay.map((row) => (
            <PreviewRow
              key={`row-${row.rowNumber}`}
              row={row}
              showDetails={expandedRow === row.rowNumber}
              onPress={() =>
                setExpandedRow(
                  expandedRow === row.rowNumber ? null : row.rowNumber
                )
              }
            />
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.cancelButton, shadows.sm]}
            onPress={handleCancel}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              shadows.md,
              isLoading && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={isLoading || previewData.validRows === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>
              Upload {previewData.validRows} Product
              {previewData.validRows !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.warning,
  },
  rowsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  buttonSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: 'white',
  },
});
