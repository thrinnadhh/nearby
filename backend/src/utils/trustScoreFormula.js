import logger from './logger.js';

/**
 * Trust Score Formula for NearBy shops
 * Score: 0–100, higher = more trustworthy
 *
 * Components:
 *   - avgRating (40%): Average review rating (1–5 stars)
 *   - completionRate (35%): % of orders completed (0–100%)
 *   - responseScore (15%): Acceptance time responsiveness (0–100%)
 *   - kycBonus (10%): Extra points for verified KYC
 *
 * Badges:
 *   - Trusted: 80+
 *   - Good: 60–79
 *   - New: 40–59
 *   - Review: <40
 */

const WEIGHTS = {
  avgRating: 0.40,
  completionRate: 0.35,
  responseScore: 0.15,
  kycBonus: 0.10,
};

const BADGE_THRESHOLDS = {
  TRUSTED: 80,
  GOOD: 60,
  NEW: 40,
  REVIEW: 0,
};

/**
 * Normalize a component to 0–100 scale
 * @param {number} value - Raw component value
 * @param {number} max - Maximum expected value (1 for rating, 100 for %, etc.)
 * @returns {number} Normalized score (0–100)
 */
function normalizeComponent(value, max) {
  if (!Number.isFinite(value)) return 0;
  const normalized = (value / max) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Calculate trust score from metrics
 * @param {number} avgRating - Average rating 1–5 (default 0 if no reviews)
 * @param {number} completionRate - % of orders completed (0–100)
 * @param {number} responseScore - Responsiveness metric (0–100)
 * @param {boolean} kycVerified - Whether KYC is verified
 * @returns {number} Trust score 0–100
 */
export function calculateTrustScore(
  avgRating = 0,
  completionRate = 0,
  responseScore = 0,
  kycVerified = false
) {
  // Normalize components to 0–100 scale
  const ratingScore = normalizeComponent(avgRating, 5);
  const completionScore = Math.max(0, Math.min(100, completionRate || 0));
  const responsiveScore = Math.max(0, Math.min(100, responseScore || 0));
  const kyc = kycVerified ? 100 : 0;

  // Weighted sum
  const totalScore
    = (ratingScore * WEIGHTS.avgRating)
    + (completionScore * WEIGHTS.completionRate)
    + (responsiveScore * WEIGHTS.responseScore)
    + (kyc * WEIGHTS.kycBonus);

  // Clamp to 0–100
  return Math.max(0, Math.min(100, totalScore));
}

/**
 * Get badge string for a given trust score
 * @param {number} trustScore - Trust score 0–100
 * @returns {string} Badge name: 'trusted', 'good', 'new', or 'review'
 */
export function getTrustBadge(trustScore) {
  if (trustScore >= BADGE_THRESHOLDS.TRUSTED) return 'trusted';
  if (trustScore >= BADGE_THRESHOLDS.GOOD) return 'good';
  if (trustScore >= BADGE_THRESHOLDS.NEW) return 'new';
  return 'review';
}

/**
 * Check if a trust score warrants an admin alert
 * @param {number} trustScore - Trust score 0–100
 * @returns {boolean} True if below 40 (review threshold)
 */
export function shouldAlertAdmin(trustScore) {
  return trustScore < BADGE_THRESHOLDS.NEW;
}

/**
 * Validate score components (used in testing and job execution)
 * @param {Object} metrics - { avgRating, completionRate, responseScore, kycVerified }
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateMetrics(metrics) {
  const errors = [];

  if (metrics.avgRating !== undefined) {
    if (!Number.isFinite(metrics.avgRating) || metrics.avgRating < 0 || metrics.avgRating > 5) {
      errors.push('avgRating must be 0–5');
    }
  }

  if (metrics.completionRate !== undefined) {
    if (!Number.isFinite(metrics.completionRate) || metrics.completionRate < 0 || metrics.completionRate > 100) {
      errors.push('completionRate must be 0–100');
    }
  }

  if (metrics.responseScore !== undefined) {
    if (!Number.isFinite(metrics.responseScore) || metrics.responseScore < 0 || metrics.responseScore > 100) {
      errors.push('responseScore must be 0–100');
    }
  }

  if (metrics.kycVerified !== undefined && typeof metrics.kycVerified !== 'boolean') {
    errors.push('kycVerified must be boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format trust score for API response (round to 2 decimals, include badge)
 * @param {number} rawScore - Raw trust score
 * @returns {Object} { score: number, badge: string }
 */
export function formatTrustScore(rawScore) {
  const score = Math.round(rawScore * 100) / 100; // Round to 2 decimals
  return {
    score,
    badge: getTrustBadge(score),
  };
}

logger.info('trustScoreFormula loaded with weights', { WEIGHTS, BADGE_THRESHOLDS });
