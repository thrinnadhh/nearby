/**
 * Phone Number Validation Utilities
 * Handles India-specific phone number formats (+91, with/without country code)
 */
/**
 * Validates if a phone number is in valid Indian format
 * Accepts: 10 digits (9876543210) or 11 digits with +91 prefix (+919876543210)
 */
export function isValidIndianPhone(phone) {
    if (!phone)
        return false;
    // Remove whitespace
    const cleaned = phone.trim();
    // Check if it's 10 digits
    if (/^\d{10}$/.test(cleaned)) {
        return true;
    }
    // Check if it's +91 followed by 10 digits
    if (/^\+91\d{10}$/.test(cleaned)) {
        return true;
    }
    // Check if it's 91 followed by 10 digits (no plus sign)
    if (/^91\d{10}$/.test(cleaned)) {
        return true;
    }
    return false;
}
/**
 * Normalizes phone number to +91 format
 * Input: "9876543210" or "+919876543210" or "919876543210"
 * Output: "+919876543210"
 */
export function normalizePhoneNumber(phone) {
    const cleaned = phone.trim();
    // Already in +91 format
    if (cleaned.startsWith('+91')) {
        return cleaned;
    }
    // Remove leading 91 if present
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        return `+${cleaned}`;
    }
    // Just 10 digits
    if (/^\d{10}$/.test(cleaned)) {
        return `+91${cleaned}`;
    }
    // Fallback: prepend +91
    return `+91${cleaned.replace(/\D/g, '').slice(-10)}`;
}
/**
 * Formats phone number for display
 * Input: "+919876543210"
 * Output: "9876543210" or "+91 98765 43210"
 */
export function formatPhoneForDisplay(phone, format = 'short') {
    const cleaned = phone.replace(/\D/g, '');
    const last10 = cleaned.slice(-10);
    if (format === 'short') {
        return last10;
    }
    // format === 'display'
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
}
/**
 * Extracts 10-digit phone from any format
 * Used for API calls that expect the phone without country code
 */
export function extract10DigitPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.slice(-10);
}
/**
 * Validates phone input field
 * Returns error message if invalid, empty string if valid
 */
export function getPhoneValidationError(phone) {
    if (!phone) {
        return 'Phone number is required';
    }
    if (phone.length < 10) {
        return 'Phone number must be at least 10 digits';
    }
    if (!isValidIndianPhone(phone)) {
        return 'Please enter a valid Indian phone number';
    }
    return '';
}
//# sourceMappingURL=phoneValidator.js.map