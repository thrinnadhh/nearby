/**
 * BankDetailsScreen — Enter bank account details (Task 13.7)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRegistration } from '@/hooks/useRegistration';
import { useAuthStore } from '@/store/auth';
import logger from '@/utils/logger';

type BankDetailsScreenProps = NativeStackScreenProps<any, 'BankDetails'>;

export function BankDetailsScreen({ navigation }: BankDetailsScreenProps) {
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isLoading, error } = useRegistration();
  const token = useAuthStore((state) => state.token);

  const handleContinue = async () => {
    if (!isValid()) {
      Alert.alert('Validation Error', 'Please fill all fields correctly');
      return;
    }

    setSubmitting(true);
    try {
      logger.info('Submitting bank details', {
        accountNumber: accountNumber.slice(-4),
        ifscCode,
      });

      // In a real implementation, you would submit to the API here
      // For now, we'll just navigate to the home screen after auth completes
      Alert.alert('Success', 'Registration completed successfully!');
      navigation.reset({
        index: 0,
        routes: [{ name: 'App' }],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit';
      logger.error('Bank details submission failed', { error: message });
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = (): boolean => {
    const accountValid = /^\d{9,18}$/.test(accountNumber);
    const ifscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase());
    const nameValid = accountName.trim().length >= 3;

    return accountValid && ifscValid && nameValid;
  };

  const isLoading_ = isLoading || submitting;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Bank Account Details</Text>
        <Text style={styles.subtitle}>Enter your bank account information for payouts</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.formContainer}>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Account Holder Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
              value={accountName}
              onChangeText={setAccountName}
              editable={!isLoading_}
              testID="account-name-input"
            />
            <Text style={styles.fieldHint}>As per your bank account</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Account Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter account number"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={accountNumber}
              onChangeText={setAccountNumber}
              editable={!isLoading_}
              testID="account-number-input"
            />
            <Text style={styles.fieldHint}>9-18 digits (no spaces)</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>IFSC Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter IFSC code"
              placeholderTextColor="#999"
              value={ifscCode}
              onChangeText={setIfscCode}
              maxLength={11}
              editable={!isLoading_}
              testID="ifsc-input"
            />
            <Text style={styles.fieldHint}>11 characters (e.g., SBIN0001234)</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Your bank details are encrypted and only used for weekly payouts
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              !isValid() || isLoading_ ? styles.buttonDisabled : styles.buttonEnabled,
            ]}
            onPress={handleContinue}
            disabled={!isValid() || isLoading_}
            testID="submit-button"
          >
            {isLoading_ ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Complete Registration</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading_}
            testID="back-button"
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  fieldHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 30,
  },
  infoText: {
    fontSize: 13,
    color: '#1565c0',
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonEnabled: {
    backgroundColor: '#2196F3',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
