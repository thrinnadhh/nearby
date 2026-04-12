/**
 * Business rule constants for NearBy platform.
 * All financial rates and thresholds are read from env first, falling back to defaults.
 */

/** NearBy platform commission rate (fraction). Default 8% = 0.08 */
export const NEARBY_COMMISSION_RATE = parseFloat(process.env.NEARBY_COMMISSION_RATE ?? '0.08');

/** Minimum trust score before admin alert is triggered */
export const TRUST_SCORE_ALERT_THRESHOLD = 40;

/** Order auto-cancel window in milliseconds (3 minutes) */
export const ORDER_AUTO_CANCEL_MS = 3 * 60 * 1000;

/** Default delivery search radius in metres */
export const DELIVERY_SEARCH_RADIUS_M = 5000;

/** Review prompt delay after delivery in milliseconds (2 minutes) */
export const REVIEW_PROMPT_DELAY_MS = 2 * 60 * 1000;
