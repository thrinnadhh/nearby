/**
 * Edit profile screen — allows partner to update profile information
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { usePartnerStore } from '@/store/partner';
import { updateBankDetails } from '@/services/partner';
import { AppErrorClass } from '@/types/common';
import logger from '@/utils/logger';

interface EditProfileScreenProps {
  partnerId: string;
  onSuccess: () => void;
}

export function EditProfileScreen({
  partnerId,
  onSuccess,
}: EditProfileScreenProps): React.ReactElement {
  const profile = usePartnerStore((state) => state.profile);
  const { setProfile, setLoading, setError } = usePartnerStore();

  const [bankAccountName, setBankAccountName] = useState(
    profile?.bankAccountName || ''
  );
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIFSC, setBankIFSC] = useState(profile?.bankIFSC || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const validateForm = (): boolean => {
    setUpdateError('');

    if (!bankAccountName.trim()) {
      setUpdateError('Account holder name is required');
      return false;
    }

    if (bankAccountName.trim().length < 3) {
      setUpdateError('Account holder name must be at least 3 characters');
      return false;
    }

    if (!bankAccountNumber.trim()) {
      setUpdateError('Bank account number is required');
      return false;
    }

    if (bankAccountNumber.length < 9 || bankAccountNumber.length > 18) {
      setUpdateError('Bank account number must be 9-18 digits');
      return false;
    }

    if (!/^\d+$/.test(bankAccountNumber)) {
      setUpdateError('Bank account number must contain only digits');
      return false;
    }

    if (!bankIFSC.trim()) {
      setUpdateError('IFSC code is required');
      return false;
    }

    if (bankIFSC.length !== 11) {
      setUpdateError('IFSC code must be 11 characters');
      return false;
    }

    return true;
  };

  const handleUpdateBankDetails = async () => {
    if (!validateForm()) {
      return;
    }

    setIsUpdating(true);
    setLoading(true);
    setError(null);

    try {
      const updatedProfile = await updateBankDetails(partnerId, {
        bankAccountNumber,
        bankIFSC: bankIFSC.toUpperCase(),
        bankAccountName,
      });

      logger.info('Bank details updated successfully', { partnerId });

      if (profile) {
        setProfile({
          ...profile,
          bankAccountName,
          bankIFSC: bankIFSC.toUpperCase(),
        });
      }

      Alert.alert('Success', 'Bank details updated successfully', [
        {
          text: 'OK',
          onPress: onSuccess,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof AppErrorClass
          ? err.message
          : 'Failed to update bank details';

      logger.error('Bank details update failed', {
        partnerId,
        error: message,
      });

      setUpdateError(message);
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setIsUpdating(false);
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        scrollEnabled
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Edit Bank Details</Text>
          <Text style={styles.subtitle}>
            Update your bank information for settlements
          </Text>
        </View>

        <View style={styles.form}>
          {/* Account Holder Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Account Holder Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter account holder name"
              placeholderTextColor="#9ca3af"
              value={bankAccountName}
              onChangeText={setBankAccountName}
              editable={!isUpdating}
              accessible
              accessibilityLabel="Account holder name"
            />
          </View>

          {/* Account Number */}
          <View style={styles.field}>
            <Text style={styles.label}>Bank Account Number</Text>
            <TextInput
              style={styles.input}
              placeholder="9 to 18 digits"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={bankAccountNumber}
              onChangeText={(text) =>
                setBankAccountNumber(text.replace(/\D/g, ''))
              }
              editable={!isUpdating}
              accessible
              accessibilityLabel="Bank account number"
            />
          </View>

          {/* IFSC Code */}
          <View style={styles.field}>
            <Text style={styles.label}>IFSC Code</Text>
            <TextInput
              style={styles.input}
              placeholder="11 characters (e.g., HDFC0000001)"
              placeholderTextColor="#9ca3af"
              value={bankIFSC}
              onChangeText={(text) => setBankIFSC(text.toUpperCase())}
              maxLength={11}
              editable={!isUpdating}
              accessible
              accessibilityLabel="IFSC code"
            />
          </View>

          {/* Error Message */}
          {updateError && (
            <Text
              style={styles.errorText}
              accessible
              accessibilityRole="alert"
            >
              {updateError}
            </Text>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Ensure your bank details are correct. This information is used for
              weekly settlements.
            </Text>
          </View>

          {/* Update Button */}
          <Pressable
            onPress={handleUpdateBankDetails}
            disabled={isUpdating}
            style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
            accessible
            accessibilityLabel="Update bank details"
            accessibilityRole="button"
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.updateButtonText}>Update Bank Details</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  form: {
    paddingHorizontal: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  updateButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});
