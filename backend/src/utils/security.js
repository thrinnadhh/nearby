/**
 * Security utility functions for NearBy admin APIs
 * Includes PII masking and data protection helpers
 */

/**
 * Masks sensitive phone numbers to show only last 4 digits
 * Example: +919876543210 → +91****3210
 * 
 * @param {string} phone - Full phone number
 * @returns {string} Masked phone number or 'N/A' if empty
 */
export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return 'N/A';
  }

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Return masked format if we have at least 4 digits
  if (digits.length >= 4) {
    return `+91****${digits.slice(-4)}`;
  }
  
  // Return N/A if phone is too short
  return 'N/A';
};

/**
 * Masks Aadhaar numbers to show only last 7 digits
 * Example: 123456789012 → ****789012
 */
export const maskAadhaar = (aadhaar) => {
  if (!aadhaar || typeof aadhaar !== 'string') {
    return 'N/A';
  }
  
  const digits = aadhaar.replace(/\D/g, '');
  
  if (digits.length >= 7) {
    return `****${digits.slice(-7)}`;
  }
  
  return 'N/A';
};

/**
 * Masks bank account numbers to show only last 4 digits
 * Example: 12345678901234 → ****1234
 */
export const maskBankAccount = (account) => {
  if (!account || typeof account !== 'string') {
    return 'N/A';
  }
  
  const digits = account.replace(/\D/g, '');
  
  if (digits.length >= 4) {
    return `****${digits.slice(-4)}`;
  }
  
  return 'N/A';
};
