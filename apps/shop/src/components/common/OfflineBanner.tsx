/**
 * OfflineBanner Component — displays network status indicator at top of screen
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
} from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  if (isOnline && !isSlowConnection) {
    return null;
  }

  const message = isSlowConnection
    ? 'Slow connection — some features may not work properly'
    : 'No internet connection';

  const backgroundColor = isSlowConnection ? colors.warning : colors.error;

  return (
    <View style={[styles.banner, { backgroundColor }]}>
      <MaterialCommunityIcons
        name={isSlowConnection ? 'wifi-strength-2' : 'wifi-off'}
        size={16}
        color={colors.white}
        style={styles.icon}
      />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },

  icon: {
    marginRight: spacing.xs,
  },

  text: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
    textAlign: 'center',
  },
});
