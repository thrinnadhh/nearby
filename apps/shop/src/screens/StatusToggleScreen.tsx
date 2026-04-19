/**
 * StatusToggleScreen
 * Main screen for managing shop open/close status and holiday mode
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useShopStatus } from '@/hooks/useShopStatus';
import { HolidayModeModal } from '@/components/HolidayModeModal';
import logger from '@/utils/logger';

export default function StatusToggleScreen() {
  const {
    isOpen,
    isOnHoliday,
    holidayStartDate,
    holidayEndDate,
    toggling,
    settingHoliday,
    error,
    toggleShopStatus,
    setHolidayDates,
    clearHolidayMode,
  } = useShopStatus();

  const [showHolidayModal, setShowHolidayModal] = useState(false);

  const handleStatusToggle = async (value: boolean) => {
    logger.info('StatusToggleScreen: Status toggle triggered', { newValue: value });

    try {
      await toggleShopStatus();
    } catch (err) {
      Alert.alert('Error', 'Failed to update shop status. Please try again.');
    }
  };

  const handleSetHoliday = async (startDate: string, endDate: string) => {
    logger.info('StatusToggleScreen: Setting holiday dates', {
      startDate,
      endDate,
    });

    try {
      await setHolidayDates(startDate, endDate);
      Alert.alert(
        'Success',
        'Holiday dates set successfully. Your shop is now closed.'
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to set holiday dates. Please try again.');
    }
  };

  const handleClearHoliday = async () => {
    Alert.alert(
      'Confirm',
      'End holiday mode and reopen your shop?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Reopen',
          onPress: async () => {
            try {
              await clearHolidayMode();
              Alert.alert('Success', 'Your shop is now open for orders.');
            } catch (err) {
              Alert.alert(
                'Error',
                'Failed to clear holiday mode. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={20} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Open/Close section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name={isOpen ? 'storefront' : 'lock'}
              size={28}
              color={isOpen ? '#7CB342' : '#E53935'}
            />
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Shop Status</Text>
              <Text style={styles.sectionSubtitle}>
                {isOpen ? 'Currently accepting orders' : 'Currently closed'}
              </Text>
            </View>
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>
              {isOpen ? 'Open' : 'Closed'}
            </Text>
            <Switch
              value={isOpen}
              onValueChange={handleStatusToggle}
              disabled={toggling || isOnHoliday}
              testID="status-toggle"
              trackColor={{
                false: '#E0E0E0',
                true: '#81C784',
              }}
              thumbColor={isOpen ? '#7CB342' : '#999'}
            />
            {toggling && <ActivityIndicator size="small" color="#1976D2" />}
          </View>

          {isOnHoliday && (
            <Text style={styles.disabledNote}>
              ℹ️ Toggle disabled while shop is on holiday
            </Text>
          )}
        </View>

        {/* Holiday mode section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name={isOnHoliday ? 'event-busy' : 'event-available'}
              size={28}
              color={isOnHoliday ? '#FF9800' : '#999'}
            />
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Holiday Mode</Text>
              <Text style={styles.sectionSubtitle}>
                {isOnHoliday
                  ? `Until ${new Date(holidayEndDate || '').toLocaleDateString('en-IN')}`
                  : 'Set temporary closure dates'}
              </Text>
            </View>
          </View>

          {isOnHoliday ? (
            <View>
              <View style={styles.holidayInfo}>
                <MaterialIcons name="calendar-today" size={18} color="#FF9800" />
                <Text style={styles.holidayInfoText}>
                  Holiday: {new Date(holidayStartDate || '').toLocaleDateString('en-IN')} to{' '}
                  {new Date(holidayEndDate || '').toLocaleDateString('en-IN')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.endHolidayButton}
                onPress={handleClearHoliday}
                disabled={settingHoliday}
                testID="end-holiday-button"
              >
                {settingHoliday ? (
                  <ActivityIndicator color="#1976D2" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={20} color="#1976D2" />
                    <Text style={styles.endHolidayButtonText}>End Holiday</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.setHolidayButton}
              onPress={() => setShowHolidayModal(true)}
              disabled={settingHoliday}
              testID="set-holiday-button"
            >
              {settingHoliday ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <MaterialIcons name="add" size={20} color="#FFF" />
                  <Text style={styles.setHolidayButtonText}>Set Holiday Dates</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={20} color="#1976D2" />
          <Text style={styles.infoText}>
            While on holiday, customers cannot place orders. You can end holiday mode anytime to resume accepting orders.
          </Text>
        </View>
      </View>

      {/* Holiday mode modal */}
      <HolidayModeModal
        visible={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        onConfirm={handleSetHoliday}
        loading={settingHoliday}
        error={error}
        testID="holiday-modal"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#E53935',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  disabledNote: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 12,
    fontStyle: 'italic',
  },
  holidayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  holidayInfoText: {
    fontSize: 13,
    color: '#FF8F00',
    marginLeft: 8,
    fontWeight: '500',
  },
  setHolidayButton: {
    flexDirection: 'row',
    backgroundColor: '#1976D2',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setHolidayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  endHolidayButton: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  endHolidayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 12,
    color: '#1565C0',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});
