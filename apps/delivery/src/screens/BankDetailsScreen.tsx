/**
 * BankDetailsScreen — Enter bank account details (Task 13.7)
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRegistration } from '@/hooks/useRegistration';
import logger from '@/utils/logger';

interface BankDetailsScreenProps {
  onNext: (bankDetails: { accountNumber: string; ifscCode: string; accountName: string }) => void;
  onBack?: () => void;
}

export function BankDetailsScreen({ onNext, onBack }: BankDetailsScreenProps) {
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const { isLoading, error } = useRegistration();

  const handleContinue = () => {
    if (isValid()) {
      logger.info('Proceeding with bank details', {
        accountNumber: accountNumber.slice(-4),
        ifscCode,
      });
      onNext({
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        accountName,
      });
    }
  };

  const isValid = (): boolean => {
    // Basic validation: account number 9-18 digits, IFSC 11 chars, name not empty
    const accountValid = /^\d{9,18}$/.test(accountNumber);
    const ifscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase());
    const nameValid = accountName.trim().length >= 3;

    return accountValid && ifscValid && nameValid;
  };

  return (
    <ScrollView style={styles.container}>
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
            value={accountNumber}
            onChangeText={setAccountName}
            editable={!isLoading}
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
            editable={!isLoading}
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
            editable={!isLoading}
            testID="ifsc-input"
          />
          <Text style={styles.fieldHint}>11 characters (e.g., SBIN0001234)</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          ℹ️ Your bank details are encrypted and only used for weekly payouts
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, !isValid() || isLoading ? styles.buttonDisabled : styles.buttonEnabled]}
          onPress={handleContinue}
          disabled={!isValid() || isLoading}
          testID="continue-button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>

        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            disabled={isLoading}
            testID="back-button"
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    color: '#333',
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: '#999',
  },
  infoContainer: {
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    fontSize: 12,
    color: '#006699',
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonEnabled: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    color: '#ff3333',
    marginBottom: 12,
    fontSize: 12,
    textAlign: 'center',
  },
});
