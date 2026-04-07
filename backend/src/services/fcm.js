import https from 'https';
import logger from '../utils/logger.js';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;

if (!FIREBASE_PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID is not configured');
}
if (!FIREBASE_PRIVATE_KEY) {
  throw new Error('FIREBASE_PRIVATE_KEY is not configured');
}
if (!FIREBASE_CLIENT_EMAIL) {
  throw new Error('FIREBASE_CLIENT_EMAIL is not configured');
}

let accessToken = null;
let tokenExpiry = null;

/**
 * Get Firebase access token (with caching).
 * @private
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const crypto = await import('crypto');
    const jwt = await import('jsonwebtoken');

    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600;

    const payload = {
      iss: FIREBASE_CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expiry,
      iat: now,
    };

    const token = jwt.default.sign(payload, FIREBASE_PRIVATE_KEY, {
      algorithm: 'RS256',
    });

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    }).toString();

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
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
            if (responseData.access_token) {
              accessToken = responseData.access_token;
              tokenExpiry = Date.now() + (responseData.expires_in * 1000);
              resolve(accessToken);
            } else {
              reject(new Error('No access token in response'));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  } catch (err) {
    logger.error('Failed to get Firebase access token', { error: err.message });
    throw err;
  }
}

/**
 * Send FCM message.
 * @param {string} token - Device token
 * @param {Object} notification - Notification data
 * @param {Object} data - Custom data payload
 * @param {Object} options - Additional options (priority, etc.)
 * @returns {Promise<Object>} FCM response
 */
async function sendMessage(token, notification, data = {}, options = {}) {
  try {
    const accessToken = await getAccessToken();

    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data,
      webpush: {
        priority: options.priority || 'normal',
      },
      android: {
        priority: options.priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: options.sound || 'default',
          channelId: options.channelId || 'nearby_notifications',
        },
      },
      apns: {
        headers: {
          'apns-priority': options.priority === 'high' ? '10' : '5',
        },
        payload: {
          aps: {
            sound: options.sound || 'default',
          },
        },
      },
    };

    const body = JSON.stringify({ message });

    return new Promise((resolve, reject) => {
      const url = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;
      const options_https = {
        hostname: 'fcm.googleapis.com',
        path: `/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options_https, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          try {
            const responseData = JSON.parse(responseBody);
            if (res.statusCode >= 400) {
              reject(new Error(responseData.error?.message || 'FCM error'));
            } else {
              resolve(responseData);
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  } catch (err) {
    logger.error('Failed to send FCM message', { error: err.message, token: maskToken(token) });
    throw err;
  }
}

/**
 * Send FCM notification with high priority (for critical alerts).
 * @param {string} token - Device token
 * @param {Object} notification - Notification data
 * @param {Object} data - Custom data payload
 * @returns {Promise<Object>} FCM response
 */
async function sendHighPriorityNotification(token, notification, data = {}) {
  return sendMessage(token, notification, data, { priority: 'high', sound: 'default' });
}

/**
 * Mask token for logging.
 * @private
 * @param {string} token - Device token
 * @returns {string} Masked token
 */
function maskToken(token) {
  if (!token || token.length < 10) {
    return '***';
  }
  return `${token.slice(0, 5)}...${token.slice(-5)}`;
}

export { sendMessage, sendHighPriorityNotification };
