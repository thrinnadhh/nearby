import crypto from 'crypto';
import request from 'supertest';
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
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
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

describe('Payments Routes', () => {
  const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655441001';
  const SHOP_OWNER_ID = '550e8400-e29b-41d4-a716-446655441002';
  const SHOP_ID = '550e8400-e29b-41d4-a716-446655441003';
  const ORDER_ID = '550e8400-e29b-41d4-a716-446655441004';
  const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655441005';

  let customerToken;
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

  it('initiates a Cashfree payment session for a prepaid order', async () => {
    const order = buildOrder();

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [order], error: null }),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }

      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [{ id: CUSTOMER_ID, phone: '+919000001010' }],
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const response = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ order_id: ORDER_ID })
      .expect(200);

    expect(response.body.data.paymentSessionId).toBe('session_123');
    expect(response.body.data.cashfreeOrderId).toBe(`nearby-${ORDER_ID}`);
    expect(mockCreatePaymentSession).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: `nearby-${ORDER_ID}`,
        order_amount: 130,
        order_note: ORDER_ID,
      })
    );
  });

  it('completes COD payments without calling Cashfree', async () => {
    const order = buildOrder({ payment_method: 'cod' });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [order], error: null }),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const response = await request(app)
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ order_id: ORDER_ID })
      .expect(200);

    expect(response.body.data.mode).toBe('cod');
    expect(mockCreatePaymentSession).not.toHaveBeenCalled();
  });

  it('returns payment status with gateway details for accessible orders', async () => {
    const order = buildOrder({
      payment_status: 'completed',
      payment_id: 'pay_123',
      cashfree_order_id: `nearby-${ORDER_ID}`,
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [order], error: null }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const response = await request(app)
      .get(`/api/v1/payments/${ORDER_ID}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(response.body.data.paymentStatus).toBe('completed');
    expect(response.body.data.gatewayStatus).toEqual(
      expect.objectContaining({ order_status: 'PAID' })
    );
    expect(mockGetPaymentStatus).toHaveBeenCalledWith(`nearby-${ORDER_ID}`);
  });

  it('marks a payment successful from the Cashfree webhook', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

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

    await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-webhook-signature', signature)
      .send(payload)
      .expect(200);
  });

  it('restores stock and marks payment failed when the webhook says payment failed', async () => {
    // restoreOrderStock now calls supabase.rpc('restore_stock_for_order') atomically
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

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

    await request(app)
      .post('/api/v1/payments/webhook')
      .set('x-webhook-signature', signature)
      .send(payload)
      .expect(200);

    // Verify atomic stock restoration RPC was called
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'restore_stock_for_order',
      { p_order_id: ORDER_ID }
    );
  });
});
