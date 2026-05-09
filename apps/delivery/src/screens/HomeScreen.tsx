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
    return { color: '#2F8F5E' };
  }
  if (status === 'rejected') {
    return { color: '#DC2626' };
  }
  return { color: '#D97706' };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF4EA',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#261A14',
    fontFamily: 'Georgia',
  },
  message: {
    fontSize: 14,
    color: '#6B5B4E',
    marginTop: 12,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#E9DDC7',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusOnline: {
    backgroundColor: '#D1F0E2',
    borderWidth: 1.5,
    borderColor: '#2F8F5E',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#B8A99A',
    marginRight: 12,
  },
  statusDotOnline: {
    backgroundColor: '#2F8F5E',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#261A14',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9DDC7',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B5B4E',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#261A14',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9DDC7',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E35D23',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B5B4E',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
});
