/**
 * Assignment alert screen — modal overlay for new delivery assignments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { OrderPreviewCard } from '@/components/OrderPreviewCard';
import { useAssignmentStore } from '@/store/assignment';
import {
  acceptAssignment,
  rejectAssignment,
} from '@/services/assignment';
import { AppErrorClass } from '@/types/common';
import logger from '@/utils/logger';

interface AssignmentAlertProps {
  visible: boolean;
  onDismiss: () => void;
}

export function AssignmentAlert({
  visible,
  onDismiss,
}: AssignmentAlertProps): React.ReactElement | null {
  const {
    currentAssignment,
    setCurrentAssignment,
    removePendingAssignment,
    addAcceptedAssignment,
  } = useAssignmentStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setError('');
    }
  }, [visible]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (visible && currentAssignment) {
          // Prevent back button while assignment is being shown
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [visible, currentAssignment]);

  if (!currentAssignment || !visible) {
    return null;
  }

  const handleAccept = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const orderId = currentAssignment.orderId;
      await acceptAssignment(orderId);

      logger.info('Assignment accepted', { orderId });

      // Move to accepted assignments
      addAcceptedAssignment(currentAssignment);
      removePendingAssignment(orderId);
      setCurrentAssignment(null);

      // Close modal after a short delay
      setTimeout(() => {
        onDismiss();
      }, 500);
    } catch (err) {
      const message =
        err instanceof AppErrorClass
          ? err.message
          : 'Failed to accept assignment';

      logger.error('Accept assignment failed', {
        orderId: currentAssignment.orderId,
        error: message,
      });

      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const orderId = currentAssignment.orderId;
      await rejectAssignment(orderId);

      logger.info('Assignment rejected', { orderId });

      removePendingAssignment(orderId);
      setCurrentAssignment(null);

      // Close modal after a short delay
      setTimeout(() => {
        onDismiss();
      }, 500);
    } catch (err) {
      const message =
        err instanceof AppErrorClass
          ? err.message
          : 'Failed to reject assignment';

      logger.error('Reject assignment failed', {
        orderId: currentAssignment.orderId,
        error: message,
      });

      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Assignment</Text>
          <Pressable
            onPress={onDismiss}
            disabled={isProcessing}
            accessible
            accessibilityLabel="Close assignment"
            accessibilityRole="button"
          >
            <Text style={styles.closeButton}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText} accessible accessibilityRole="alert">
                {error}
              </Text>
            </View>
          )}

          <OrderPreviewCard
            order={currentAssignment.orderData}
            distanceKm={currentAssignment.distanceKm}
            estimatedPickupTime={currentAssignment.estimatedPickupTime}
            estimatedDeliveryTime={currentAssignment.estimatedDeliveryTime}
            onAccept={handleAccept}
            onReject={handleReject}
            isLoading={isProcessing}
          />
        </View>

        {isProcessing && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    lineHeight: 18,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
