/**
 * CountdownTimer Component — displays countdown for 3-minute order acceptance window
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';
import { formatCountdown } from '@/utils/formatters';

interface Props {
  acceptanceDeadline: string; // ISO timestamp
  onExpire: () => void;
}

const TOTAL_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export function CountdownTimer({ acceptanceDeadline, onExpire }: Props) {
  const [remainingMs, setRemainingMs] = useState<number>(TOTAL_DURATION_MS);

  useEffect(() => {
    const deadline = new Date(acceptanceDeadline).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = deadline - now;

      if (remaining <= 0) {
        setRemainingMs(0);
        clearInterval(interval);
        onExpire();
      } else {
        setRemainingMs(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [acceptanceDeadline, onExpire]);

  const isUrgent = remainingMs < 60_000; // Less than 1 minute

  return (
    <View
      style={[
        styles.container,
        isUrgent && styles.urgentContainer,
      ]}
    >
      <MaterialCommunityIcons
        name="clock-outline"
        size={20}
        color={isUrgent ? colors.error : colors.warning}
      />
      <Text
        style={[
          styles.text,
          isUrgent && styles.urgentText,
        ]}
      >
        {formatCountdown(remainingMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF3CD',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  urgentContainer: {
    backgroundColor: '#FFE5E5',
  },

  text: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.warning,
  },

  urgentText: {
    color: colors.error,
  },
});
