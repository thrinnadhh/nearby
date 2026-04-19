/**
 * HomeScreen — main tab with online/offline status indicator (Task 13.1 & 13.3)
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { usePartnerStore } from '@/store/partner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import logger from '@/utils/logger';

export function HomeScreen() {
  const { profile, error } = usePartnerStore();
  const { isOnline, isLoading, error: toggleError } = useOnlineStatus();

  useEffect(() => {
    logger.info('HomeScreen mounted');
  }, []);

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading delivery partner profile...</Text>
      </View>
    );
  }

  const displayError = error || toggleError;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NearBy Delivery</Text>
      </View>

      {/* Status Indicator */}
      <View style={[styles.statusCard, isOnline && styles.statusOnline]}>
        <View
          style={[
            styles.statusDot,
            isOnline && styles.statusDotOnline,
          ]}
        />
        <Text style={styles.statusText}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>

      {/* KYC Status */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>KYC Status</Text>
        <Text style={[styles.infoValue, getKYCStatusStyle(profile.kycStatus)]}>
          {formatKYCStatus(profile.kycStatus)}
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile.completedDeliveries}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>₹{profile.earningsToday}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Error Display */}
      {displayError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{displayError}</Text>
        </View>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}
    </View>
  );
}

function formatKYCStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending_kyc: 'Pending',
    pending_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return statusMap[status] || status;
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
    paddingTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusOnline: {
    backgroundColor: '#dcfce7',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9ca3af',
    marginRight: 12,
  },
  statusDotOnline: {
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
});
