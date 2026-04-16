import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';

/**
 * PartnerInfoCard Component (Task 10.2)
 * 
 * Displays delivery partner information (name, masked phone, rating, vehicle)
 */

interface PartnerData {
  name: string;
  rating: number;
  deliveries_count: number;
  vehicle?: string;
  vehicle_number?: string;
}

interface PartnerInfoCardProps {
  partner?: PartnerData;
  onContact?: () => void;
}

export function PartnerInfoCard({ partner, onContact }: PartnerInfoCardProps) {
  // Handle missing partner data gracefully
  if (!partner) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Delivery partner information will appear here</Text>
      </View>
    );
  }

  const maskedPhone = '••••••••••'; // Phone is sensitive data, shown as masked

  return (
    <View style={styles.container}>
      {/* Partner header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{partner.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.rating}>{partner.rating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({partner.deliveries_count} deliveries)</Text>
          </View>
        </View>
      </View>

      {/* Vehicle info */}
      <View style={styles.section}>
        <View style={styles.infoItem}>
          <Ionicons name="car" size={16} color={colors.textSecondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{partner.vehicle || 'Bike'}</Text>
          </View>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="help-circle" size={16} color={colors.textSecondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Vehicle No.</Text>
            <Text style={styles.infoValue}>{partner.vehicle_number || maskedPhone}</Text>
          </View>
        </View>
      </View>

      {/* Contact button */}
      {onContact && (
        <TouchableOpacity style={styles.contactButton} onPress={onContact}>
          <Ionicons name="call" size={16} color={colors.primary} />
          <Text style={styles.contactButtonText}>Contact Delivery Partner</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  info: {
    flex: 1,
  },

  name: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },

  rating: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fontFamily.semiBold,
  },

  placeholderText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },

  ratingCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  section: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },

  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    fontFamily: fontFamily.semiBold,
  },

  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  contactButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
});
