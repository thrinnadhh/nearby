import https from 'https';
import logger from '../utils/logger.js';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox';

if (!CASHFREE_APP_ID) {
  throw new Error('CASHFREE_APP_ID is not configured');
}
if (!CASHFREE_SECRET_KEY) {
  throw new Error('CASHFREE_SECRET_KEY is not configured');
}

const BASE_URL = CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com'
  : 'https://sandbox.cashfree.com';

/**
 * Make HTTP request to Cashfree API.
 * @private
 * @param {string} method - HTTP method
 * @param {string} path - API endpoint path
 * @param {Object} data - Request body
 * @returns {Promise<Object>} API response
 */
async function request(method, path, data = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const body = method !== 'GET' ? JSON.stringify(data) : '';

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
      },
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        try {
          const responseData = JSON.parse(responseBody);
          if (res.statusCode >= 400) {
            const error = new Error(responseData.message || 'Cashfree API error');
            error.statusCode = res.statusCode;
            error.response = responseData;
            reject(error);
          } else {
            resolve(responseData);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

/**
 * Create payment session (for Cashfree Webcheckout).
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} Session response
 */
async function createPaymentSession(paymentData) {
  try {
    const response = await request('POST', '/pg/orders', paymentData);
    logger.info('Cashfree payment session created', {
      orderId: paymentData.order_id,
      amount: paymentData.order_amount,
    });
    return response;
  } catch (err) {
    logger.error('Failed to create Cashfree payment session', {
      error: err.message,
      orderId: paymentData.order_id,
    });
    throw err;
  }
}

/**
 * Verify payment status for an order.
 * @param {string} orderId - NearBy order ID
 * @returns {Promise<Object>} Payment status
 */
async function getPaymentStatus(orderId) {
  try {
    const response = await request('GET', `/pg/orders/${orderId}`);
    logger.debug('Fetched Cashfree payment status', { orderId });
    return response;
  } catch (err) {
    logger.error('Failed to fetch Cashfree payment status', {
      error: err.message,
      orderId,
    });
    throw err;
  }
}

/**
 * Refund a payment.
 * @param {string} paymentId - Cashfree payment ID
 * @param {number} amount - Refund amount in paise
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>} Refund response
 */
async function refundPayment(paymentId, amount, reason = 'customer_request') {
  try {
    const response = await request('POST', `/pg/payments/${paymentId}/refunds`, {
      refund_amount: amount / 100, // Convert to rupees
      refund_note: reason,
    });
    logger.info('Cashfree refund initiated', {
      paymentId,
      amount: amount / 100,
      reason,
    });
    return response;
  } catch (err) {
    logger.error('Failed to refund Cashfree payment', {
      error: err.message,
      paymentId,
    });
    throw err;
  }
}

/**
 * Split payment between NearBy and shop.
 * @param {string} paymentId - Cashfree payment ID
 * @param {Array} splits - Array of split configurations
 * @returns {Promise<Object>} Split response
 */
async function createPaymentSplit(paymentId, splits) {
  try {
    const response = await request('POST', `/pg/payments/${paymentId}/splits`, {
      splits,
    });
    logger.info('Cashfree payment split configured', { paymentId, splits });
    return response;
  } catch (err) {
    logger.error('Failed to create Cashfree payment split', {
      error: err.message,
      paymentId,
    });
    throw err;
  }
}

export {
  createPaymentSession,
  getPaymentStatus,
  refundPayment,
  createPaymentSplit,
};
