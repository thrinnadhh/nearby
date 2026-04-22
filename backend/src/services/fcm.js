import https from 'https';
import logger from '../utils/logger.js';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;

let accessToken = null;
let tokenExpiry = null;

/**
 * Validate Firebase configuration.
 * @private
 * @throws {Error} If configuration is missing
 */
function validateConfig() {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_PROJECT_ID is not configured');
  }
  if (!FIREBASE_PRIVATE_KEY) {
    throw new Error('FIREBASE_PRIVATE_KEY is not configured');
  }
  if (!FIREBASE_CLIENT_EMAIL) {
    throw new Error('FIREBASE_CLIENT_EMAIL is not configured');
  }
}

/**
 * Get Firebase access token (with caching).
 * @private
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  validateConfig();
  
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
 * Send notification via token or topic.
 * @param {Object} options - Options object
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {string} options.topic - FCM topic (optional, if not using token)
 * @param {string} options.token - Device token (optional, if not using topic)
 * @param {Object} options.data - Custom data payload (optional)
 * @param {string} options.priority - high or normal (optional)
 * @returns {Promise<Object>} FCM response
 */
async function sendNotification(options) {
  validateConfig();
  
  const { title, body, topic, token, data = {}, priority = 'normal' } = options;
  
  if (!title || !body) {
    throw new Error('title and body are required');
  }
  
  if (!token && !topic) {
    throw new Error('Either token or topic is required');
  }
  
  try {
    const accessToken = await getAccessToken();
    
    const notification = { title, body };
    let messageObj;
    
    if (topic) {
      messageObj = {
        topic,
        notification,
        data,
        webpush: { priority: priority === 'high' ? 'high' : 'normal' },
        android: {
          priority: priority === 'high' ? 'high' : 'normal',
          notification: { sound: 'default', channelId: 'nearby_notifications' }
        },
        apns: {
          headers: { 'apns-priority': priority === 'high' ? '10' : '5' },
          payload: { aps: { sound: 'default' } }
        }
      };
    } else {
      messageObj = {
        token,
        notification,
        data,
        webpush: { priority: priority === 'high' ? 'high' : 'normal' },
        android: {
          priority: priority === 'high' ? 'high' : 'normal',
          notification: { sound: 'default', channelId: 'nearby_notifications' }
        },
        apns: {
          headers: { 'apns-priority': priority === 'high' ? '10' : '5' },
          payload: { aps: { sound: 'default' } }
        }
      };
    }
    
    const body_str = JSON.stringify({ message: messageObj });
    
    return new Promise((resolve, reject) => {
      const options_https = {
        hostname: 'fcm.googleapis.com',
        path: `/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body_str),
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
      req.write(body_str);
      req.end();
    });
  } catch (err) {
    logger.error('Failed to send FCM notification', { error: err.message });
    throw err;
  }
}

/**
 * Send message with high priority.
 * @param {Object} options - Same as sendNotification
 * @returns {Promise<Object>} FCM response
 */
async function sendHighPriorityNotification(options) {
  return sendNotification({ ...options, priority: 'high' });
}

export const fcm = {
  sendNotification,
  sendHighPriorityNotification
};

export { sendNotification, sendHighPriorityNotification };
