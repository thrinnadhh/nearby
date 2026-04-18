/**
 * FilePickerStep Component — first step of bulk upload flow
 * Allows user to select CSV file from device
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
import logger from '@/utils/logger';

interface FilePickerStepProps {
  onFilePicked: (isLoading: boolean) => void;
  isLoading: boolean;
  error: string | null;
}

export function FilePickerStep({
  onFilePicked,
  isLoading,
  error,
}: FilePickerStepProps) {
  const handlePickFile = useCallback(async () => {
    try {
      logger.info('File picker initiated');
      onFilePicked(true);
    } catch (err) {
      logger.error('File picker error', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [onFilePicked]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <Text style={styles.title}>Upload Products in Bulk</Text>
      <Text style={styles.subtitle}>
        Import multiple products from a CSV file in seconds
      </Text>

      {/* Icon and info card */}
      <View style={[styles.card, shadows.md]}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="file-delimited"
            size={64}
            color={colors.primary}
          />
        </View>

        <Text style={styles.cardTitle}>CSV Upload</Text>
        <Text style={styles.cardDescription}>
          Prepare a CSV file with your products and upload in bulk. You can add or update multiple
          products at once.
        </Text>

        {/* Instructions */}
        <View style={styles.instructionList}>
          <InstructionItem
            icon="format-list-text"
            title="Required Columns"
            description="Product Name, Category, Price, Stock, Unit"
          />
          <InstructionItem
            icon="check-circle-outline"
            title="Validation"
            description="Each row is checked before upload"
          />
          <InstructionItem
            icon="lightning-bolt"
            title="Fast Upload"
            description="Supports up to 100 products per upload"
          />
          <InstructionItem
            icon="information-outline"
            title="See Errors"
            description="Preview shows exactly what will be imported"
          />
        </View>
      </View>

      {/* Error message */}
      {error && (
        <View style={[styles.errorBox, shadows.sm]}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={20}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Download template button */}
      <TouchableOpacity
        style={[styles.secondaryButton, shadows.sm]}
        disabled={isLoading}
      >
        <MaterialCommunityIcons
          name="download"
          size={20}
          color={colors.primary}
        />
        <Text style={styles.secondaryButtonText}>Download Template</Text>
      </TouchableOpacity>

      {/* Primary action button */}
      <TouchableOpacity
        style={[styles.primaryButton, shadows.md]}
        onPress={handlePickFile}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <MaterialCommunityIcons name="folder-open" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Select CSV File</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Helper text */}
      <Text style={styles.helperText}>
        Maximum file size: 5 MB | Supports CSV format only
      </Text>
    </ScrollView>
  );
}

interface InstructionItemProps {
  icon: string;
  title: string;
  description: string;
}

function InstructionItem({ icon, title, description }: InstructionItemProps) {
  return (
    <View style={styles.instructionItem}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={colors.primary}
        style={styles.instructionIcon}
      />
      <View style={styles.instructionContent}>
        <Text style={styles.instructionTitle}>{title}</Text>
        <Text style={styles.instructionDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  instructionList: {
    gap: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTopColor: spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  instructionIcon: {
    marginTop: 2,
  },
  instructionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  instructionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  instructionDescription: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  primaryButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: 'white',
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  helperText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
