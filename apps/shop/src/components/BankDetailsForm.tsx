/**
 * BankDetailsForm component
 * Form for bank account details (account number, IFSC, account name)
 */

import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface BankDetailsFormProps {
  accountNumber: string;
  ifsc: string;
  accountName: string;
  onAccountNumberChange: (value: string) => void;
  onIfscChange: (value: string) => void;
  onAccountNameChange: (value: string) => void;
}

export function BankDetailsForm({
  accountNumber,
  ifsc,
  accountName,
  onAccountNumberChange,
  onIfscChange,
  onAccountNameChange,
}: BankDetailsFormProps) {
  return (
    <View>
      {/* Account Number */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Account Number</Text>
        <View style={styles.inputWrapper}>
          <MaterialIcons name="account-balance-wallet" size={18} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="9-18 digits"
            placeholderTextColor="#999"
            value={accountNumber}
            onChangeText={onAccountNumberChange}
            keyboardType="numeric"
            maxLength={18}
            testID="account-number-input"
          />
        </View>
        <Text style={styles.helperText}>{accountNumber.length} / 18</Text>
      </View>

      {/* IFSC Code */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>IFSC Code</Text>
        <View style={styles.inputWrapper}>
          <MaterialIcons name="bank" size={18} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="11 characters (e.g., SBIN0000001)"
            placeholderTextColor="#999"
            value={ifsc}
            onChangeText={(v) => onIfscChange(v.toUpperCase())}
            maxLength={11}
            testID="ifsc-input"
          />
        </View>
        <Text style={styles.helperText}>{ifsc.length} / 11</Text>
      </View>

      {/* Account Holder Name */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Account Holder Name</Text>
        <View style={styles.inputWrapper}>
          <MaterialIcons name="person" size={18} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Shop or owner name"
            placeholderTextColor="#999"
            value={accountName}
            onChangeText={onAccountNameChange}
            maxLength={50}
            testID="account-name-input"
          />
        </View>
        <Text style={styles.helperText}>{accountName.length} / 50</Text>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <MaterialIcons name="info" size={16} color="#1976D2" />
        <Text style={styles.infoText}>
          These details are used for settlement transfers. Ensure accuracy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  helperText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#1565C0',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
