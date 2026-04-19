/**
 * HolidayModeModal component
 * Date range picker for setting shop holiday mode
 * Uses react-native-date-picker
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { MaterialIcons } from '@expo/vector-icons';

interface HolidayModeModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  testID?: string;
}

export function HolidayModeModal({
  visible,
  onClose,
  onConfirm,
  loading = false,
  error = null,
  testID,
}: HolidayModeModalProps) {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().getTime() + 86400000) // +1 day
  );
  const [showingStartPicker, setShowingStartPicker] = useState(false);
  const [showingEndPicker, setShowingEndPicker] = useState(false);

  const handleConfirm = async () => {
    // Validate dates
    if (endDate <= startDate) {
      Alert.alert(
        'Invalid Dates',
        'End date must be after start date',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      await onConfirm(startStr, endStr);
      onClose();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      testID={testID}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Set Holiday Dates</Text>
            <View style={{ width: 28 }} /> {/* Spacer */}
          </View>

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#E53935" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Description */}
          <Text style={styles.description}>
            Select the dates when your shop will be closed for holidays. You can re-open anytime.
          </Text>

          {/* Start date section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Holiday Start Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowingStartPicker(true)}
              disabled={loading}
              testID="holiday-start-button"
            >
              <MaterialIcons name="calendar-today" size={20} color="#1976D2" />
              <Text style={styles.dateButtonText}>
                {startDate.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {showingStartPicker && (
            <View style={styles.pickerContainer}>
              <DatePicker
                date={startDate}
                onDateChange={setStartDate}
                mode="date"
                minimumDate={new Date()}
              />
            </View>
          )}

          {/* End date section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Holiday End Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowingEndPicker(true)}
              disabled={loading}
              testID="holiday-end-button"
            >
              <MaterialIcons name="calendar-today" size={20} color="#1976D2" />
              <Text style={styles.dateButtonText}>
                {endDate.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {showingEndPicker && (
            <View style={styles.pickerContainer}>
              <DatePicker
                date={endDate}
                onDateChange={setEndDate}
                mode="date"
                minimumDate={new Date(startDate.getTime() + 86400000)}
              />
            </View>
          )}

          {/* Duration display */}
          <View style={styles.durationContainer}>
            <MaterialIcons name="info" size={20} color="#1976D2" />
            <Text style={styles.durationText}>
              Holiday duration: {Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)} days
            </Text>
          </View>
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={loading}
            testID="holiday-cancel-button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.confirmButton, loading && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={loading}
            testID="holiday-confirm-button"
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.confirmButtonText}>Set Holiday</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#E53935',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1976D2',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  durationContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  durationText: {
    fontSize: 13,
    color: '#1565C0',
    marginLeft: 8,
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#1976D2',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
