/**
 * Phone Number Validation Utilities
 * Handles India-specific phone number formats (+91, with/without country code)
 */
/**
 * Validates if a phone number is in valid Indian format
 * Accepts: 10 digits (9876543210) or 11 digits with +91 prefix (+919876543210)
 */
export declare function isValidIndianPhone(phone: string): boolean;
/**
 * Normalizes phone number to +91 format
 * Input: "9876543210" or "+919876543210" or "919876543210"
 * Output: "+919876543210"
 */
export declare function normalizePhoneNumber(phone: string): string;
/**
 * Formats phone number for display
 * Input: "+919876543210"
 * Output: "9876543210" or "+91 98765 43210"
 */
export declare function formatPhoneForDisplay(phone: string, format?: 'short' | 'display'): string;
/**
 * Extracts 10-digit phone from any format
 * Used for API calls that expect the phone without country code
 */
export declare function extract10DigitPhone(phone: string): string;
/**
 * Validates phone input field
 * Returns error message if invalid, empty string if valid
 */
export declare function getPhoneValidationError(phone: string): string;
//# sourceMappingURL=phoneValidator.d.ts.map