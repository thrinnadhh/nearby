/**
 * ProgressBar Component — Shows current registration step (1/5, 2/5, etc.)
 * Visual indicator with step number and progress line
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme';

interface Props {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: Props) {
  const progressPercentage = useMemo(
    () => (currentStep / totalSteps) * 100,
    [currentStep, totalSteps]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>
          Step {currentStep} of {totalSteps}
        </Text>
        <Text style={styles.percentage}>{Math.round(progressPercentage)}%</Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(progressPercentage, 5)}%`,
            },
          ]}
        />
      </View>

      {/* Step indicators */}
      <View style={styles.stepsContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <View
              key={stepNumber}
              style={[
                styles.stepDot,
                isCompleted && styles.stepDotCompleted,
                isCurrent && styles.stepDotCurrent,
              ]}
            >
              {isCompleted && (
                <Text style={styles.stepDotCheckmark}>✓</Text>
              )}
              {isCurrent && (
                <Text style={styles.stepDotNumber}>{stepNumber}</Text>
              )}
              {!isCompleted && !isCurrent && (
                <Text style={styles.stepDotNumber}>{stepNumber}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  label: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },

  percentage: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },

  progressBarContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },

  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stepDot: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  stepDotCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },

  stepDotCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  stepDotNumber: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },

  stepDotCheckmark: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
  },
});
