/**
 * PreviewRow Component — displays single CSV row with validation state
 * Shows field values and validation errors
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';
import { CsvRowWithErrors } from '@/types/csv';
import { formatPrice } from '@/utils/productValidation';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PreviewRowProps {
  row: CsvRowWithErrors;
  onPress?: (row: CsvRowWithErrors) => void;
  showDetails?: boolean;
}

export function PreviewRow({
  row,
  onPress,
  showDetails = false,
}: PreviewRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(showDetails);

  const handlePress = React.useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.Presets.easeInEaseOut
    );
    setIsExpanded(!isExpanded);
    onPress?.(row);
  }, [isExpanded, row, onPress]);

  // Check if row has any errors
  const hasErrors = Object.keys(row.errors).length > 0;

  // Get error count
  const errorCount = Object.keys(row.errors).length;

  // Format data for display
  const displayData = useMemo(
    () => ({
      name: row.name || '(empty)',
      category: row.category || '(empty)',
      price: row.price ? formatPrice(row.price) : '(empty)',
      stock: String(row.stockQty) || '0',
      unit: row.unit || '(empty)',
      description: row.description?.substring(0, 50) || '(no description)',
    }),
    [row]
  );

  return (
    <View style={styles.container}>
      {/* Main row content - always visible */}
      <TouchableOpacity
        style={[
          styles.rowContent,
          hasErrors && styles.rowContentError,
          row.isValid && styles.rowContentValid,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {/* Row number and status icon */}
        <View style={styles.rowHeader}>
          <Text style={styles.rowNumber}>#{row.rowNumber}</Text>
          {row.isValid ? (
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
          ) : (
            <View style={styles.errorBadge}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color={colors.error}
              />
              <Text style={styles.errorBadgeText}>{errorCount}</Text>
            </View>
          )}
        </View>

        {/* Product info summary */}
        <View style={styles.summarySection}>
          <Text style={styles.productName} numberOfLines={1}>
            {displayData.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{displayData.category}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.metaText}>{displayData.price}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.metaText}>
              {displayData.stock} {displayData.unit}
            </Text>
          </View>
        </View>

        {/* Expand/collapse icon */}
        <MaterialCommunityIcons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.textSecondary}
          style={styles.expandIcon}
        />
      </TouchableOpacity>

      {/* Expanded content - shows all fields and errors */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* All field values */}
          <View style={styles.fieldsSection}>
            <DetailField label="Product Name" value={row.name} />
            <DetailField label="Category" value={row.category} />
            <DetailField label="Price (₹)" value={displayData.price} />
            <DetailField label="Stock Quantity" value={displayData.stock} />
            <DetailField label="Unit" value={row.unit} />
            {row.description && (
              <DetailField label="Description" value={row.description} />
            )}
          </View>

          {/* Errors section */}
          {hasErrors && (
            <View style={styles.errorsSection}>
              <View style={styles.errorsHeader}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={18}
                  color={colors.error}
                />
                <Text style={styles.errorsTitle}>Validation Errors</Text>
              </View>

              {Object.entries(row.errors).map(([field, error]) => (
                <View key={field} style={styles.errorItem}>
                  <Text style={styles.errorField}>{field}</Text>
                  <Text style={styles.errorMessage}>{error}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

interface DetailFieldProps {
  label: string;
  value: string;
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
  },
  rowContentValid: {
    borderLeftColor: colors.success,
    backgroundColor: colors.successLight,
  },
  rowContentError: {
    borderLeftColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 50,
  },
  rowNumber: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  errorBadge: {
    position: 'relative',
  },
  errorBadgeText: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: colors.error,
    color: 'white',
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    textAlign: 'center',
  },
  summarySection: {
    flex: 1,
    gap: spacing.xs,
  },
  productName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  separator: {
    color: colors.textTertiary,
  },
  expandIcon: {
    marginLeft: spacing.sm,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  fieldsSection: {
    gap: spacing.sm,
  },
  detailField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  detailLabel: {
    flex: 0.4,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  detailValue: {
    flex: 0.6,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
  },
  errorsSection: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  errorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorsTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.error,
  },
  errorItem: {
    gap: spacing.xs,
  },
  errorField: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.error,
  },
  errorMessage: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginLeft: spacing.md,
  },
});
