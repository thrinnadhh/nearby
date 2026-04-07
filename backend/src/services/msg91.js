import https from 'https';
import logger from '../utils/logger.js';

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'NEARBY';

if (!MSG91_AUTH_KEY) {
  throw new Error('MSG91_AUTH_KEY is not configured');
}

/**
 * Send SMS via MSG91.
 * @private
 * @param {string} phone - Phone number with country code (e.g., '+919876543210')
 * @param {string} message - SMS content (max 160 chars)
 * @returns {Promise<Object>} API response
 */
async function sendSms(phone, message) {
  return new Promise((resolve, reject) => {
    // Extract phone number without '+' prefix
    const phoneNumber = phone.replace(/\D/g, '');

    const path = `/api/sms/send?authkey=${MSG91_AUTH_KEY}&route=4&sender=${MSG91_SENDER_ID}&mobile=${phoneNumber}&message=${encodeURIComponent(message)}`;

    const options = {
      hostname: 'api.msg91.com',
      path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        try {
          const responseData = JSON.parse(responseBody);
          resolve(responseData);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Send OTP to phone number.
 * @param {string} phone - Phone number with country code
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<void>}
 */
async function sendOtp(phone, otp) {
  try {
    const message = `Your NearBy OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`;
    const response = await sendSms(phone, message);

    logger.info('OTP sent via MSG91', { phone: maskPhone(phone) });
    return response;
  } catch (err) {
    logger.error('Failed to send OTP via MSG91', {
      error: err.message,
      phone: maskPhone(phone),
    });
    throw err;
  }
}

/**
 * Send SMS notification.
 * @param {string} phone - Phone number with country code
 * @param {string} message - SMS content
 * @returns {Promise<void>}
 */
async function sendNotification(phone, message) {
  try {
    const response = await sendSms(phone, message);
    logger.info('SMS notification sent via MSG91', { phone: maskPhone(phone) });
    return response;
  } catch (err) {
    logger.error('Failed to send SMS notification via MSG91', {
      error: err.message,
      phone: maskPhone(phone),
    });
    throw err;
  }
}

/**
 * Mask phone number for logging (show only last 4 digits).
 * @private
 * @param {string} phone - Phone number
 * @returns {string} Masked phone number
 */
function maskPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return `+91****${digits.slice(-4)}`;
}

export { sendOtp, sendNotification };
