import https from 'https';
import { EventEmitter } from 'events';

// Set required env vars before importing the module
process.env.CASHFREE_APP_ID = 'test_app_id_service';
process.env.CASHFREE_SECRET_KEY = 'test_secret_key_service';
process.env.CASHFREE_ENV = 'sandbox';

jest.mock('https');
jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

let createPaymentSession, getPaymentStatus, refundPayment, createPaymentSplit;

/**
 * Mock https.request with specified status code and response body
 */
function mockHttpsRequest(statusCode, responseBody) {
  const resEmitter = new EventEmitter();
  resEmitter.statusCode = statusCode;

  const reqEmitter = new EventEmitter();
  reqEmitter.write = jest.fn();
  reqEmitter.end = jest.fn(() => {
    process.nextTick(() => {
      resEmitter.emit('data', JSON.stringify(responseBody));
      resEmitter.emit('end');
    });
  });

  https.request.mockImplementation((_options, callback) => {
    process.nextTick(() => callback(resEmitter));
    return reqEmitter;
  });
}

/**
 * Mock https.request with network error
 */
function mockHttpsRequestError(errorMessage) {
  const reqEmitter = new EventEmitter();
  reqEmitter.write = jest.fn();
  reqEmitter.end = jest.fn(() => {
    process.nextTick(() => reqEmitter.emit('error', new Error(errorMessage)));
  });

  https.request.mockImplementation(() => reqEmitter);
}

