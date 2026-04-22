/**
 * Login screen — phone number entry for OTP flow
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuthStore } from '@/store/auth';
import { requestOTP } from '@/services/auth';
import { AppErrorClass } from '@/types/common';
import logger from '@/utils/logger';

interface LoginScreenProps {
  onPhoneSubmitted: (phone: string) => void;
}

export function LoginScreen({
  onPhoneSubmitted,
}: LoginScreenProps): React.ReactElement {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setPhone(cleaned);
      setError('');
    }
  };

  const validatePhone = (): boolean => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validatePhone()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await requestOTP({ phone });
      logger.info('OTP request successful', { phone: phone.slice(-4) });
      onPhoneSubmitted(phone);
    } catch (err) {
      const message =
        err instanceof AppErrorClass
          ? err.message
          : 'Failed to send OTP. Please try again.';
      logger.error('OTP request failed', {
        phone: phone.slice(-4),
        error: message,
      });
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const isPhoneValid = phone.length === 10;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to NearBy</Text>
          <Text style={styles.subtitle}>
            Enter your mobile number to receive an OTP
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={handlePhoneChange}
                editable={!isLoading}
                accessible
                accessibilityLabel="Phone number input"
                accessibilityHint="Enter your 10-digit phone number"
              />
            </View>

            {error && (
              <Text
                style={styles.errorText}
                accessible
                accessibilityRole="alert"
              >
                {error}
              </Text>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={!isPhoneValid || isLoading}
              style={[
                styles.submitButton,
                (!isPhoneValid || isLoading) && styles.submitButtonDisabled,
              ]}
              accessible
              accessibilityLabel="Request OTP"
              accessibilityRole="button"
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Sending OTP...' : 'Request OTP'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              You will receive a 6-digit OTP via SMS. Standard SMS charges apply.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
