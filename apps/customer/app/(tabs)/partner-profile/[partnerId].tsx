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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { getReviewStats, getShopReviews } from '@/services/reviews';
import logger from '@/utils/logger';

/**
 * Delivery Partner Profile Screen
 *
 * Displays delivery partner's trust score, reviews, and ratings.
 * Shown after order delivery or from order history.
 *
 * NOTE: Delivery partner personal info (name, phone, vehicle) is intentionally
 * NOT displayed here to protect partner privacy. Only public trust/rating data
 * is shown. If a contact feature is needed, it must go through the anonymised
 * call proxy — never expose the raw phone number to the client.
 */

interface Review {
  id: string;
  rating: number;
  review_text?: string;
  created_at: string;
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

const StarRow = ({ rating }: { rating: number }) => {
  return (
    <View style={styles.starsContainer}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={[styles.star, i < Math.floor(rating) && styles.starFilled]}>
          {i < Math.floor(rating) ? '★' : '☆'}
        </Text>
      ))}
    </View>
  );
};

export default function DeliveryPartnerProfile() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const router = useRouter();
  const { token } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (!partnerId || !token) return;

    const fetchPartnerStats = async () => {
      try {
        const statsData = await getReviewStats(partnerId, token);
        setStats(statsData);

        // Best-effort: fetch recent reviews. The endpoint may not exist yet.
        try {
          const reviewsData = await getShopReviews(partnerId, { page: 1, limit: 5 }, token);
          setReviews(reviewsData.data ?? []);
          setTotalReviews(reviewsData.meta?.total ?? 0);
        } catch (reviewErr: unknown) {
          // Reviews list not critical — stats still shown.
          logger.warn('Partner reviews list unavailable', {
            partnerId,
            error: reviewErr instanceof Error ? reviewErr.message : String(reviewErr),
          });
        }

        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load partner info';
        logger.error('Partner stats fetch error', { partnerId, error: message });
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartnerStats();
  }, [partnerId, token]);

  const getRatingPercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Partner</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={BRAND_GREEN} />
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

  const avgRating = stats?.average_rating ?? 0;
  const totalCount = stats?.total_reviews ?? 0;
  const badge = getTrustBadge(avgRating);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Partner</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Trust Badge */}
        <View style={styles.partnerCard}>
          <View style={[styles.badgeContainer, { backgroundColor: badge.bgColor }]}>
            <Text style={[styles.badge, { color: badge.color }]}>{badge.label} Partner</Text>
          </View>
          <Text style={styles.partnerSubtitle}>
            Based on {totalCount} customer {totalCount === 1 ? 'review' : 'reviews'}
          </Text>
        </View>

        {/* Rating Summary */}
        <View style={styles.ratingSection}>
          <View style={styles.ratingHeader}>
            <View style={styles.ratingMain}>
              <Text style={styles.ratingScore}>{avgRating.toFixed(1)}</Text>
              <StarRow rating={avgRating} />
            </View>
            <View style={styles.reviewCount}>
              <Text style={styles.reviewCountNumber}>{totalCount}</Text>
              <Text style={styles.reviewCountLabel}>Reviews</Text>
            </View>
          </View>

          {stats && (
            <View style={styles.distributionContainer}>
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = stats.distribution[star] ?? 0;
                const pct = getRatingPercentage(count, totalCount);
                return (
                  <View key={star} style={styles.distributionRow}>
                    <Text style={styles.distLabel}>{star}★</Text>
                    <View style={styles.barBackground}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${pct}%` as `${number}%` },
                          star >= 4
                            ? styles.barGood
                            : star === 3
                            ? styles.barOk
                            : styles.barPoor,
                        ]}
                      />
                    </View>
                    <Text style={styles.distPercentage}>{pct}%</Text>
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
                <Text style={styles.viewMore}>{totalReviews - reviews.length} more</Text>
              )}
            </View>

            <FlatList
              data={reviews}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <StarRow rating={item.rating} />
                    <Text style={styles.reviewDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {item.review_text ? (
                    <Text style={styles.reviewText} numberOfLines={3}>
                      {item.review_text}
                    </Text>
                  ) : null}
                </View>
              )}
            />
          </View>
        )}

        {/* Empty State */}
        {totalCount === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Reviews Yet</Text>
            <Text style={styles.emptyStateMessage}>
              This partner is brand new. Be the first to leave a review!
            </Text>
          </View>
        )}

        {/* Report Section */}
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

const BRAND_GREEN = '#10b981';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 24 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#dc2626', marginBottom: 8 },
  errorMessage: { fontSize: 14, color: '#991b1b', marginBottom: 20, textAlign: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { paddingVertical: 4 },
  backButtonText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },

  partnerCard: {
    margin: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'flex-start',
  },
  badgeContainer: { padding: 8, borderRadius: 8, marginBottom: 8 },
  badge: { fontSize: 13, fontWeight: '700' },
  partnerSubtitle: { fontSize: 13, color: '#6b7280' },

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
  ratingMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratingScore: { fontSize: 32, fontWeight: '700', color: BRAND_GREEN },
  starsContainer: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 14, color: '#d1d5db' },
  starFilled: { color: '#fbbf24' },
  reviewCount: { alignItems: 'center' },
  reviewCountNumber: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  reviewCountLabel: { fontSize: 12, color: '#6b7280' },

  distributionContainer: { gap: 12 },
  distributionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLabel: { fontSize: 12, fontWeight: '600', color: '#4b5563', width: 30 },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barGood: { backgroundColor: BRAND_GREEN },
  barOk: { backgroundColor: '#f59e0b' },
  barPoor: { backgroundColor: '#ef4444' },
  distPercentage: { fontSize: 12, fontWeight: '600', color: '#6b7280', width: 40, textAlign: 'right' },

  reviewsSection: { marginHorizontal: 16, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  viewMore: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
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
  reviewDate: { fontSize: 12, color: '#9ca3af' },
  reviewText: { fontSize: 13, color: '#4b5563', lineHeight: 18 },

  emptyState: {
    marginHorizontal: 16,
    marginVertical: 24,
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  emptyStateMessage: { fontSize: 13, color: '#6b7280', textAlign: 'center' },

  helpSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  helpTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 6 },
  helpText: { fontSize: 12, color: '#b45309', marginBottom: 12, lineHeight: 16 },

  button: {
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: { backgroundColor: BRAND_GREEN },
  secondaryButton: { borderWidth: 1, borderColor: '#d97706', backgroundColor: '#fff' },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#d97706' },
});
