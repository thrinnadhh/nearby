import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
} from '@/constants/theme';
import { CancelReasonPicker } from '@/components/CancelReasonPicker';

/**
 * Cancel Order Modal (Task 10.3)
 * 
 * Modal for cancelling an order with:
 * - Reason selection (radio buttons)
 * - Optional free text field
 * - Refund information
 * - Confirmation
 */

interface CancelOrderModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

const CANCELLATION_REASONS = [
  'I changed my mind',
  'Item is out of stock',
  'Delivery is taking too long',
  'I ordered by mistake',
  'Shop is not responding',
  'Other reason',
];

export function CancelOrderModal({
  visible,
  onCancel,
  onConfirm,
  isLoading = false,
}: CancelOrderModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedReason) return;

    // Explicit validation for "Other reason" case
    if (selectedReason === 'Other reason') {
      if (!otherReason || otherReason.trim().length === 0) {
        Alert.alert('Validation Error', 'Please provide a reason for cancellation');
        return;
      }
      if (otherReason.trim().length < 3) {
        Alert.alert('Validation Error', 'Reason must be at least 3 characters');
        return;
      }
    }

    const reason =
      selectedReason === 'Other reason' ? otherReason : selectedReason;

    setIsSubmitting(true);
    try {
      await onConfirm(reason);
    } finally {
      setIsSubmitting(false);
      setSelectedReason(null);
      setOtherReason('');
    }
  };

  const canSubmit =
    selectedReason &&
    (selectedReason !== 'Other reason' || otherReason.trim().length > 0);

  const isProcessing = isLoading || isSubmitting;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onCancel}
            disabled={isProcessing}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cancel Order</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentPadding}
          showsVerticalScrollIndicator={false}
        >
          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.warning}
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Refund Information</Text>
              <Text style={styles.infoText}>
                Refunds may take 3-5 business days to appear in your account.
              </Text>
            </View>
          </View>

          {/* Reason section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why do you want to cancel?</Text>
            <CancelReasonPicker
              reasons={CANCELLATION_REASONS}
              selected={selectedReason}
              onSelect={setSelectedReason}
              otherReason={otherReason}
              onOtherReasonChange={setOtherReason}
              disabled={isProcessing}
            />
          </View>

          {/* Spacer */}
          <View style={{ height: spacing.lg }} />
        </ScrollView>

        {/* Bottom actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onCancel}
            disabled={isProcessing}
          >
            <Text style={styles.secondaryButtonText}>Keep Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.dangerButton,
              !canSubmit && styles.buttonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!canSubmit || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Text style={styles.dangerButtonText}>Cancel Order</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
  },

  content: {
    flex: 1,
  },

  contentPadding: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: '#fef3c7',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#fcd34d',
    marginBottom: spacing.lg,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
  },

  infoText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  section: {
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
    marginBottom: spacing.md,
  },

  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fontFamily.semiBold,
  },

  dangerButton: {
    backgroundColor: colors.error,
  },

  dangerButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.surface,
    fontFamily: fontFamily.semiBold,
  },

  buttonDisabled: {
    opacity: 0.5,
  },
});
