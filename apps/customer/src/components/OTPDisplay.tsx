import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';

/**
 * OTP Display Component (Task 9.9)
 * 
 * Shows the delivery OTP in a large, easy-to-read format
 * for the customer to share with the delivery partner
 * 
 * Features:
 * - Large 4-digit OTP display (48pt font)
 * - Clear instructions for customer
 * - Option to copy OTP (future)
 * - Countdown timer to OTP expiry (future)
 * - Manual verification input for double-check
 * 
 * Display Format:
 * - OTP shown as monospace digits with wide letter spacing
 * - Green highlight to indicate valid OTP
 * - Instructions visible and clear
 */

interface OTPDisplayProps {
  visible: boolean;
  otp: string | undefined;
  onClose: () => void;
  onVerify: (enteredOtp: string) => Promise<void>;
  isVerifying?: boolean;
  verifyError?: string | null;
}

export const OTPDisplay = ({
  visible,
  otp,
  onClose,
  onVerify,
  isVerifying = false,
  verifyError = null,
}: OTPDisplayProps) => {
  const [enteredOtp, setEnteredOtp] = useState('');

  const handleVerify = async () => {
    await onVerify(enteredOtp);
    setEnteredOtp('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <SafeAreaView style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerEmoji}>📱</Text>
              <Text style={styles.headerTitle}>Share OTP</Text>
              <Text style={styles.headerSubtitle}>
                Show this code to the delivery partner
              </Text>
            </View>

            {/* OTP Display Section */}
            <View style={styles.otpSection}>
              <Text style={styles.otpLabel}>Delivery OTP</Text>

              {/* Large OTP Display */}
              {otp ? (
                <Text style={styles.otpValue}>{otp}</Text>
              ) : (
                <ActivityIndicator size="large" color="#10b981" />
              )}

              <Text style={styles.otpNote}>
                Valid for this delivery only
              </Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsSection}>
              <Text style={styles.instructionsTitle}>Steps:</Text>

              <InstructionStep
                number="1"
                text="Show this code to the delivery partner"
              />
              <InstructionStep
                number="2"
                text="They will use it to confirm delivery"
              />
              <InstructionStep
                number="3"
                text="Your order will be marked complete"
              />
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Manual Verification Section */}
            <View style={styles.verificationSection}>
              <Text style={styles.verificationLabel}>
                Verify delivery from partner
              </Text>
              <Text style={styles.verificationSubtext}>
                Enter the OTP your delivery partner gave you
              </Text>

              {/* OTP Input Boxes */}
              <View style={styles.otpInputBoxes}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <View key={index} style={styles.otpInputBox}>
                    <Text style={styles.otpInputValue}>
                      {enteredOtp[index] || ''}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Error message */}
              {verifyError && (
                <Text style={styles.errorMessage}>{verifyError}</Text>
              )}

              {/* OTP Keypad */}
              <View style={styles.keypad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.keypadButton}
                    onPress={() => {
                      if (enteredOtp.length < 6) {
                        setEnteredOtp(enteredOtp + num);
                      }
                    }}
                  >
                    <Text style={styles.keypadButtonText}>{num}</Text>
                  </TouchableOpacity>
                ))}

                {/* Backspace */}
                <TouchableOpacity
                  style={styles.keypadButton}
                  onPress={() =>
                    setEnteredOtp(enteredOtp.slice(0, -1))
                  }
                >
                  <Text style={styles.keypadButtonText}>⌫</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  isVerifying && styles.buttonDisabled,
                ]}
                onPress={handleVerify}
                disabled={enteredOtp.length !== 6 || isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onClose}
                disabled={isVerifying}
              >
                <Text style={styles.secondaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Instruction Step Component
function InstructionStep({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.instructionStep}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },

  // OTP Section
  otpSection: {
    backgroundColor: '#ecfdf5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  otpValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'Courier',
    letterSpacing: 12,
    marginVertical: 16,
    textAlign: 'center',
  },
  otpNote: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 12,
  },

  // Instructions
  instructionsSection: {
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
  },
  stepText: {
    fontSize: 13,
    color: '#4b5563',
    flexShrink: 1,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },

  // Verification
  verificationSection: {
    marginBottom: 20,
  },
  verificationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  verificationSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },

  // OTP Input Display
  otpInputBoxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  otpInputBox: {
    width: 40,
    height: 48,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  otpInputValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },

  // Error
  errorMessage: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Keypad
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  keypadButton: {
    width: '30%',
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  keypadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },

  // Footer
  footer: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
