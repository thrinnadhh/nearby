/**
 * Profile screen — displays delivery partner profile, KYC status, and logout
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/store/auth';
import { usePartnerStore } from '@/store/partner';
import logger from '@/utils/logger';

interface ProfileScreenProps {
  onLogoutComplete: () => void;
}

export function ProfileScreen({
  onLogoutComplete,
}: ProfileScreenProps): React.ReactElement {
  const { userId, phone, logout } = useAuthStore((state) => ({
    userId: state.userId,
    phone: state.phone,
    logout: state.logout,
  }));
  const { profile, reset } = usePartnerStore((state) => ({
    profile: state.profile,
    reset: state.reset,
  }));
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          onPress: () => {
            // Do nothing
          },
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              logger.info('User logging out', {
                userId,
                phone: phone?.slice(-4),
              });
              reset();
              logout();
              onLogoutComplete();
            } catch (err) {
              const message =
                err instanceof Error ? err.message : 'Logout failed';
              logger.error('Logout error', { error: message });
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getKYCStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return '#059669';
      case 'pending_review':
        return '#f59e0b';
      case 'pending_kyc':
        return '#ef4444';
      case 'rejected':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getKYCStatusLabel = (status: string): string => {
    switch (status) {
      case 'approved':
        return 'Verified';
      case 'pending_review':
        return 'Under Review';
      case 'pending_kyc':
        return 'Pending KYC';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const formatCurrency = (paise: number | undefined): string => {
    if (!paise) return '₹0.00';
    return `₹${(paise / 100).toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        scrollEnabled
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{phone}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.label}>User ID</Text>
              <Text style={styles.value} numberOfLines={1}>
                {userId ? userId.substring(0, 12) + '...' : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* KYC Status */}
        {profile && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>KYC Status</Text>
              <View style={styles.card}>
                <View style={styles.statusContainer}>
                  <View>
                    <Text style={styles.label}>Verification Status</Text>
                    <Text
                      style={[
                        styles.statusValue,
                        {
                          color: getKYCStatusColor(profile.kycStatus),
                        },
                      ]}
                    >
                      {getKYCStatusLabel(profile.kycStatus)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getKYCStatusColor(profile.kycStatus) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getKYCStatusColor(profile.kycStatus) },
                      ]}
                    >
                      {getKYCStatusLabel(profile.kycStatus).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Performance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance</Text>
              <View style={styles.card}>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>
                      {profile.completedDeliveries}
                    </Text>
                    <Text style={styles.metricLabel}>Deliveries</Text>
                  </View>
                  <View style={[styles.metric, styles.metricBorder]}>
                    <Text style={styles.metricValue}>
                      {profile.rating.toFixed(1)}
                    </Text>
                    <Text style={styles.metricLabel}>Rating</Text>
                  </View>
                  <View style={[styles.metric, styles.metricBorder]}>
                    <Text style={styles.metricValue}>
                      {profile.isOnline ? 'Online' : 'Offline'}
                    </Text>
                    <Text style={styles.metricLabel}>Status</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Earnings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Earnings</Text>
              <View style={styles.card}>
                <View style={styles.earningsRow}>
                  <View>
                    <Text style={styles.label}>Today's Earnings</Text>
                    <Text style={styles.earningsValue}>
                      {formatCurrency(profile.earningsToday)}
                    </Text>
                  </View>
                  <View style={styles.earningsDivider} />
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>Total Earnings</Text>
                    <Text style={styles.earningsValue}>
                      {formatCurrency(profile.earningsTotal)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bank Details */}
            {profile.bankAccountName && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bank Details</Text>
                <View style={styles.card}>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Account Name</Text>
                    <Text style={styles.value}>{profile.bankAccountName}</Text>
                  </View>
                  <View style={[styles.infoRow, styles.infoRowBorder]}>
                    <Text style={styles.label}>IFSC</Text>
                    <Text style={styles.value}>{profile.bankIFSC}</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Logout Button */}
        <View style={styles.section}>
          <Pressable
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={[
              styles.logoutButton,
              isLoggingOut && styles.logoutButtonDisabled,
            ]}
            accessible
            accessibilityLabel="Logout"
            accessibilityRole="button"
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.logoutButtonText}>Logout</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statusBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  metricBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  earningsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});
