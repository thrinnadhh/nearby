/**
 * AadhaarScreen — Enter last 4 digits of Aadhaar (Task 13.5)
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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRegistration } from '@/hooks/useRegistration';
import logger from '@/utils/logger';

type AadhaarScreenProps = NativeStackScreenProps<any, 'Aadhaar'>;

export function AadhaarScreen({ navigation }: AadhaarScreenProps) {
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const { isLoading, error } = useRegistration();

  const handleContinue = () => {
    if (aadhaarLast4.length === 4 && /^\d{4}$/.test(aadhaarLast4)) {
      logger.info('Proceeding to next step with Aadhaar', { aadhaarLast4: 'xxxx' });
      navigation.navigate('VehiclePhoto');
    }
  };

  const isValid = aadhaarLast4.length === 4 && /^\d{4}$/.test(aadhaarLast4);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Aadhaar Verification</Text>
        <Text style={styles.subtitle}>Enter last 4 digits of your Aadhaar number</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter last 4 digits"
            placeholderTextColor="#999"
            maxLength={4}
            keyboardType="numeric"
            value={aadhaarLast4}
            onChangeText={setAadhaarLast4}
            editable={!isLoading}
            testID="aadhaar-input"
          />
        </View>

        <Text style={styles.helpText}>We'll verify your Aadhaar for KYC compliance</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              !isValid || isLoading ? styles.buttonDisabled : styles.buttonEnabled,
            ]}
            onPress={handleContinue}
            disabled={!isValid || isLoading}
            testID="continue-button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
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
  inputContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
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
