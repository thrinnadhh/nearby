/**
 * SettingsScreen - Shop Settings Form
 * Manages hours, delivery radius, bank details, and description
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useShopSettings } from '@/hooks/useShopSettings';
import { HoursEditor } from '@/components/HoursEditor';
import { BankDetailsForm } from '@/components/BankDetailsForm';
import logger from '@/utils/logger';

export default function SettingsScreen() {
  const { settings, loading, saving, error, updateSettings } = useShopSettings();

  // Form state
  const [description, setDescription] = useState(settings?.description || '');
  const [radius, setRadius] = useState(settings?.deliveryRadiusKm || 3);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: settings?.bankAccountNumber || '',
    ifsc: settings?.bankIfsc || '',
    accountName: settings?.bankAccountName || '',
  });

  const handleSave = useCallback(async () => {
    try {
      await updateSettings({
        description,
        deliveryRadiusKm: radius,
        bankAccountNumber: bankDetails.accountNumber,
        bankIfsc: bankDetails.ifsc,
        bankAccountName: bankDetails.accountName,
      });

      Alert.alert('Success', 'Settings saved successfully');
      logger.info('SettingsScreen: Settings saved');
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  }, [description, radius, bankDetails, updateSettings]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error message */}
        {error && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={20} color="#E53935" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Delivery Radius Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="location-on" size={24} color="#1976D2" />
            <Text style={styles.sectionTitle}>Delivery Radius</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.radiusValue}>{radius} km</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={0.5}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor="#1976D2"
              maximumTrackTintColor="#DDD"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1 km</Text>
              <Text style={styles.sliderLabel}>10 km</Text>
            </View>
          </View>
        </View>

        {/* Business Hours Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="schedule" size={24} color="#1976D2" />
            <Text style={styles.sectionTitle}>Business Hours</Text>
          </View>
          <HoursEditor hours={settings?.hours || []} onChange={() => {}} />
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="description" size={24} color="#1976D2" />
            <Text style={styles.sectionTitle}>Shop Description</Text>
          </View>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Enter shop description (10-500 characters)"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            testID="description-input"
          />
          <Text style={styles.charCount}>
            {description.length} / 500
          </Text>
        </View>

        {/* Bank Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="account-balance" size={24} color="#1976D2" />
            <Text style={styles.sectionTitle}>Bank Details</Text>
          </View>
          <BankDetailsForm
            accountNumber={bankDetails.accountNumber}
            ifsc={bankDetails.ifsc}
            accountName={bankDetails.accountName}
            onAccountNumberChange={(v) =>
              setBankDetails({ ...bankDetails, accountNumber: v })
            }
            onIfscChange={(v) =>
              setBankDetails({ ...bankDetails, ifsc: v })
            }
            onAccountNameChange={(v) =>
              setBankDetails({ ...bankDetails, accountName: v })
            }
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <MaterialIcons name="info" size={20} color="#1976D2" />
          <Text style={styles.infoText}>
            Keep your details updated to ensure smooth operations and timely settlements.
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          testID="save-settings-button"
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  sliderContainer: {
    paddingVertical: 8,
  },
  radiusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 12,
  },
  slider: {
    height: 40,
    marginVertical: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  infoSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 80,
  },
  infoText: {
    fontSize: 12,
    color: '#1565C0',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveButton: {
    backgroundColor: '#1976D2',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
});
