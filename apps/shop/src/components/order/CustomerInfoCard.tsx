/**
 * CustomerInfoCard Component — displays customer name, phone, and delivery address
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
  shadows,
} from '@/constants/theme';

interface Props {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
}

export function CustomerInfoCard({
  customerName,
  customerPhone,
  deliveryAddress,
}: Props) {
  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.section}>
        <MaterialCommunityIcons
          name="account-circle"
          size={32}
          color={colors.primary}
          style={styles.icon}
        />
        <View style={styles.content}>
          <Text style={styles.label}>Customer Name</Text>
          <Text style={styles.value}>{customerName}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <MaterialCommunityIcons
          name="phone"
          size={24}
          color={colors.primary}
          style={styles.icon}
        />
        <View style={styles.content}>
          <Text style={styles.label}>Phone Number</Text>
          <Text style={styles.value}>{customerPhone}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <MaterialCommunityIcons
          name="map-marker"
          size={24}
          color={colors.primary}
          style={styles.icon}
        />
        <View style={styles.content}>
          <Text style={styles.label}>Delivery Address</Text>
          <Text style={styles.value} numberOfLines={3}>
            {deliveryAddress}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
  },

  section: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  icon: {
    marginTop: spacing.xs,
  },

  content: {
    flex: 1,
  },

  label: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  value: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});
