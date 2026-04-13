import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import type { ShopCategory } from '@/types';

export const CATEGORY_LABELS: Record<ShopCategory, string> = {
  kirana: '🛒 Kirana',
  vegetables: '🥦 Vegetables',
  pharmacy: '💊 Pharmacy',
  restaurant: '🍱 Restaurant',
  pet_store: '🐾 Pet Store',
  mobile: '📱 Mobile',
  furniture: '🛋 Furniture',
  other: '📦 Other',
};

interface CategoryChipProps {
  category: ShopCategory;
  selected: boolean;
  onPress: (category: ShopCategory) => void;
}

export function CategoryChip({ category, selected, onPress }: CategoryChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onPress(category)}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {CATEGORY_LABELS[category]}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
});
