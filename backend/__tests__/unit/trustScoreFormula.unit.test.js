import {
  calculateTrustScore,
  getTrustBadge,
  shouldAlertAdmin,
  validateMetrics,
  formatTrustScore,
} from '../../src/utils/trustScoreFormula.js';

describe('trustScoreFormula', () => {
  describe('calculateTrustScore', () => {
    it('should return 0 for no metrics', () => {
      const score = calculateTrustScore(0, 0, 0, false);
      expect(score).toBe(0);
    });

    it('should return 100 for perfect metrics', () => {
      const score = calculateTrustScore(5, 100, 100, true);
      expect(score).toBeGreaterThan(95); // Close to 100
    });

    it('should weight avg_rating at 40%', () => {
      const scoreWith5Rating = calculateTrustScore(5, 0, 0, false);
      const scoreWith1Rating = calculateTrustScore(1, 0, 0, false);
      expect(scoreWith5Rating).toBeGreaterThan(scoreWith1Rating);
    });

    it('should weight completion_rate at 35%', () => {
      const scoreWith100Completion = calculateTrustScore(0, 100, 0, false);
      const scoreWith0Completion = calculateTrustScore(0, 0, 0, false);
      expect(scoreWith100Completion).toBeGreaterThan(scoreWith0Completion);
    });

    it('should weight response_score at 15%', () => {
      const scoreWith100Response = calculateTrustScore(0, 0, 100, false);
      const scoreWith0Response = calculateTrustScore(0, 0, 0, false);
      expect(scoreWith100Response).toBeGreaterThan(scoreWith0Response);
    });

    it('should add 10% bonus for KYC verified', () => {
      const scoreWithKyc = calculateTrustScore(0, 0, 0, true);
      const scoreWithoutKyc = calculateTrustScore(0, 0, 0, false);
      expect(scoreWithKyc).toBeGreaterThan(scoreWithoutKyc);
      expect(scoreWithKyc - scoreWithoutKyc).toBeCloseTo(10, 1);
    });

    it('should clamp result to 0–100', () => {
      const score = calculateTrustScore(5, 150, 150, true);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTrustBadge', () => {
    it('should return trusted for score >= 80', () => {
      expect(getTrustBadge(80)).toBe('trusted');
      expect(getTrustBadge(95)).toBe('trusted');
      expect(getTrustBadge(100)).toBe('trusted');
    });

    it('should return good for score 60–79', () => {
      expect(getTrustBadge(60)).toBe('good');
      expect(getTrustBadge(75)).toBe('good');
      expect(getTrustBadge(79)).toBe('good');
    });

    it('should return new for score 40–59', () => {
      expect(getTrustBadge(40)).toBe('new');
      expect(getTrustBadge(50)).toBe('new');
      expect(getTrustBadge(59)).toBe('new');
    });

    it('should return review for score < 40', () => {
      expect(getTrustBadge(0)).toBe('review');
      expect(getTrustBadge(20)).toBe('review');
      expect(getTrustBadge(39)).toBe('review');
    });
  });

  describe('shouldAlertAdmin', () => {
    it('should return true for score < 40', () => {
      expect(shouldAlertAdmin(0)).toBe(true);
      expect(shouldAlertAdmin(39)).toBe(true);
    });

    it('should return false for score >= 40', () => {
      expect(shouldAlertAdmin(40)).toBe(false);
      expect(shouldAlertAdmin(50)).toBe(false);
      expect(shouldAlertAdmin(100)).toBe(false);
    });
  });

  describe('validateMetrics', () => {
    it('should validate correct metrics', () => {
      const result = validateMetrics({
        avgRating: 3.5,
        completionRate: 85,
        responseScore: 75,
        kycVerified: true,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid avgRating', () => {
      const result = validateMetrics({ avgRating: 6 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid completionRate', () => {
      const result = validateMetrics({ completionRate: 150 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid kycVerified', () => {
      const result = validateMetrics({ kycVerified: 'yes' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('formatTrustScore', () => {
    it('should round to 2 decimals', () => {
      const result = formatTrustScore(75.5555);
      expect(result.score).toBeCloseTo(75.56, 2);
    });

    it('should include correct badge', () => {
      const result = formatTrustScore(85);
      expect(result.badge).toBe('trusted');
    });

    it('should format multiple trust scores', () => {
      const r1 = formatTrustScore(25);
      const r2 = formatTrustScore(45);
      const r3 = formatTrustScore(65);
      const r4 = formatTrustScore(85);

      expect(r1.badge).toBe('review');
      expect(r2.badge).toBe('new');
      expect(r3.badge).toBe('good');
      expect(r4.badge).toBe('trusted');
    });
  });
});
