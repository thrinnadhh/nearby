/**
 * ProgressIndicator Component — circular progress display
 * Shows percentage with animated ring
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';

interface ProgressIndicatorProps {
  percentage: number; // 0-100
  label?: string;
  size?: number;
}

export function ProgressIndicator({
  percentage,
  label = 'Progress',
  size = 120,
}: ProgressIndicatorProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [percentage, animatedValue]);

  const displayPercentage = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // Create SVG-like circle animation
  const circumference = 2 * Math.PI * (size / 2 - 6);
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.circleContainer, { width: size, height: size }]}>
        {/* Background circle (static) */}
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 6,
              borderColor: colors.border,
            },
          ]}
        />

        {/* Animated progress circle */}
        <Animated.View
          style={[
            styles.progressCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 6,
              borderColor: colors.primary,
              opacity: animatedValue.interpolate({
                inputRange: [0, 100],
                outputRange: [0.3, 1],
              }),
            },
          ]}
        />

        {/* Center content */}
        <View style={[styles.centerContent, { width: size, height: size }]}>
          <Animated.Text
            style={[
              styles.percentageText,
              {
                fontSize: size / 2.5,
              },
            ]}
          >
            {percentage}%
          </Animated.Text>
          <Text style={styles.labelText}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  progressCircle: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
    fontWeight: '700',
  },
  labelText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
