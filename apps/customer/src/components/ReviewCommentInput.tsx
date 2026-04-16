/**
 * ReviewCommentInput Component (Task 10.5)
 * Text input with character counter (max 500 chars)
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
} from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';

interface ReviewCommentInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

const MAX_CHARS = 500;

export function ReviewCommentInput({
  value,
  onChangeText,
  placeholder = 'Share your experience...',
  maxLength = MAX_CHARS,
  disabled = false,
}: ReviewCommentInputProps) {
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, disabled && styles.inputDisabled]}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        multiline
        numberOfLines={4}
        editable={!disabled}
        textAlignVertical="top"
      />
      <View style={styles.footer}>
        <Text
          style={[
            styles.charCount,
            isNearLimit && styles.charCountWarning,
          ]}
        >
          {charCount}/{maxLength}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },

  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    minHeight: 100,
  },

  inputDisabled: {
    opacity: 0.5,
    backgroundColor: colors.surface,
  },

  footer: {
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },

  charCount: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },

  charCountWarning: {
    color: colors.warning,
  },
});
