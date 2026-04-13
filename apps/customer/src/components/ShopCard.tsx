import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import type { Shop } from '@/types';

// ─── Trust badge ─────────────────────────────────────────────────────────────

function trustBadge(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Trusted', color: colors.success };
  if (score >= 60) return { label: 'Good', color: colors.primary };
  if (score >= 40) return { label: 'New', color: colors.warning };
  return { label: 'Review', color: colors.error };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ShopCardProps {
  shop: Shop;
  onPress: (shop: Shop) => void;
}

export function ShopCard({ shop, onPress }: ShopCardProps) {
  const badge = trustBadge(shop.trust_score);
  const distanceLabel =
    shop.distance < 1
      ? `${Math.round(shop.distance * 1000)} m`
      : `${shop.distance.toFixed(1)} km`;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(shop)}
      style={styles.card}
    >
      {/* Thumbnail */}
      <View style={styles.imageContainer}>
        {shop.thumbnail_url ? (
          <Image
            source={{ uri: shop.thumbnail_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>🏪</Text>
          </View>
        )}
        {/* Open / closed pill */}
        <View
          style={[
            styles.statusPill,
            { backgroundColor: shop.is_open ? colors.success : colors.error },
          ]}
        >
          <Text style={styles.statusText}>
            {shop.is_open ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {shop.name}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {shop.address}
        </Text>

        <View style={styles.meta}>
          {/* Rating */}
          <Text style={styles.rating}>⭐ {shop.rating.toFixed(1)}</Text>
          {/* Distance */}
          <Text style={styles.dot}>·</Text>
          <Text style={styles.distance}>{distanceLabel}</Text>
          {/* Trust badge */}
          <View style={[styles.badge, { borderColor: badge.color }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  imageContainer: {
    height: 140,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 48 },
  statusPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    color: colors.white,
  },
  info: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  address: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rating: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
  },
  dot: {
    color: colors.textDisabled,
  },
  distance: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  badge: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
  },
});
