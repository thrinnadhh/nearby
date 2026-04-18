/**
 * UploadStep Component — third step of bulk upload flow
 * Shows upload progress with batch and row-level details
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { UploadProgress } from '@/types/csv';
import { ProgressIndicator } from './ProgressIndicator';
import logger from '@/utils/logger';

interface UploadStepProps {
  progress: UploadProgress | null;
  totalRows: number;
  onCancel: () => void;
}

export function UploadStep({
  progress,
  totalRows,
  onCancel,
}: UploadStepProps) {
  // Log progress updates
  useEffect(() => {
    if (progress) {
      logger.debug('Upload progress', {
        batch: progress.currentBatch,
        rows: progress.currentRow,
        percentage: progress.percentage,
      });
    }
  }, [progress]);

  if (!progress) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.errorText}>No progress data available</Text>
      </View>
    );
  }

  const timeEstimate = Math.max(1, Math.ceil((100 - progress.percentage) / 10));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="cloud-upload"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.title}>Uploading Products</Text>
          <Text style={styles.subtitle}>
            Please keep the app open while uploading
          </Text>
        </View>

        {/* Main progress card */}
        <View style={[styles.progressCard, shadows.md]}>
          {/* Overall progress */}
          <ProgressIndicator
            percentage={progress.percentage}
            label="Overall Progress"
          />

          {/* Batch progress */}
          <View style={styles.batchSection}>
            <View style={styles.batchHeader}>
              <Text style={styles.batchLabel}>Batch</Text>
              <Text style={styles.batchInfo}>
                {progress.currentBatch} of {progress.totalBatches}
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${
                      (progress.currentBatch / progress.totalBatches) * 100
                    }%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Row progress */}
          <View style={styles.rowSection}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowLabel}>Rows Processed</Text>
              <Text style={styles.rowInfo}>
                {progress.currentRow} of {totalRows}
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${(progress.currentRow / totalRows) * 100}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Status and stats */}
        <View style={[styles.statsSection, shadows.sm]}>
          <StatItem
            icon="information-outline"
            label="Status"
            value="Uploading..."
          />
          <StatItem
            icon="lightning-bolt"
            label="Estimated Time"
            value={`~${timeEstimate}s remaining`}
          />
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.tipText}>
              Don't close the app or lock your screen
            </Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.tipText}>
              Errors won't stop the upload
            </Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.tipText}>
              You'll see results when done
            </Text>
          </View>
        </View>

        {/* Cancel button */}
        <TouchableOpacity
          style={[styles.cancelButton, shadows.sm]}
          onPress={onCancel}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="close"
            size={20}
            color={colors.error}
          />
          <Text style={styles.cancelButtonText}>Cancel Upload</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatItemProps {
  icon: string;
  label: string;
  value: string;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statContent}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={colors.primary}
          style={styles.statIcon}
        />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
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
  title: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  batchSection: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  batchInfo: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  rowSection: {
    gap: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  rowInfo: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  statsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statIcon: {
    marginRight: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  tipsSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.xl,
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.error,
  },
});
