import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { getReviewStats, getShopReviews } from '@/services/reviews';

/**
 * Delivery Partner Profile Screen (Task 9.6)
 * 
 * Displays delivery partner's trust score, reviews, and ratings
 * Shown after order delivery or from order history
 * 
 * Features:
 * - Trust badge (Trusted/Good/New/Review)
 * - Average rating with star display
 * - Rating distribution breakdown
 * - Recent reviews list (with pagination)
 * - Contact button
 */

interface Review {
  id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  customer_name?: string;
}

interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

const getTrustBadge = (rating: number): { label: string; color: string; bgColor: string } => {
  if (rating >= 80) return { label: 'Trusted', color: '#059669', bgColor: '#d1fae5' };
  if (rating >= 60) return { label: 'Good', color: '#0891b2', bgColor: '#cffafe' };
  if (rating >= 40) return { label: 'New', color: '#7c3aed', bgColor: '#ede9fe' };
  return { label: 'Under Review', color: '#dc2626', bgColor: '#fee2e2' };
};

const renderStars = (rating: number, count: number = 5) => {
  const stars = [];
  for (let i = 1; i <= count; i++) {
    stars.push(
      <Text key={i} style={[styles.star, i <= Math.floor(rating) ? styles.starFilled : {}]}>
        {i <= Math.floor(rating) ? '★' : '☆'}
      </Text>
    );
  }
  return stars;
};

export default function DeliveryPartnerProfile() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const router = useRouter();
  const { token } = useAuthStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);

  // Mock partner info (in real app, would fetch from API)
  const [partnerInfo] = useState({
    id: partnerId || 'partner1',
    name: 'Raj Kumar',
    phone: '+919876543210',
    vehicle_type: 'Bike',
    vehicle_number: 'KA05AB1234',
    experience: '2+ years',
  });

  // Fetch review stats and recent reviews
  useEffect(() => {
    const fetchPartnerStats = async () => {
      try {
        if (!partnerId || !token) return;

        // Fetch stats
        const statsData = await getReviewStats(partnerId, token);
        setStats(statsData);

        // Fetch reviews (assuming endpoint exists or using getShopReviews pattern)
        try {
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/api/v1/reviews/user/${partnerId}/list?page=1&limit=5`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await response.json();
          if (data.data?.data) {
            setReviews(data.data.data);
            setTotalReviews(data.data.meta?.total || 0);
          }
        } catch (err) {
          // Reviews endpoint might not exist yet, use stats only
          console.log('Reviews list endpoint not available');
        }

        setError(null);
      } catch (err: any) {
        const message = err?.message || 'Failed to load partner info';
        setError(message);
        console.error('Partner stats fetch error:', message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartnerStats();
  }, [partnerId, token]);

  const handleContactPress = () => {
    Linking.openURL(`tel:${partnerInfo.phone}`);
  };

  const getRatingPercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading partner profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Unable to Load Profile</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avgRating = stats?.average_rating || 0;
  const totalCount = stats?.total_reviews || 0;
  const badge = getTrustBadge(stats?.average_rating || 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Partner</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Partner Card */}
        <View style={styles.partnerCard}>
          <View style={styles.partnerHeader}>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{partnerInfo.name}</Text>
              <View style={styles.partnerMeta}>
                <Text style={styles.partnerVehicle}>🚗 {partnerInfo.vehicle_type}</Text>
                <Text style={styles.partnerExp}>📅 {partnerInfo.experience}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactPress}
            >
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={styles.contactText}>Call</Text>
            </TouchableOpacity>
          </View>

          {/* Trust Badge */}
          <View style={[styles.badgeContainer, { backgroundColor: badge.bgColor }]}>
            <Text style={[styles.badge, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Rating Summary */}
        <View style={styles.ratingSection}>
          <View style={styles.ratingHeader}>
            <View style={styles.ratingMain}>
              <Text style={styles.ratingScore}>{avgRating.toFixed(1)}</Text>
              <View style={styles.starsContainer}>
                {renderStars(avgRating)}
              </View>
            </View>
            <View style={styles.reviewCount}>
              <Text style={styles.reviewCountNumber}>{totalCount}</Text>
              <Text style={styles.reviewCountLabel}>Reviews</Text>
            </View>
          </View>

          {/* Rating Distribution */}
          {stats && (
            <View style={styles.distributionContainer}>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.distribution[rating as keyof typeof stats.distribution] || 0;
                const percentage = getRatingPercentage(count, totalCount);

                return (
                  <View key={rating} style={styles.distributionRow}>
                    <Text style={styles.distLabel}>{rating}★</Text>
                    <View style={styles.barBackground}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${percentage}%` },
                          rating >= 4 ? styles.barGood : rating === 3 ? styles.barOk : styles.barPoor,
                        ]}
                      />
                    </View>
                    <Text style={styles.distPercentage}>{percentage}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Recent Reviews */}
        {reviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              {totalReviews > reviews.length && (
                <Text style={styles.viewMore}>
                  {totalReviews - reviews.length} more
                </Text>
              )}
            </View>

            <FlatList
              data={reviews}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewStars}>
                      {renderStars(item.rating, 5)}
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {item.review_text && (
                    <Text style={styles.reviewText} numberOfLines={3}>
                      {item.review_text}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
        )}

        {/* Empty State */}
        {totalCount === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>⭐</Text>
            <Text style={styles.emptyStateTitle}>No Reviews Yet</Text>
            <Text style={styles.emptyStateMessage}>
              This partner is brand new. Be the first to leave a review!
            </Text>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <InfoRow label="Vehicle" value={partnerInfo.vehicle_number} />
          <InfoRow label="Phone" value={partnerInfo.phone} />
          <InfoRow label="Experience" value={partnerInfo.experience} />
          <InfoRow label="Total Deliveries" value={totalCount.toString()} />
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Report an Issue</Text>
          <Text style={styles.helpText}>
            If you have concerns about this partner, please contact our support team.
          </Text>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Component
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingBottom: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#991b1b',
    marginBottom: 20,
    textAlign: 'center',
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
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Partner Card
  partnerCard: {
    margin: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  partnerMeta: {
    flexDirection: 'column',
    gap: 4,
  },
  partnerVehicle: {
    fontSize: 13,
    color: '#4b5563',
  },
  partnerExp: {
    fontSize: 13,
    color: '#4b5563',
  },
  contactButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  contactIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  contactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Badge
  badgeContainer: {
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Rating Section
  ratingSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  ratingMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingScore: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10b981',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 14,
    color: '#d1d5db',
  },
  starFilled: {
    color: '#fbbf24',
  },
  reviewCount: {
    alignItems: 'center',
  },
  reviewCountNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  reviewCountLabel: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Distribution
  distributionContainer: {
    gap: 12,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    width: 30,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barGood: {
    backgroundColor: '#10b981',
  },
  barOk: {
    backgroundColor: '#f59e0b',
  },
  barPoor: {
    backgroundColor: '#ef4444',
  },
  distPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    width: 40,
    textAlign: 'right',
  },

  // Reviews Section
  reviewsSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  viewMore: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  reviewItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  reviewText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },

  // Empty State
  emptyState: {
    marginHorizontal: 16,
    marginVertical: 24,
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  emptyStateMessage: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Info Section
  infoSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '600',
  },

  // Help Section
  helpSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 6,
  },
  helpText: {
    fontSize: 12,
    color: '#b45309',
    marginBottom: 12,
    lineHeight: 16,
  },

  // Buttons
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d97706',
    backgroundColor: '#fff',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d97706',
  },
});
