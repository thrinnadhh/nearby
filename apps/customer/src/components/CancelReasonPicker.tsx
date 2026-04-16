import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';

/**
 * CancelReasonPicker Component (Task 10.3)
 * 
 * Radio button list for selecting cancellation reason
 * with optional free text field for "Other"
 */

interface CancelReasonPickerProps {
  reasons: string[];
  selected: string | null;
  onSelect: (reason: string) => void;
  otherReason?: string;
  onOtherReasonChange?: (text: string) => void;
  disabled?: boolean;
}

export function CancelReasonPicker({
  reasons,
  selected,
  onSelect,
  otherReason = '',
  onOtherReasonChange,
  disabled = false,
}: CancelReasonPickerProps) {
  return (
    <View style={styles.container}>
      {reasons.map((reason) => {
        const isSelected = selected === reason;
        const isOtherReason = reason === 'Other reason';

        return (
          <View key={reason}>
            <TouchableOpacity
              style={[
                styles.reasonButton,
                isSelected && styles.reasonButtonSelected,
              ]}
              onPress={() => onSelect(reason)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <View style={styles.radioOuter}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <Text
                style={[
                  styles.reasonText,
                  isSelected && styles.reasonTextSelected,
                ]}
              >
                {reason}
              </Text>
            </TouchableOpacity>

            {/* Free text input for "Other reason" */}
            {isOtherReason && isSelected && onOtherReasonChange && (
              <View style={styles.otherReasonContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Please explain..."
                  placeholderTextColor={colors.textDisabled}
                  value={otherReason}
                  onChangeText={onOtherReasonChange}
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  editable={!disabled}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>
                  {otherReason.length}/500
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },

  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  reasonButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  reasonText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
  },

  reasonTextSelected: {
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },

  otherReasonContainer: {
    marginTop: spacing.md,
    marginLeft: spacing.lg,
  },

  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    minHeight: 80,
  },

  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
});
