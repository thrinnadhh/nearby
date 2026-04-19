/**
 * OnlineToggleScreen — large button to toggle online/offline (Task 13.3)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePartnerStore } from '@/store/partner';

export function OnlineToggleScreen() {
  const { isOnline, isLoading, error, goOnline, goOffline } = useOnlineStatus();
  const { profile } = usePartnerStore();

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading...</Text>
      </View>
    );
  }

  const handleToggle = async () => {
    if (isOnline) {
      await goOffline();
    } else {
      await goOnline();
    }
  };

  // Check KYC status before allowing online
  const canGoOnline = profile.kycStatus === 'approved';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Availability</Text>

        {/* Large Toggle Button */}
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isOnline && styles.toggleButtonOnline,
            (!canGoOnline && !isOnline) && styles.toggleButtonDisabled,
          ]}
          onPress={handleToggle}
          disabled={isLoading || (!canGoOnline && !isOnline)}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <MaterialIcons
                name={isOnline ? 'radio-button-on' : 'radio-button-off'}
                size={80}
                color="#fff"
              />
              <Text style={styles.toggleText}>
                {isOnline ? 'Go Offline' : 'Go Online'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.statusLabel}>
          You are currently <Text style={{ fontWeight: 'bold' }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </Text>

        {/* KYC Warning */}
        {!canGoOnline && !isOnline && (
          <View style={styles.warningBox}>
            <MaterialIcons name="info" size={20} color="#92400e" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>KYC Not Approved</Text>
              <Text style={styles.warningText}>
                Complete KYC verification to go online
              </Text>
            </View>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={20} color="#991b1b" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Status Info */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>KYC Status</Text>
            <Text style={[styles.infoValue, getKYCStatusStyle(profile.kycStatus)]}>
              {formatKYCStatus(profile.kycStatus)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function formatKYCStatus(status: string): string {
  const map: Record<string, string> = {
    pending_kyc: 'Pending',
    pending_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return map[status] || status;
}

function getKYCStatusStyle(status: string) {
  if (status === 'approved') {
    return { color: '#22c55e' };
  }
  if (status === 'rejected') {
    return { color: '#ef4444' };
  }
  return { color: '#f59e0b' };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 48,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  toggleButton: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  toggleButtonOnline: {
    backgroundColor: '#22c55e',
  },
  toggleButtonDisabled: {
    opacity: 0.5,
  },
  toggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#92400e',
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
    flex: 1,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
