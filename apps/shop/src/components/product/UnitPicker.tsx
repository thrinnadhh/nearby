/**
 * UnitPicker component
 * Dropdown-style picker for product units
 * Displays 8 unit options with clean selection UI
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  borderRadius,
} from '@/constants/theme';
import { PRODUCT_UNITS, UNIT_LABELS } from '@/utils/productValidation';
import logger from '@/utils/logger';

interface UnitPickerProps {
  value: string;
  onValueChange: (unit: string) => void;
  error?: string;
  testID?: string;
}

/**
 * UnitPicker — select product unit from dropdown
 */
export function UnitPicker({
  value,
  onValueChange,
  error,
  testID,
}: UnitPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectUnit = (unit: string) => {
    onValueChange(unit);
    setModalVisible(false);
    logger.info('Unit selected', { unit });
  };

  const selectedLabel = value ? UNIT_LABELS[value] : 'Select unit';

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>Unit *</Text>

      {/* Dropdown trigger */}
      <TouchableOpacity
        style={[styles.dropdownButton, error && styles.dropdownButtonError]}
        onPress={() => {
          setModalVisible(true);
          logger.info('Unit picker opened');
        }}
        testID={testID || 'unit-picker-button'}
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
          testID="unit-picker-overlay"
        >
          {/* Dropdown menu */}
          <View style={styles.menuContainer}>
            <ScrollView
              showsVerticalScrollIndicator={true}
              scrollEnabled={PRODUCT_UNITS.length > 6}
              testID="unit-picker-list"
            >
              {PRODUCT_UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.menuItem,
                    value === unit && styles.menuItemSelected,
                  ]}
                  onPress={() => handleSelectUnit(unit)}
                  testID={`unit-option-${unit}`}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      value === unit && styles.menuItemTextSelected,
                    ]}
                  >
                    {UNIT_LABELS[unit]}
                  </Text>
                  {value === unit && (
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
    maxHeight: 300,
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
