/**
 * CategoryPicker component
 * Dropdown-style picker for product categories
 * Displays 12 category options with clean selection UI
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';
import { PRODUCT_CATEGORIES, CATEGORY_LABELS } from '@/utils/productValidation';
import logger from '@/utils/logger';

interface CategoryPickerProps {
  value: string;
  onValueChange: (category: string) => void;
  error?: string;
  testID?: string;
}

/**
 * CategoryPicker — select product category from dropdown
 */
export function CategoryPicker({
  value,
  onValueChange,
  error,
  testID,
}: CategoryPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectCategory = (category: string) => {
    onValueChange(category);
    setModalVisible(false);
    logger.info('Category selected', { category });
  };

  const selectedLabel = value ? CATEGORY_LABELS[value] : 'Select category';

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>Category *</Text>

      {/* Dropdown trigger */}
      <TouchableOpacity
        style={[styles.dropdownButton, error && styles.dropdownButtonError]}
        onPress={() => {
          setModalVisible(true);
          logger.info('Category picker opened');
        }}
        testID={testID || 'category-picker-button'}
      >
        <Text
          style={[
            styles.dropdownButtonText,
            !value && styles.dropdownButtonTextPlaceholder,
          ]}
        >
          {selectedLabel}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Error message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        {/* Overlay */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          testID="category-picker-overlay"
        >
          {/* Dropdown menu */}
          <View style={styles.menuContainer}>
            <ScrollView
              showsVerticalScrollIndicator={true}
              scrollEnabled={PRODUCT_CATEGORIES.length > 6}
              testID="category-picker-list"
            >
              {PRODUCT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.menuItem,
                    value === category && styles.menuItemSelected,
                  ]}
                  onPress={() => handleSelectCategory(category)}
                  testID={`category-option-${category}`}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      value === category && styles.menuItemTextSelected,
                    ]}
                  >
                    {CATEGORY_LABELS[category]}
                  </Text>
                  {value === category && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  dropdownButtonError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
  },
  dropdownButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    flex: 1,
  },
  dropdownButtonTextPlaceholder: {
    color: colors.textTertiary,
  },
  errorText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginTop: spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  menuContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    maxHeight: 400,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  menuItemText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    flex: 1,
  },
  menuItemTextSelected: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
});