beforeAll(async () => {
  const module = await import('../../services/cashfree.js');
  createPaymentSession = module.createPaymentSession;
  getPaymentStatus = module.getPaymentStatus;
  refundPayment = module.refundPayment;
  createPaymentSplit = module.createPaymentSplit;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Cashfree Service Unit Tests', () => {
  describe('createPaymentSession', () => {
    it('should resolve with session response on success (200)', async () => {
      const mockResponse = {
        payment_session_id: 'session_abc_123',
        payment_link: 'https://checkout.cashfree.com/session_abc_123',
        order_id: 'nearby-order-001',
      };
      mockHttpsRequest(200, mockResponse);

      const result = await createPaymentSession({
        order_id: 'nearby-order-001',
        order_amount: 500,
        order_currency: 'INR',
        customer_details: {
          customer_id: 'cust_123',
          customer_phone: '9999999999',
          customer_email: 'user@example.com',
        },
      });

      expect(result).toEqual(mockResponse);
      expect(result.payment_session_id).toBe('session_abc_123');
    });

    it('should reject with error message when Cashfree returns 400 (bad request)', async () => {
      mockHttpsRequest(400, { message: 'Invalid order amount' });

      await expect(
        createPaymentSession({ order_id: 'bad_order', order_amount: -100 })
      ).rejects.toThrow('Invalid order amount');
    });

    it('should reject with error message when Cashfree returns 401 (unauthorized)', async () => {
      mockHttpsRequest(401, { message: 'Invalid API credentials' });

      await expect(
        createPaymentSession({ order_id: 'order_123', order_amount: 100 })
      ).rejects.toThrow('Invalid API credentials');
    });

    it('should reject with error message when Cashfree returns 422 (validation error)', async () => {
      mockHttpsRequest(422, { message: 'Order already exists' });

      await expect(
        createPaymentSession({ order_id: 'existing_order', order_amount: 100 })
      ).rejects.toThrow('Order already exists');
    });

    it('should reject with error message when Cashfree returns 500 (server error)', async () => {
      mockHttpsRequest(500, { message: 'Internal server error' });

      await expect(
        createPaymentSession({ order_id: 'order_123', order_amount: 100 })
      ).rejects.toThrow('Internal server error');
    });

    it('should reject with network error (ECONNREFUSED)', async () => {
      mockHttpsRequestError('ECONNREFUSED');

      await expect(
        createPaymentSession({ order_id: 'order_net_err', order_amount: 100 })
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('should reject with network error (ETIMEDOUT)', async () => {
      mockHttpsRequestError('ETIMEDOUT');

      await expect(
        createPaymentSession({ order_id: 'order_timeout', order_amount: 100 })
      ).rejects.toThrow('ETIMEDOUT');
    });

    it('should reject with network error (ENOTFOUND)', async () => {
      mockHttpsRequestError('ENOTFOUND');

      await expect(
        createPaymentSession({ order_id: 'order_dns', order_amount: 100 })
      ).rejects.toThrow('ENOTFOUND');
    });

    it('should include required headers in request (x-client-id, x-client-secret, x-api-version)', async () => {
      mockHttpsRequest(200, { payment_session_id: 'session_headers' });

      await createPaymentSession({
        order_id: 'order_123',
        order_amount: 100,
      });

      expect(https.request).toHaveBeenCalled();
      const options = https.request.mock.calls[0][0];
      expect(options.headers['x-client-id']).toBe('test_app_id_service');
      expect(options.headers['x-client-secret']).toBe('test_secret_key_service');
      expect(options.headers['x-api-version']).toBe('2023-08-01');
    });

    it('should use correct API endpoint (POST /pg/orders)', async () => {
      mockHttpsRequest(200, { payment_session_id: 'session_endpoint' });

      await createPaymentSession({
        order_id: 'order_endpoint',
        order_amount: 100,
      });

      const options = https.request.mock.calls[0][0];
      expect(options.path).toContain('/pg/orders');
      expect(options.method).toBe('POST');
    });

    it('should construct correct BASE_URL for sandbox environment', async () => {
      mockHttpsRequest(200, { payment_session_id: 'session_sandbox' });

      await createPaymentSession({
        order_id: 'order_sandbox',
        order_amount: 100,
      });

      const options = https.request.mock.calls[0][0];
      expect(options.hostname).toBe('sandbox.cashfree.com');
    });

    it('should send body as JSON with Content-Type and Content-Length', async () => {
      const resEmitter = new EventEmitter();
      resEmitter.statusCode = 200;

      let capturedBody = '';
      const reqEmitter = new EventEmitter();
      reqEmitter.write = jest.fn((body) => {
        capturedBody = body;
      });
      reqEmitter.end = jest.fn(() => {
        process.nextTick(() => {
          resEmitter.emit('data', JSON.stringify({ payment_session_id: 'session_body' }));
          resEmitter.emit('end');
        });
      });

      https.request.mockImplementation((options, callback) => {
        process.nextTick(() => callback(resEmitter));
        return reqEmitter;
      });

      await createPaymentSession({
        order_id: 'order_body',
        order_amount: 100,
      });

      const parsed = JSON.parse(capturedBody);
      expect(parsed.order_id).toBe('order_body');
      expect(parsed.order_amount).toBe(100);
    });
  });

  describe('getPaymentStatus', () => {
    it('should resolve with payment status on success (200)', async () => {
      const mockResponse = {
        order_id: 'nearby-order-001',
        order_status: 'PAID',
        cf_order_id: '123456',
        payment_id: 'pay_abc_123',
      };
      mockHttpsRequest(200, mockResponse);

      const result = await getPaymentStatus('nearby-order-001');

      expect(result).toEqual(mockResponse);
      expect(result.order_status).toBe('PAID');
    });

    it('should reject with error when Cashfree returns 404 (order not found)', async () => {
      mockHttpsRequest(404, { message: 'Order not found' });

      await expect(getPaymentStatus('nonexistent_order')).rejects.toThrow('Order not found');
    });

    it('should reject with error when Cashfree returns 401 (unauthorized)', async () => {
      mockHttpsRequest(401, { message: 'Invalid credentials' });

      await expect(getPaymentStatus('order_auth_fail')).rejects.toThrow('Invalid credentials');
    });

    it('should reject with network error (ETIMEDOUT)', async () => {
      mockHttpsRequestError('ETIMEDOUT');

      await expect(getPaymentStatus('order_timeout')).rejects.toThrow('ETIMEDOUT');
    });

    it('should use correct API endpoint (GET /pg/orders/:orderId)', async () => {
      mockHttpsRequest(200, { order_status: 'PAID' });

      await getPaymentStatus('test_order_123');

      const options = https.request.mock.calls[0][0];
      expect(options.path).toContain('/pg/orders/test_order_123');
      expect(options.method).toBe('GET');
    });

    it('should not send body for GET request', async () => {
      const resEmitter = new EventEmitter();
      resEmitter.statusCode = 200;

      const reqEmitter = new EventEmitter();
      reqEmitter.write = jest.fn();
      reqEmitter.end = jest.fn(() => {
        process.nextTick(() => {
          resEmitter.emit('data', JSON.stringify({ order_status: 'PAID' }));
          resEmitter.emit('end');
        });
      });

      https.request.mockImplementation((options, callback) => {
        process.nextTick(() => callback(resEmitter));
        return reqEmitter;
      });

      await getPaymentStatus('order_get_test');

      expect(reqEmitter.write).not.toHaveBeenCalled();
    });
  });

  describe('refundPayment', () => {
    it('should resolve with refund response on success (200)', async () => {
      const mockResponse = {
        refund_id: 'refund_abc_123',
        refund_status: 'SUCCESS',
        refund_amount: 100,
      };
      mockHttpsRequest(200, mockResponse);

      const result = await refundPayment('pay_123', 10000, 'customer_request');

      expect(result).toEqual(mockResponse);
      expect(result.refund_id).toBe('refund_abc_123');
    });

    it('should convert paise to rupees (10000 paise -> 100 rupees)', async () => {
      let capturedBody = '';
      const resEmitter = new EventEmitter();
      resEmitter.statusCode = 200;

      const reqEmitter = new EventEmitter();
      reqEmitter.write = jest.fn((body) => {
        capturedBody = body;
      });
      reqEmitter.end = jest.fn(() => {
        process.nextTick(() => {
          resEmitter.emit('data', JSON.stringify({ refund_id: 'refund_paise' }));
          resEmitter.emit('end');
        });
      });

      https.request.mockImplementation((options, callback) => {
        process.nextTick(() => callback(resEmitter));
        return reqEmitter;
      });

      await refundPayment('pay_123', 10000);

      const parsed = JSON.parse(capturedBody);
      expect(parsed.refund_amount).toBe(100); // 10000 / 100
    });

    it('should handle paise conversion for various amounts (5000 paise -> 50 rupees)', async () => {
      let capturedBody = '';
      const resEmitter = new EventEmitter();
      resEmitter.statusCode = 200;

      const reqEmitter = new EventEmitter();
      reqEmitter.write = jest.fn((body) => {
        capturedBody = body;
      });
      reqEmitter.end = jest.fn(() => {
        process.nextTick(() => {
          resEmitter.emit('data', JSON.stringify({ refund_id: 'refund_5k' }));
          resEmitter.emit('end');
        });
      });

      https.request.mockImplementation((options, callback) => {
        process.nextTick(() => callback(resEmitter));
        return reqEmitter;
      });

      await refundPayment('pay_456', 5000, 'partial_refund');

      const parsed = JSON.parse(capturedBody);
      expect(parsed.refund_amount).toBe(50);
    });

    it('should include reason as refund_note in request', async () => {
      let capturedBody = '';
      const resEmitter = new EventEmitter();
      resEmitter.statusCode = 200;

      const reqEmitter = new EventEmitter();
      reqEmitter.write = jest.fn((body) => {
        capturedBody = body;
      });
      reqEmitter.end = jest.fn(() => {
        process.nextTick(() => {
          resEmitter.emit('data', JSON.stringify({ refund_id: 'refund_reason' }));
          resEmitter.emit('end');
        });
      });

      https.request.mockImplementation((options, callback) => {
        process.nextTick(() => callback(resEmitter));
        return reqEmitter;
      });

      await refundPayment('pay_789', 1000, 'item_unavailable');

      const parsed = JSON.parse(capturedBody);
      expect(parsed.refund_note).toBe('item_unavailable');
    });

    it('should use default reason customer_request if not provided', async () => {
      let capturedBody = '';
      const resEmitter = new EventEmitter();
      resEmitter.statusCode = 200;

      const reqEmitter = new EventEmitter();
      reqEmitter.write = jest.fn((body) => {
        capturedBody = body;
      });
      reqEmitter.end = jest.fn(() => {
        process.nextTick(() => {
          resEmitter.emit('data', JSON.stringify({ refund_id: 'refund_default' }));
          resEmitter.emit('end');
        });
      });

      https.request.mockImplementation((options, callback) => {
        process.nextTick(() => callback(resEmitter));
        return reqEmitter;
      });

      await refundPayment('pay_default', 2000);

      const parsed = JSON.parse(capturedBody);
      expect(parsed.refund_note).toBe('customer_request');
    });

    it('should reject with error when Cashfree returns 422 (refund not allowed)', async () => {
      mockHttpsRequest(422, { message: 'Refund not allowed for this payment' });

      await expect(refundPayment('pay_bad', 100)).rejects.toThrow(
        'Refund not allowed for this payment'
      );
    });

    it('should reject with error when Cashfree returns 400 (invalid payment ID)', async () => {
      mockHttpsRequest(400, { message: 'Payment not found' });

      await expect(refundPayment('pay_nonexistent', 100)).rejects.toThrow('Payment not found');
    });

    it('should use correct API endpoint (POST /pg/payments/:paymentId/refunds)', async () => {
      mockHttpsRequest(200, { refund_id: 'refund_endpoint' });

      await refundPayment('pay_endpoint_test', 1000);

      const options = https.request.mock.calls[0][0];
      expect(options.path).toContain('/pg/payments/pay_endpoint_test/refunds');
      expect(options.method).toBe('POST');
    });

    it('should reject on network error (ECONNREFUSED)', async () => {
      mockHttpsRequestError('ECONNREFUSED');

      await expect(refundPayment('pay_network', 1000)).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('createPaymentSplit', () => {
    it('should resolve with split response on success (200)', async () => {
      const mockResponse = {
        split_id: 'split_abc_123',
        status: 'SUCCESS',
        splits: [{ vendor_id: 'shop_1', amount: 450, percentage: 90 }],
      };
      mockHttpsRequest(200, mockResponse);

      const splits = [{ vendor_id: 'shop_1', amount: 450, percentage: 90 }];
      const result = await createPaymentSplit('pay_123', splits);

      expect(result).toEqual(mockResponse);
      expect(result.status).toBe('SUCCESS');
    });

    it('should send splits array in request body', async () => {
      let capturedBody = '';
      const resEmitter = new EventEmitter();
      resEmitter.statusCode = 200;

      const reqEmitter = new EventEmitter();
      reqEmitter.write = jest.fn((body) => {
        capturedBody = body;
      });
      reqEmitter.end = jest.fn(() => {
        process.nextTick(() => {
          resEmitter.emit('data', JSON.stringify({ split_id: 'split_body_test' }));
          resEmitter.emit('end');
        });
      });

      https.request.mockImplementation((options, callback) => {
        process.nextTick(() => callback(resEmitter));
        return reqEmitter;
      });

      const splits = [
        { vendor_id: 'shop_1', amount: 450, percentage: 90 },
        { vendor_id: 'shop_2', amount: 50, percentage: 10 },
      ];
      await createPaymentSplit('pay_split_test', splits);

      const parsed = JSON.parse(capturedBody);
      expect(parsed.splits).toEqual(splits);
    });

    it('should reject with error when Cashfree returns 400 (invalid split config)', async () => {
      mockHttpsRequest(400, { message: 'Invalid split configuration' });

      await expect(
        createPaymentSplit('pay_bad_split', [{ vendor_id: 'shop_1', amount: -100 }])
      ).rejects.toThrow('Invalid split configuration');
    });

    it('should reject with error when Cashfree returns 422 (percentages exceed 100)', async () => {
      mockHttpsRequest(422, { message: 'Split percentages exceed 100%' });

      await expect(
        createPaymentSplit('pay_invalid_pct', [
          { vendor_id: 'shop_1', percentage: 80 },
          { vendor_id: 'shop_2', percentage: 30 },
        ])
      ).rejects.toThrow('Split percentages exceed 100%');
    });

    it('should use correct API endpoint (POST /pg/payments/:paymentId/splits)', async () => {
      mockHttpsRequest(200, { split_id: 'split_endpoint' });

      await createPaymentSplit('pay_endpoint_split', [
        { vendor_id: 'shop_1', amount: 100 },
      ]);

      const options = https.request.mock.calls[0][0];
      expect(options.path).toContain('/pg/payments/pay_endpoint_split/splits');
      expect(options.method).toBe('POST');
    });

    it('should reject on network error (ENOTFOUND)', async () => {
      mockHttpsRequestError('ENOTFOUND');

      await expect(
        createPaymentSplit('pay_dns_fail', [{ vendor_id: 'shop_1' }])
      ).rejects.toThrow('ENOTFOUND');
    });

    it('should reject on network error (ETIMEDOUT)', async () => {
      mockHttpsRequestError('ETIMEDOUT');

      await expect(
        createPaymentSplit('pay_timeout', [{ vendor_id: 'shop_1' }])
      ).rejects.toThrow('ETIMEDOUT');
    });

    it('should handle empty splits array', async () => {
      mockHttpsRequest(200, { split_id: 'split_empty', status: 'SUCCESS' });

      const result = await createPaymentSplit('pay_empty_splits', []);

      expect(result.status).toBe('SUCCESS');
    });
  });

  describe('Error Handling (General)', () => {
    it('should handle JSON parse error in response gracefully', async () => {
      const resEmitter = new EventEmitter();
      resEmitter.statusCode = 200;

      const reqEmitter = new EventEmitter();
      reqEmitter.write = jest.fn();
      reqEmitter.end = jest.fn(() => {
        process.nextTick(() => {
          resEmitter.emit('data', 'invalid json data');
          resEmitter.emit('end');
        });
      });

      https.request.mockImplementation((options, callback) => {
        process.nextTick(() => callback(resEmitter));
        return reqEmitter;
      });

      await expect(
        createPaymentSession({ order_id: 'bad_json', order_amount: 100 })
      ).rejects.toThrow();
    });

    it('should include error.statusCode and error.response for Cashfree API errors', async () => {
      mockHttpsRequest(400, {
        message: 'Invalid order amount',
        error_code: 'INVALID_AMOUNT',
      });

      try {
        await createPaymentSession({ order_id: 'order_error', order_amount: -100 });
      } catch (error) {
        expect(error.statusCode).toBe(400);
        expect(error.response).toEqual(
          expect.objectContaining({
            message: 'Invalid order amount',
            error_code: 'INVALID_AMOUNT',
          })
        );
      }
    });

    it('should handle HTTP 500 error gracefully', async () => {
      mockHttpsRequest(500, { message: 'Internal server error at Cashfree' });

      await expect(
        createPaymentSession({ order_id: 'server_err', order_amount: 100 })
      ).rejects.toThrow('Internal server error at Cashfree');
    });
  });
});
