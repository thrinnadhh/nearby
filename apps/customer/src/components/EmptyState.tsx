/**
 * EmptyState Component (Task 10.9)
 * Reusable template for empty state screens across the app
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';

interface EmptyStateProps {
  icon: string; // MaterialCommunityIcons name
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  ctaSecondary?: { label: string; onPress: () => void };
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCtaPress,
  ctaSecondary,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon}
        size={64}
        color={colors.textSecondary}
        style={styles.icon}
      />

      <Text style={styles.title}>{title}</Text>

      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      <View style={styles.ctaContainer}>
        {ctaLabel && onCtaPress && (
          <TouchableOpacity
            style={styles.ctaPrimary}
            onPress={onCtaPress}
            activeOpacity={0.7}
          >
            <Text style={styles.ctaPrimaryText}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}

        {ctaSecondary && (
          <TouchableOpacity
            style={styles.ctaSecondary}
            onPress={ctaSecondary.onPress}
            activeOpacity={0.7}
          >
            <Text style={styles.ctaSecondaryText}>{ctaSecondary.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  icon: {
    marginBottom: spacing.lg,
  },

  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  description: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },

  ctaContainer: {
    gap: spacing.md,
    width: '100%',
  },

  ctaPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
  },

  ctaPrimaryText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
    textAlign: 'center',
  },

  ctaSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
  },

  ctaSecondaryText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    textAlign: 'center',
  },
});
