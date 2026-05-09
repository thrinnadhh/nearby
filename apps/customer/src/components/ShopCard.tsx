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

function trustBadge(score: number): { label: string; bg: string; text: string } {
  if (score >= 80) return { label: '✓ Trusted', bg: '#E8F6EF', text: colors.success };
  if (score >= 60) return { label: '✓ Good', bg: colors.primarySoft, text: colors.primary };
  if (score >= 40) return { label: 'New', bg: '#FEF3C7', text: '#92400E' };
  return { label: 'Review', bg: '#FEE2E2', text: colors.error };
}

// ─── Painted shop cover (no photo needed) ────────────────────────────────────
// Generates a warm gradient rectangle with shop initials — NearBy market style

const COVER_COLORS = [
  ['#F4A62A', '#E35D23'], // marigold → terracotta
  ['#E35D23', '#B9431B'], // terracotta gradient
  ['#2F8F5E', '#1A5C3C'], // fresh green
  ['#8B5CF6', '#6D28D9'], // violet
  ['#0891B2', '#0E7490'], // teal
];

function coverColors(name: string): string[] {
  const idx = (name.charCodeAt(0) || 0) % COVER_COLORS.length;
  return COVER_COLORS[idx];
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
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
  const [c1, c2] = coverColors(shop.name);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(shop)}
      style={styles.card}
    >
      {/* Cover — photo or painted placeholder */}
      <View style={[styles.imageContainer, { backgroundColor: c1 }]}>
        {shop.thumbnail_url ? (
          <Image
            source={{ uri: shop.thumbnail_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: c1 }]}>
            {/* Diagonal stripe accent */}
            <View style={[styles.stripe, { backgroundColor: c2 }]} />
            <Text style={styles.placeholderInitials}>{initials(shop.name)}</Text>
          </View>
        )}

        {/* Open/closed dot badge */}
        <View style={[styles.openBadge, { backgroundColor: shop.is_open ? colors.success : '#6B7280' }]}>
          <View style={styles.openDot} />
          <Text style={styles.openText}>{shop.is_open ? 'Open' : 'Closed'}</Text>
        </View>
      </View>

      {/* Info row */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{shop.name}</Text>
          {/* Trust pill */}
          <View style={[styles.trustPill, { backgroundColor: badge.bg }]}>
            <Text style={[styles.trustText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <Text style={styles.address} numberOfLines={1}>{shop.address}</Text>

        <View style={styles.meta}>
          <Text style={styles.starIcon}>★</Text>
          <Text style={styles.rating}>{shop.rating.toFixed(1)}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.distance}>{distanceLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#261A14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.line,
  },
  imageContainer: {
    height: 148,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 200,
    opacity: 0.35,
    transform: [{ rotate: '30deg' }],
  },
  placeholderInitials: {
    fontSize: 40,
    fontFamily: fontFamily.display,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2,
  },
  openBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  openText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    color: '#FFFFFF',
  },
  info: {
    padding: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 2,
  },
  name: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  trustPill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trustText: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
  },
  address: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  starIcon: {
    fontSize: 13,
    color: colors.accent,
  },
  rating: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textDisabled,
  },
  distance: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
});

