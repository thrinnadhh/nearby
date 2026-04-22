/**
 * Bank details setup screen — part of onboarding flow
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

interface BankDetailsScreenProps {
  partnerId: string;
  onComplete: () => void;
}

export function BankDetailsScreen({
  partnerId,
  onComplete,
}: BankDetailsScreenProps): React.ReactElement {
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIFSC, setBankIFSC] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { setProfile, setLoading, setError: setStoreError } = usePartnerStore();

  const validateForm = (): boolean => {
    setError('');

    if (!bankAccountName.trim()) {
      setError('Account holder name is required');
      return false;
    }

    if (bankAccountName.trim().length < 3) {
      setError('Account holder name must be at least 3 characters');
      return false;
    }

    if (!bankAccountNumber.trim()) {
      setError('Bank account number is required');
      return false;
    }

    if (bankAccountNumber.length < 9 || bankAccountNumber.length > 18) {
      setError('Bank account number must be 9-18 digits');
      return false;
    }

    if (!/^\d+$/.test(bankAccountNumber)) {
      setError('Bank account number must contain only digits');
      return false;
    }

    if (!bankIFSC.trim()) {
      setError('IFSC code is required');
      return false;
    }

    if (bankIFSC.length !== 11) {
      setError('IFSC code must be 11 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    setStoreError(null);

    try {
      await updateBankDetails(partnerId, {
        bankAccountNumber,
        bankIFSC: bankIFSC.toUpperCase(),
        bankAccountName,
      });

      logger.info('Bank details submitted successfully', { partnerId });

      // Fetch updated profile
      const profile = usePartnerStore.getState().profile;
      if (profile) {
        setProfile({
          ...profile,
          bankAccountName,
          bankIFSC: bankIFSC.toUpperCase(),
        });
      }

      onComplete();
    } catch (err) {
      const message =
        err instanceof AppErrorClass
          ? err.message
          : 'Failed to submit bank details';

      logger.error('Bank details submission failed', {
        partnerId,
        error: message,
      });

      setError(message);
      setStoreError(message);
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const isFormValid =
    bankAccountName.trim().length >= 3 &&
    bankAccountNumber.length >= 9 &&
    bankAccountNumber.length <= 18 &&
    /^\d+$/.test(bankAccountNumber) &&
    bankIFSC.length === 11;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        scrollEnabled
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Step 4 of 5</Text>
          </View>
          <Text style={styles.title}>Bank Details</Text>
          <Text style={styles.subtitle}>
            Provide your bank information for weekly settlements
          </Text>
        </View>

        <View style={styles.form}>
          {/* Account Holder Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Account Holder Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
              value={bankAccountName}
              onChangeText={setBankAccountName}
              editable={!isSubmitting}
              accessible
              accessibilityLabel="Account holder name"
              accessibilityHint="Enter the name on your bank account"
            />
          </View>

          {/* Account Number */}
          <View style={styles.field}>
            <Text style={styles.label}>Bank Account Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="9 to 18 digits"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={bankAccountNumber}
              onChangeText={(text) =>
                setBankAccountNumber(text.replace(/\D/g, ''))
              }
              editable={!isSubmitting}
              accessible
              accessibilityLabel="Bank account number"
              accessibilityHint="Enter your bank account number"
            />
          </View>

          {/* IFSC Code */}
          <View style={styles.field}>
            <Text style={styles.label}>IFSC Code *</Text>
            <TextInput
              style={styles.input}
              placeholder="11 characters (e.g., HDFC0000001)"
              placeholderTextColor="#9ca3af"
              value={bankIFSC}
              onChangeText={(text) => setBankIFSC(text.toUpperCase())}
              maxLength={11}
              editable={!isSubmitting}
              accessible
              accessibilityLabel="IFSC code"
              accessibilityHint="Enter your bank's IFSC code"
            />
          </View>

          {/* Error Message */}
          {error && (
            <Text
              style={styles.errorText}
              accessible
              accessibilityRole="alert"
            >
              {error}
            </Text>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Important</Text>
            <Text style={styles.infoText}>
              - Ensure the account holder name matches your bank records
              {'\n'}- Enter your 9-18 digit account number
              {'\n'}- IFSC code is 11 characters (usually from passbook)
              {'\n'}- Verify details carefully to avoid settlement delays
            </Text>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            style={[
              styles.submitButton,
              (!isFormValid || isSubmitting) && styles.submitButtonDisabled,
            ]}
            accessible
            accessibilityLabel="Continue to review"
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Continue</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  stepIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 12,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});
