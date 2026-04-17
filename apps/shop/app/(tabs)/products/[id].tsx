/**
 * Product Detail Screen (Task 12.1) — Display product details, edit/delete options
 * Stub implementation - full implementation in follow-up sprint
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
} from '@/constants/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import logger from '@/utils/logger';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  logger.info('ProductDetailScreen opened', { productId: id });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.placeholderBox}>
          <MaterialCommunityIcons
            name="package-outline"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={styles.placeholderTitle}>Coming Soon</Text>
          <Text style={styles.placeholderText}>
            Full product detail screen will be implemented in Sprint 12.2
          </Text>
          <Text style={styles.productIdText}>Product ID: {id}</Text>
        </View>

        {/* Features coming */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Features in Sprint 12.2:</Text>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={20}
              color={colors.success}
            />
            <Text style={styles.featureText}>Edit product details</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={20}
              color={colors.success}
            />
            <Text style={styles.featureText}>Manage images</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={20}
              color={colors.success}
            />
            <Text style={styles.featureText}>Update stock quantity</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={20}
              color={colors.success}
            />
            <Text style={styles.featureText}>Category and pricing</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <PrimaryButton
          label="Go Back"
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  placeholderBox: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  placeholderTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  productIdText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  featuresSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  featureText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    flex: 1,
  },
  actionsContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
