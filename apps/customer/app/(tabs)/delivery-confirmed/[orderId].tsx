import React, { useState, useEffect, useCallback } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { getOrder } from '@/services/orders';
import { submitReview } from '@/services/reviews';
import { paise } from '@/utils/currency';
import logger from '@/utils/logger';

/**
 * Delivery Confirmed Screen (Task 9.10)
 * 
 * Shown immediately after:
 * - Delivery partner marks order as delivered
 * - Customer verifies OTP successfully
 * 
 * Features:
 * - Order delivered confirmation with celebration animation
 * - Quick 5-star rating of delivery partner  
 * - Option to write full review
 * - Estimated savings/rewards display
 * - Navigation to order history or home
 * 
 * Flow:
 * tracking/[orderId] (OTP verified) → delivery-confirmed/[orderId]
 *   ├── Quick rate (1-5 stars) → submitReview
 *   ├── "Write full review" → reviews/compose/[orderId]
 *   └── "Done" → /(tabs)/order-history or /(tabs)/home
 */

interface Order {
  id: string;
  order_status: string;
  total_amount: number;
  delivery_partner?: {
    id: string;
    name: string;
    vehicle_type: string;
    rating: number;
  };
  shop?: {
    id: string;
    name: string;
  };
  order_items?: Array<{ name: string; qty: number }>;
}

export default function DeliveryConfirmedScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { token } = useAuthStore();

  // Loading & Data State
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rating State
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    try {
      if (!orderId || !token) return;

      const data = await getOrder(orderId);
      setOrder(data);
      setError(null);
    } catch (err: any) {
      const message = err?.message || 'Failed to load order';
      setError(message);
      logger.error('Order fetch error', { message });
    } finally {
      setIsLoading(false);
    }
  }, [orderId, token]);

  // Load order on mount
  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Handle rating submission
  const handleSubmitRating = async (rating: number) => {
    setSelectedRating(rating);

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (!orderId || !token) return;

      // Submit delivery partner rating
      await submitReview({
        order_id: orderId,
        rating,
        comment: '',
        review_type: 'delivery', // For delivery partner vs shop
      }, token);

      setReviewSubmitted(true);

      // Auto-dismiss success message after 2 seconds
      setTimeout(() => {
        // Offer to write full review or go to next step
      }, 2000);
    } catch (err: any) {
      const message = err?.message || 'Failed to submit rating';
      Alert.alert('Error', message);
      logger.error('Rating submission error', { message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate to full review screen
  const handleWriteFullReview = () => {
    router.push(`/(tabs)/reviews/compose/${orderId}`);
  };

  // Go to order history
  const handleDone = () => {
    router.replace('/(tabs)/order-history');
  };

  const formatItemList = (items?: Array<{ name: string; qty: number }>) => {
    if (!items || items.length === 0) return '';
    if (items.length === 1) return items[0].name;
    return `${items[0].name} + ${items.length - 1} more`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Processing your delivery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.errorCard}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Unable to Load Order</Text>
            <Text style={styles.errorMessage}>{error}</Text>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => {
                setError(null);
                setIsLoading(true);
                fetchOrderDetails();
              }}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Celebration Header */}
        <View style={styles.celebrationSection}>
          <Text style={styles.celebrationEmoji}>🎉 🎊 🎉</Text>
          <Text style={styles.celebrationTitle}>Order Delivered!</Text>
          <Text style={styles.celebrationSubtitle}>
            Thank you for shopping with us
          </Text>
        </View>

        {/* Order Summary Card */}
        {order && (
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Order ID</Text>
              <Text style={styles.summaryValue}>{order.id}</Text>
            </View>

            {order.shop?.name && (
              <View style={[styles.summaryRow, styles.divider]}>
                <Text style={styles.summaryLabel}>Shop</Text>
                <Text style={styles.summaryValue}>{order.shop.name}</Text>
              </View>
            )}

            <View style={[styles.summaryRow, styles.divider]}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryValue}>
                {formatItemList(order.order_items)}
              </Text>
            </View>

            <View style={styles.divider}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>
                {paise(order.total_amount)}
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Partner Section */}
        {order?.delivery_partner && (
          <View style={styles.partnerSection}>
            <Text style={styles.sectionTitle}>Rate Your Delivery Partner</Text>

            <View style={styles.partnerCard}>
              <View style={styles.partnerHeader}>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>
                    {order.delivery_partner.name}
                  </Text>
                  <Text style={styles.partnerVehicle}>
                    🚗 {order.delivery_partner.vehicle_type}
                  </Text>
                </View>
              </View>

              {/* Star Rating - Large */}
              <View style={styles.ratingContainer}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleSubmitRating(star)}
                      disabled={isSubmitting}
                      style={styles.starButton}
                    >
                      <Text
                        style={[
                          styles.star,
                          selectedRating >= star && styles.starSelected,
                        ]}
                      >
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedRating > 0 && (
                  <Text style={styles.ratingText}>
                    {selectedRating} star{selectedRating !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>

              {/* Rating feedback */}
              {reviewSubmitted && selectedRating > 0 && (
                <View style={styles.successMessage}>
                  <Text style={styles.successEmoji}>✓</Text>
                  <Text style={styles.successText}>
                    Thanks for rating {order.delivery_partner.name}!
                  </Text>
                </View>
              )}

              {isSubmitting && (
                <View style={styles.submittingContainer}>
                  <ActivityIndicator size="small" color="#10b981" />
                  <Text style={styles.submittingText}>Saving rating...</Text>
                </View>
              )}
            </View>

            {/* Write full review option */}
            {reviewSubmitted && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleWriteFullReview}
              >
                <Text style={styles.linkButtonText}>
                  ✏️ Write a detailed review
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* What to do next */}
        <View style={styles.nextStepsSection}>
          <Text style={styles.sectionTitle}>What's Next?</Text>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Check your email</Text>
              <Text style={styles.stepDescription}>
                Order receipt sent to your registered email
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share feedback</Text>
              <Text style={styles.stepDescription}>
                Help us improve by reviewing your experience
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Earn rewards</Text>
              <Text style={styles.stepDescription}>
                Points added to your account for future orders
              </Text>
            </View>
          </View>
        </View>

        {/* Support section */}
        <View style={styles.supportSection}>
          <Text style={styles.supportText}>
            If you have any issues with your order, please contact our support team and we'll be happy to help.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleDone}
        >
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },

  // Error
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginVertical: 24,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7f1d1d',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Celebration
  celebrationSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  celebrationEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Order Summary
  orderSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 4,
  },
  divider: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  // Partner Section
  partnerSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  partnerCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  partnerHeader: {
    marginBottom: 20,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  partnerVehicle: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Rating
  ratingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  starButton: {
    padding: 8,
  },
  star: {
    fontSize: 40,
    color: '#d1d5db',
  },
  starSelected: {
    color: '#fbbf24',
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '500',
  },

  // Success Message
  successMessage: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  successEmoji: {
    fontSize: 20,
  },
  successText: {
    fontSize: 14,
    color: '#047857',
    fontWeight: '500',
  },

  // Submitting
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  submittingText: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Link Button
  linkButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },

  // Next Steps
  nextStepsSection: {
    marginBottom: 24,
  },
  stepCard: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 8,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Support
  supportSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  supportText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Buttons
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
