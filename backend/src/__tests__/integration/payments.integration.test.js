import crypto from 'crypto';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../index.js';
import { generateToken } from '../../middleware/auth.js';

const mockRedisStore = new Map();

jest.mock('../../services/redis.js', () => ({
  redis: {
    get: jest.fn(async (key) => (mockRedisStore.has(key) ? mockRedisStore.get(key) : null)),
    setex: jest.fn(async (key, _ttl, value) => {
      mockRedisStore.set(key, value);
      return 'OK';
    }),
    call: jest.fn().mockResolvedValue(null),
    ping: jest.fn().mockResolvedValue('PONG'),
    del: jest.fn(async (...keys) => {
      keys.flat().forEach((key) => mockRedisStore.delete(key));
      return 1;
    }),
  },
}));

jest.mock('../../services/supabase.js', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

jest.mock('../../services/typesense.js', () => ({
  typesense: {
    collections: {
      retrieve: jest.fn().mockResolvedValue([]),
    },
  },
  ensureTypesenseCollections: jest.fn().mockResolvedValue({ created: [], existing: [] }),
}));

jest.mock('../../services/r2.js', () => ({
  uploadFile: jest.fn().mockResolvedValue({ ETag: '"test-etag"' }),
  getSignedFileUrl: jest.fn().mockResolvedValue('https://example.r2.dev/signed'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../jobs/typesenseSync.js', () => ({
  typesenseSyncQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  },
  typesenseSyncWorker: {},
}));

jest.mock('../../jobs/notifyShop.js', () => ({
  notifyShopQueue: { add: jest.fn().mockResolvedValue({ id: 'notify-shop-job' }) },
  notifyShopWorker: {},
}));

jest.mock('../../jobs/autoCancel.js', () => ({
  autoCancelQueue: { add: jest.fn().mockResolvedValue({ id: 'auto-cancel-job' }), remove: jest.fn().mockResolvedValue(1) },
  autoCancelWorker: {},
}));

jest.mock('../../jobs/notifyCustomer.js', () => ({
  notifyCustomerQueue: { add: jest.fn().mockResolvedValue({ id: 'notify-customer-job' }) },
  notifyCustomerWorker: {},
}));

jest.mock('../../jobs/assignDelivery.js', () => ({
  assignDeliveryQueue: { add: jest.fn().mockResolvedValue({ id: 'assign-delivery-job' }) },
  assignDeliveryWorker: {},
}));

jest.mock('../../socket/ioRegistry.js', () => ({
  emitOrderEvent: jest.fn(),
  setRealtimeServer: jest.fn(),
  getRealtimeServer: jest.fn(),
}));

jest.mock('../../services/cashfree.js', () => ({
  createPaymentSession: jest.fn().mockResolvedValue({
    payment_session_id: 'session_123',
    payment_link: 'https://pay.example/session_123',
  }),
  getPaymentStatus: jest.fn().mockResolvedValue({
    order_status: 'PAID',
    cf_order_id: 'nearby-order-1',
  }),
  refundPayment: jest.fn().mockResolvedValue({ refund_id: 'refund-123' }),
}));

describe('Payments Integration Tests', () => {
  const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655441001';
  const OTHER_CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655441099';
  const SHOP_OWNER_ID = '550e8400-e29b-41d4-a716-446655441002';
  const SHOP_ID = '550e8400-e29b-41d4-a716-446655441003';
  const ORDER_ID = '550e8400-e29b-41d4-a716-446655441004';
  const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655441005';

  let customerToken;
  let otherCustomerToken;
  let ownerToken;
  let mockSupabase;
  let mockCreatePaymentSession;
  let mockGetPaymentStatus;

  beforeAll(async () => {
    process.env.CASHFREE_WEBHOOK_SECRET = process.env.CASHFREE_WEBHOOK_SECRET || 'test_webhook_secret';

    customerToken = generateToken({
      userId: CUSTOMER_ID,
      phone: '9000001010',
      role: 'customer',
    });

    otherCustomerToken = generateToken({
      userId: OTHER_CUSTOMER_ID,
      phone: '9000001099',
      role: 'customer',
    });

    ownerToken = generateToken({
      userId: SHOP_OWNER_ID,
      phone: '9000001011',
      role: 'shop_owner',
      shopId: SHOP_ID,
    });

    ({ supabase: mockSupabase } = await import('../../services/supabase.js'));
    ({ createPaymentSession: mockCreatePaymentSession, getPaymentStatus: mockGetPaymentStatus } = await import('../../services/cashfree.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();
  });

  const buildOrder = (overrides = {}) => ({
    id: ORDER_ID,
    customer_id: CUSTOMER_ID,
    shop_id: SHOP_ID,
    status: 'accepted',
    total_paise: 13000,
    payment_method: 'upi',
    payment_status: 'pending',
    payment_id: null,
    cashfree_order_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  const setupMockSupabase = (orderData, profileData = undefined) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: orderData ? [orderData] : [],
            error: null,
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }

      if (table === 'profiles') {
        // When profileData is undefined (not passed), return default profile
        // When profileData is null, return empty array (profile not found)
        const profilesData = profileData === undefined
          ? [{ id: CUSTOMER_ID, phone: '+919000001010' }]
          : profileData === null
            ? []
            : [profileData];

        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: profilesData,
            error: null,
          }),
        };
      }

      if (table === 'order_items') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [{ product_id: PRODUCT_ID, quantity: 2, cancelled_quantity: 0 }],
            error: null,
          }),
        };
      }

      if (table === 'products') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [{ id: PRODUCT_ID, stock_quantity: 5 }],
            error: null,
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });
  };

  describe('POST /payments/initiate', () => {
    it('should initiate card/UPI payment session with paise->rupees conversion', async () => {
      const order = buildOrder({ payment_method: 'upi' });
      setupMockSupabase(order);

      const response = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ order_id: ORDER_ID })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentSessionId).toBe('session_123');
      expect(response.body.data.cashfreeOrderId).toBe(`nearby-${ORDER_ID}`);

      expect(mockCreatePaymentSession).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: `nearby-${ORDER_ID}`,
          order_amount: 130, // 13000 paise / 100
          order_currency: 'INR',
          order_note: ORDER_ID,
        })
      );
    });

    it('should complete COD payment without calling Cashfree', async () => {
      const order = buildOrder({ payment_method: 'cod' });
      setupMockSupabase(order);

      const response = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ order_id: ORDER_ID })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentStatus).toBe('completed');
      expect(response.body.data.mode).toBe('cod');
      expect(mockCreatePaymentSession).not.toHaveBeenCalled();
    });

    it('should return already paid status if order already completed', async () => {
      const order = buildOrder({ payment_status: 'completed', payment_id: 'pay_123' });
      setupMockSupabase(order);

      const response = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ order_id: ORDER_ID })
        .expect(200);

      expect(response.body.data.alreadyPaid).toBe(true);
      expect(mockCreatePaymentSession).not.toHaveBeenCalled();
    });

    it('should reject with PAYMENT_NOT_FOUND when order does not exist', async () => {
      setupMockSupabase(null);

      const response = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ order_id: ORDER_ID })
        .expect(404);

      expect(response.body.error.code).toBe('PAYMENT_NOT_FOUND');
    });

    it('should reject with FORBIDDEN when accessing other customer order', async () => {
      const order = buildOrder({ customer_id: OTHER_CUSTOMER_ID });
      setupMockSupabase(order);

      const response = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ order_id: ORDER_ID })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject with UNAUTHORIZED when no auth token', async () => {
      const response = await request(app)
        .post('/api/v1/payments/initiate')
        .send({ order_id: ORDER_ID })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject with VALIDATION_ERROR for invalid UUID', async () => {
      const response = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ order_id: 'not-a-uuid' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject with INTERNAL_ERROR when profile not found', async () => {
      const order = buildOrder();
      setupMockSupabase(order, null);

      const response = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ order_id: ORDER_ID })
        .expect(500);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should reject when called by shop_owner', async () => {
      const order = buildOrder();
      setupMockSupabase(order);

      const response = await request(app)
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ order_id: ORDER_ID })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /payments/:id', () => {
    it('should return payment status for customer own order', async () => {
      const order = buildOrder({
        payment_status: 'completed',
        payment_id: 'pay_123',
        cashfree_order_id: `nearby-${ORDER_ID}`,
      });
      setupMockSupabase(order);

      const response = await request(app)
        .get(`/api/v1/payments/${ORDER_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe(ORDER_ID);
      expect(response.body.data.paymentStatus).toBe('completed');
      expect(response.body.data.gatewayStatus).toEqual(
        expect.objectContaining({ order_status: 'PAID' })
      );
    });

    it('should return payment status for shop_owner of order shop', async () => {
      const order = buildOrder({ payment_status: 'pending' });
      setupMockSupabase(order);

      const response = await request(app)
        .get(`/api/v1/payments/${ORDER_ID}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.data.paymentStatus).toBe('pending');
    });

    it('should return null gatewayStatus for COD orders', async () => {
      const order = buildOrder({ payment_method: 'cod', payment_status: 'completed' });
      setupMockSupabase(order);

      const response = await request(app)
        .get(`/api/v1/payments/${ORDER_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.data.gatewayStatus).toBeNull();
    });

    it('should reject with FORBIDDEN when accessing other customer order', async () => {
      const order = buildOrder({ customer_id: OTHER_CUSTOMER_ID });
      setupMockSupabase(order);

      const response = await request(app)
        .get(`/api/v1/payments/${ORDER_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject with PAYMENT_NOT_FOUND when order does not exist', async () => {
      setupMockSupabase(null);

      const response = await request(app)
        .get(`/api/v1/payments/${ORDER_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('PAYMENT_NOT_FOUND');
    });

    it('should reject with 401 when no auth token', async () => {
      const response = await request(app)
        .get(`/api/v1/payments/${ORDER_ID}`)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle gateway status fetch failure gracefully', async () => {
      mockGetPaymentStatus.mockRejectedValueOnce(new Error('Gateway timeout'));
      const order = buildOrder({
        payment_status: 'completed',
        payment_id: 'pay_123',
        cashfree_order_id: `nearby-${ORDER_ID}`,
      });
      setupMockSupabase(order);

      const response = await request(app)
        .get(`/api/v1/payments/${ORDER_ID}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.data.gatewayStatus).toBeNull();
    });
  });

  describe('POST /payments/webhook', () => {
    it('should process PAYMENT_SUCCESS with valid signature', async () => {
      const order = buildOrder();
      setupMockSupabase(order);

      const payload = {
        event: 'PAYMENT_SUCCESS',
        data: {
          payment: { id: 'pay_success_1' },
          order: { order_id: 'nearby-cf-order-1', note: ORDER_ID },
        },
      };
      const signature = crypto
        .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('base64');

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-webhook-signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body.data.status).toBe('processed');
    });

    it('should process PAYMENT_FAILED and restore stock', async () => {
      const order = buildOrder();
      setupMockSupabase(order);

      const payload = {
        event: 'PAYMENT_FAILED',
        data: {
          payment: { id: 'pay_failed_1' },
          order: { order_id: 'nearby-cf-order-2', note: ORDER_ID },
        },
      };
      const signature = crypto
        .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('base64');

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-webhook-signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body.data.status).toBe('processed');
    });

    it('should handle idempotent duplicate webhook calls', async () => {
      const order = buildOrder();
      setupMockSupabase(order);

      const payload = {
        event: 'PAYMENT_SUCCESS',
        data: {
          payment: { id: 'pay_idempotent_unique' },
          order: { order_id: 'nearby-cf-order-3', note: ORDER_ID },
        },
      };
      const signature = crypto
        .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('base64');

      const response1 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-webhook-signature', signature)
        .send(payload)
        .expect(200);

      expect(response1.body.data.status).toBe('processed');

      const response2 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-webhook-signature', signature)
        .send(payload)
        .expect(200);

      expect(response2.body.data.status).toBe('already_processed');
    });

    it('should reject with INVALID_WEBHOOK_SIGNATURE when signature missing', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        data: {
          payment: { id: 'pay_123' },
          order: { order_id: 'nearby-cf-order-4', note: ORDER_ID },
        },
      };

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .send(payload)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
    });

    it('should reject with INVALID_WEBHOOK_SIGNATURE when signature invalid', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        data: {
          payment: { id: 'pay_bad_sig' },
          order: { order_id: 'nearby-cf-order-5', note: ORDER_ID },
        },
      };

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-webhook-signature', 'invalid_base64===')
        .send(payload)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
    });

    it('should reject with INTERNAL_ERROR when data missing', async () => {
      const invalidPayload = { event: 'PAYMENT_SUCCESS' };
      const signature = crypto
        .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
        .update(JSON.stringify(invalidPayload))
        .digest('base64');

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-webhook-signature', signature)
        .send(invalidPayload)
        .expect(400);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should reject with INTERNAL_ERROR when payment_id missing', async () => {
      const payload = {
        event: 'PAYMENT_SUCCESS',
        data: {
          payment: { id: null },
          order: { order_id: 'nearby-cf-order-6', note: ORDER_ID },
        },
      };
      const signature = crypto
        .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('base64');

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-webhook-signature', signature)
        .send(payload)
        .expect(400);

      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle unknown event types gracefully', async () => {
      const payload = {
        event: 'UNKNOWN_EVENT',
        data: {
          payment: { id: 'pay_unknown' },
          order: { order_id: 'nearby-cf-order-7', note: ORDER_ID },
        },
      };
      const signature = crypto
        .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('base64');

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-webhook-signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body.data.status).toBe('processed');
    });

    it('should handle orders with no items during payment failure', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'order_items') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      const payload = {
        event: 'PAYMENT_FAILED',
        data: {
          payment: { id: 'pay_no_items' },
          order: { order_id: 'nearby-cf-order-8', note: ORDER_ID },
        },
      };
      const signature = crypto
        .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('base64');

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-webhook-signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
