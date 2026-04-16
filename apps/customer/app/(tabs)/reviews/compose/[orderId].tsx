import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { submitReview, checkReviewExists } from '@/services/reviews';
import { getOrder } from '@/services/orders';

/**
 * Review Submission Screen (Task 9.5)
 * 
 * Allows customers to rate and review delivery partners after order delivery
 * 
 * Features:
 * - Star rating (1-5) selection
 * - Review text input (optional)
 * - Delivery partner info display
 * - Form validation
 * - Success feedback
 */

const STAR_COUNT = 5;

export default function ReviewSubmissionScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { token } = useAuthStore();

  // State
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  // Form state
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch order and check if already reviewed
  useEffect(() => {
    const fetchOrderAndCheck = async () => {
      try {
        if (!orderId || !token) return;

        const orderData = await getOrder(orderId);
        setOrder(orderData);

        // Check if already reviewed
        try {
          // Check endpoint - backend should have this
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/api/v1/orders/${orderId}/review-check`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await response.json();
          if (data.data?.hasReviewed) {
            setHasReviewed(true);
          }
        } catch (err) {
          // If endpoint doesn't exist, allow review submission
          console.log('Review check endpoint not available');
        }

        setError(null);
      } catch (err: any) {
        const message = err?.message || 'Failed to load order';
        setError(message);
        console.error('Order fetch error:', message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderAndCheck();
  }, [orderId, token]);

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    setFormError(null);
  };

  const handleReviewTextChange = (text: string) => {
    setReviewText(text);
    if (text.length <= 500) {
      setFormError(null);
    }
  };

  const validateForm = (): boolean => {
    if (rating === 0) {
      setFormError('Please select a rating');
      return false;
    }

    if (reviewText.length > 500) {
      setFormError('Review must be 500 characters or less');
      return false;
    }

    return true;
  };

  const handleSubmitReview = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (!orderId || !order?.delivery_partner?.id) {
        throw new Error('Missing order or delivery partner information');
      }

      await submitReview({
        order_id: orderId,
        reviewed_user_id: order.delivery_partner.id,
        rating,
        review_text: reviewText || undefined,
      });

      Alert.alert(
        'Review Submitted',
        'Thank you for your feedback!',
        [
          {
            text: 'Done',
            onPress: () => {
              router.replace('/(tabs)/home');
            },
          },
        ]
      );
    } catch (err: any) {
      const message = err?.message || 'Failed to submit review';
      setFormError(message);
      console.error('Review submission error:', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.errorCard}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Unable to Load Order</Text>
            <Text style={styles.errorMessage}>{error || 'Order not found'}</Text>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => {
                setError(null);
                setIsLoading(true);
              }}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (hasReviewed) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.alreadyReviewedCard}>
            <Text style={styles.alreadyReviewedEmoji}>✓</Text>
            <Text style={styles.alreadyReviewedTitle}>Already Reviewed</Text>
            <Text style={styles.alreadyReviewedMessage}>
              You've already submitted a review for this order. Thank you for your feedback!
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.replace('/(tabs)/home')}
            >
              <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Rate Your Delivery</Text>
            <Text style={styles.headerSubtitle}>Help us improve the service</Text>
          </View>

          {/* Delivery Partner Info */}
          {order?.delivery_partner && (
            <View style={styles.partnerCard}>
              <Text style={styles.partnerLabel}>Delivery Partner</Text>
              <View style={styles.partnerInfo}>
                <View style={styles.partnerDetails}>
                  <Text style={styles.partnerName}>{order.delivery_partner.name}</Text>
                  <Text style={styles.partnerVehicle}>
                    🚗 {order.delivery_partner.vehicle_type}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Rating Selection */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>How would you rate this delivery?</Text>
            <View style={styles.starsContainer}>
              {Array.from({ length: STAR_COUNT }).map((_, index) => {
                const starRating = index + 1;
                const isSelected = starRating <= rating;

                return (
                  <TouchableOpacity
                    key={starRating}
                    style={styles.starButton}
                    onPress={() => handleRatingChange(starRating)}
                  >
                    <Text style={[styles.star, isSelected && styles.starSelected]}>
                      {isSelected ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Rating Labels */}
            {rating > 0 && (
              <Text style={styles.ratingLabel}>
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </Text>
            )}
          </View>

          {/* Review Text Input */}
          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>Additional Feedback (Optional)</Text>
            <Text style={styles.sectionSubtitle}>
              Share more details about your experience
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="What was your experience like?"
              placeholderTextColor="#9ca3af"
              value={reviewText}
              onChangeText={handleReviewTextChange}
              multiline
              numberOfLines={5}
              maxLength={500}
              editable={!isSubmitting}
            />

            <Text
              style={[
                styles.charCount,
                reviewText.length > 450 && styles.charCountWarning,
                reviewText.length > 500 && styles.charCountError,
              ]}
            >
              {reviewText.length}/500
            </Text>
          </View>

          {/* Form Error */}
          {formError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {formError}</Text>
            </View>
          )}

          {/* Review Hints */}
          <View style={styles.hintsSection}>
            <Text style={styles.hintsTitle}>Helpful Tips</Text>
            <HintItem text="Be honest about your experience" />
            <HintItem text="Mention specific things (speed, professionalism, etc.)" />
            <HintItem text="Keep feedback constructive and respectful" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Text style={styles.secondaryButtonText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmitReview}
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Helper component for hints
function HintItem({ text }: { text: string }) {
  return (
    <View style={styles.hintItem}>
      <Text style={styles.hintBullet}>•</Text>
      <Text style={styles.hintText}>{text}</Text>
    </View>
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

  // Error card
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

  // Already reviewed card
  alreadyReviewedCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dcfce7',
    marginVertical: 24,
  },
  alreadyReviewedEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  alreadyReviewedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 8,
  },
  alreadyReviewedMessage: {
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Header
  header: {
    marginBottom: 24,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Partner card
  partnerCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  partnerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  partnerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerDetails: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803d',
  },
  partnerVehicle: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 4,
  },

  // Rating section
  ratingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
  },
  star: {
    fontSize: 40,
    color: '#9ca3af',
  },
  starSelected: {
    color: '#fbbf24',
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 8,
  },

  // Review text input
  reviewSection: {
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
    textAlignVertical: 'top',
    minHeight: 120,
    maxHeight: 180,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'right',
  },
  charCountWarning: {
    color: '#f59e0b',
  },
  charCountError: {
    color: '#ef4444',
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },

  // Hints section
  hintsSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
    marginBottom: 20,
  },
  hintsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 10,
  },
  hintItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  hintBullet: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: 'bold',
  },
  hintText: {
    fontSize: 13,
    color: '#1e40af',
    flex: 1,
  },

  // Footer buttons
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
});
