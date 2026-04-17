import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { useProfileStore } from '@/store/profile';
import { colors } from '@/constants/theme';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { EmptyState } from '@/components/EmptyState';

/**
 * Profile Tab Screen (Task 10.6)
 * 
 * Displays user's profile information and provides navigation to:
 * - Edit profile (name, email)
 * - Saved delivery addresses
 * - Logout action
 * 
 * Shows loading skeleton while fetching profile data.
 */

export default function ProfileScreen() {
  const router = useRouter();
  const { token, logout } = useAuthStore();
  const { profile, loading, error, fetchProfile, logout: logoutProfile } = useProfileStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    if (token) {
      fetchProfile(token);
    }
  }, [token, fetchProfile]);

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleManageAddresses = () => {
    router.push('/profile/addresses');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            // Clear both auth token and persisted profile/address data
            logout();
            logoutProfile();
            router.replace('/(auth)/login');
          } catch (err) {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          } finally {
            setIsLoggingOut(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          <SkeletonLoader height={100} style={styles.skeletonHeader} />
          <SkeletonLoader height={50} style={styles.skeletonRow} />
          <SkeletonLoader height={50} style={styles.skeletonRow} />
          <SkeletonLoader height={50} style={styles.skeletonRow} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle"
          title="Failed to Load Profile"
          subtitle={error?.message || 'Please try again'}
          onCtaPress={() => token && fetchProfile(token)}
          ctaLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const roleLabel = {
    customer: 'Customer',
    shop_owner: 'Shop Owner',
    delivery: 'Delivery Partner',
    admin: 'Administrator',
  }[profile.role] || 'User';

  const accountCreatedDate = new Date(profile.created_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>
              {profile.phone.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.phone}>{profile.phone}</Text>
            <View style={styles.roleContainer}>
              <Ionicons
                name={profile.role === 'customer' ? 'person' : 'briefcase'}
                color={colors.primary}
                size={14}
              />
              <Text style={styles.role}>{roleLabel}</Text>
            </View>
            <Text style={styles.accountDate}>
              Account created {accountCreatedDate}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" color={colors.primary} size={20} />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" color={colors.textTertiary} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleManageAddresses}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="location-outline" color={colors.primary} size={20} />
              <Text style={styles.menuItemText}>Saved Addresses</Text>
            </View>
            <Ionicons name="chevron-forward" color={colors.textTertiary} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Ionicons name="log-out-outline" color={colors.error} size={20} />
              )}
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" color={colors.textTertiary} size={20} />
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            NearBy helps you get fresh groceries and essentials from trusted local shops.
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatar: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  phone: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  role: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  accountDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 12,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '400',
  },
  skeletonHeader: {
    marginBottom: 24,
    borderRadius: 12,
  },
  skeletonRow: {
    marginBottom: 12,
    borderRadius: 8,
  },
});
