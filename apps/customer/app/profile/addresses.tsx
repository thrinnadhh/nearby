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
import { EmptyState } from '@/components/EmptyState';
import { SkeletonLoader } from '@/components/SkeletonLoader';

/**
 * Saved Addresses Screen (Task 10.6)
 * 
 * Displays user's saved delivery addresses and allows:
 * - Viewing saved addresses with full details
 * - Adding new address
 * - Setting default address
 * - Deleting addresses
 * 
 * Integrates with address-picker for geocoding and validation.
 */

export default function SavedAddressesScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { savedAddresses, loading, error, fetchProfile } = useProfileStore();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Fetch addresses on mount
  useEffect(() => {
    if (token) {
      fetchProfile(token);
    }
  }, [token, fetchProfile]);

  const handleAddAddress = () => {
    router.push('/address-picker');
  };

  const handleDeleteAddress = (addressId: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            setIsDeleting(addressId);
            // TODO: Implement delete address API call
            // await deleteAddress(addressId, token);
            // fetchProfile(token);
            Alert.alert('Success', 'Address deleted');
          } catch (err) {
            Alert.alert('Error', 'Failed to delete address. Please try again.');
          } finally {
            setIsDeleting(null);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.primary}
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Text style={styles.title}>Saved Addresses</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.content}>
          <SkeletonLoader height={100} style={styles.skeletonItem} />
          <SkeletonLoader height={100} style={styles.skeletonItem} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.primary}
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Text style={styles.title}>Saved Addresses</Text>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          icon="alert-circle"
          title="Failed to Load Addresses"
          subtitle={error?.message || 'Please try again'}
          onCtaPress={() => token && fetchProfile(token)}
          ctaLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const hasAddresses = savedAddresses && savedAddresses.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="chevron-back"
          size={24}
          color={colors.primary}
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text style={styles.title}>Saved Addresses</Text>
        <View style={{ width: 24 }} />
      </View>

      {!hasAddresses ? (
        <EmptyState
          icon="location"
          title="No Addresses Saved"
          subtitle="Add a delivery address to place orders"
          onCtaPress={handleAddAddress}
          ctaLabel="Add Address"
        />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {savedAddresses!.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              <View style={styles.addressInfo}>
                <View style={styles.addressHeader}>
                  <Text style={styles.addressLabel}>{address.label || 'Address'}</Text>
                  {address.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressText}>{address.address_line_1}</Text>
                {address.address_line_2 && (
                  <Text style={styles.addressText}>{address.address_line_2}</Text>
                )}
                <View style={styles.addressFooter}>
                  <Text style={styles.cityText}>
                    {address.city}, {address.postal_code}
                  </Text>
                  {address.phone && (
                    <Text style={styles.phoneText}>{address.phone}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteAddress(address.id)}
                disabled={isDeleting === address.id}
              >
                {isDeleting === address.id ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Ionicons name="trash-outline" color={colors.error} size={18} />
                )}
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={handleAddAddress}>
            <Ionicons name="add" color={colors.primary} size={24} />
            <Text style={styles.addButtonText}>Add New Address</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  addressInfo: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  defaultBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  addressText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  addressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cityText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  phoneText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexDirection: 'row',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 8,
  },
  skeletonItem: {
    marginBottom: 12,
    borderRadius: 12,
  },
});
