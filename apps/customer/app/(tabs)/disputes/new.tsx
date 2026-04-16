import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Alert,
  Picker,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import {
  openDispute,
  getDisputeReasons,
  getReasonLabel,
} from '@/services/disputes';

/**
 * New Dispute Form (Task 9.8)
 * 
 * Allows customer to open a dispute for a specific order
 * Form includes: reason selection, description, optional attachments
 */

export default function NewDisputeScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { token } = useAuthStore();

  // State
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasons = getDisputeReasons();
  const descriptionChars = description.length;
  const maxDescription = 1000;

  const canSubmit = selectedReason && description.trim().length > 10 && !isSubmitting;

  const handleSubmit = async () => {
    if (!orderId || !token) {
      Alert.alert('Error', 'Invalid order or authentication');
      return;
    }

    if (!selectedReason) {
      Alert.alert('Validation Error', 'Please select a dispute reason');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert(
        'Validation Error',
        'Please provide a description (at least 10 characters)'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const dispute = await openDispute(
        {
          order_id: orderId,
          reason: selectedReason,
          description: description.trim(),
        },
        token
      );

      Alert.alert(
        'Dispute Created',
        'Your dispute has been submitted. We will review it shortly.',
        [
          {
            text: 'View Dispute',
            onPress: () => {
              router.push(`/(tabs)/disputes/${dispute.id}`);
            },
          },
          {
            text: 'Back',
            style: 'cancel',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (err: any) {
      const message = err?.message || 'Failed to open dispute';
      setError(message);
      Alert.alert('Error', message);
      console.error('Open dispute error:', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Open Dispute</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Report an Issue</Text>
          <Text style={styles.infoCardDescription}>
            Help us resolve any issues with your order. Please provide details
            about what went wrong so we can assist you quickly.
          </Text>
        </View>

        {/* Reason Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's the issue?</Text>
          <Text style={styles.sectionDescription}>
            Select the reason that best describes your issue
          </Text>

          <View style={styles.reasonsList}>
            {reasons.map((reason) => {
              const isSelected = selectedReason === reason.id;

              return (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonItem,
                    isSelected && styles.reasonItemSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.id)}
                >
                  <View style={styles.reasonItemContent}>
                    <Text
                      style={[
                        styles.reasonLabel,
                        isSelected && styles.reasonLabelSelected,
                      ]}
                    >
                      {reason.label}
                    </Text>
                    <Text
                      style={[
                        styles.reasonDescription,
                        isSelected && styles.reasonDescriptionSelected,
                      ]}
                    >
                      {reason.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      isSelected && styles.radioButtonSelected,
                    ]}
                  >
                    {isSelected && (
                      <View style={styles.radioButtonDot} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tell us what happened</Text>
          <Text style={styles.sectionDescription}>
            Provide more details to help us understand the issue better
          </Text>

          <View style={styles.descriptionInputContainer}>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe the issue in detail..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={6}
              maxLength={maxDescription}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
            <Text style={styles.charCounter}>
              {descriptionChars} / {maxDescription}
            </Text>
          </View>

          {description.trim().length > 0 &&
            description.trim().length < 10 && (
              <Text style={styles.validationError}>
                Description must be at least 10 characters
              </Text>
            )}
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Helpful Tips</Text>
          <Text style={styles.tipText}>
            • Be specific about what went wrong
          </Text>
          <Text style={styles.tipText}>
            • Mention the time and date when possible
          </Text>
          <Text style={styles.tipText}>
            • Include order details if relevant
          </Text>
          <Text style={styles.tipText}>
            • Our team will respond within 24-48 hours
          </Text>
        </View>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Dispute</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Content
  content: {
    flex: 1,
    paddingVertical: 16,
  },

  // Error Banner
  errorBanner: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 6,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 6,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 4,
  },
  infoCardDescription: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 16,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },

  // Reasons List
  reasonsList: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  reasonItemSelected: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  reasonItemContent: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  reasonLabelSelected: {
    color: '#ef4444',
  },
  reasonDescription: {
    fontSize: 11,
    color: '#9ca3af',
  },
  reasonDescriptionSelected: {
    color: '#dc2626',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#ef4444',
  },
  radioButtonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },

  // Description
  descriptionInputContainer: {
    position: 'relative',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: '#1a1a1a',
    backgroundColor: '#f9fafb',
  },
  charCounter: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'right',
  },
  validationError: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: 4,
  },

  // Tips
  tipsCard: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 6,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#15803d',
    lineHeight: 16,
    marginBottom: 4,
  },

  // Submit
  submitContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  submitButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
});
