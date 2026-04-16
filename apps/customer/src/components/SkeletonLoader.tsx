/**
 * SkeletonLoader Component
 * Reusable skeleton placeholder during loading states
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
} from '@/constants/theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  width = '100%',
  height = 16,
  borderRadius: radius = borderRadius.md,
  style,
}: SkeletonLoaderProps) {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * SkeletonScreen — full-screen loading placeholder
 */
export function SkeletonScreen() {
  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenContent}>
        {/* Header skeleton */}
        <SkeletonLoader width="80%" height={24} style={{ marginBottom: spacing.lg }} />

        {/* Content lines */}
        {[1, 2, 3, 4].map((i) => (
          <SkeletonLoader
            key={i}
            width="100%"
            height={12}
            style={{ marginBottom: spacing.md }}
          />
        ))}

        {/* Large block */}
        <SkeletonLoader
          width="100%"
          height={120}
          style={{ marginTop: spacing.lg }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.border,
  },

  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },

  screenContent: {
    marginTop: spacing.lg,
  },
});
