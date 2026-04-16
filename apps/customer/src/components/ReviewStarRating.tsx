/**
 * ReviewStarRating Component (Task 10.5)
 * 5-star rating interface with tap feedback
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '@/constants/theme';

interface ReviewStarRatingProps {
  rating: number; // 0-5 stars selected
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
}

export function ReviewStarRating({
  rating,
  onRatingChange,
  disabled = false,
}: ReviewStarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const displayRating = hoveredRating !== null ? hoveredRating : rating;

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          disabled={disabled}
          onPress={() => onRatingChange(star)}
          onPressIn={() => setHoveredRating(star)}
          onPressOut={() => setHoveredRating(null)}
          activeOpacity={0.7}
          style={styles.starButton}
        >
          <MaterialCommunityIcons
            name={star <= displayRating ? 'star' : 'star-outline'}
            size={40}
            color={star <= displayRating ? colors.warning : colors.border}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },

  starButton: {
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
