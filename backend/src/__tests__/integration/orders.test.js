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
  notifyShopQueue: {
    add: jest.fn().mockResolvedValue({ id: 'notify-shop-job' }),
  },
  notifyShopWorker: {},
}));

jest.mock('../../jobs/autoCancel.js', () => ({
  autoCancelQueue: {
    add: jest.fn().mockResolvedValue({ id: 'auto-cancel-job' }),
    remove: jest.fn().mockResolvedValue(1),
  },
  autoCancelWorker: {},
}));

jest.mock('../../jobs/notifyCustomer.js', () => ({
  notifyCustomerQueue: {
    add: jest.fn().mockResolvedValue({ id: 'notify-customer-job' }),
  },
  notifyCustomerWorker: {},
}));

jest.mock('../../jobs/assignDelivery.js', () => ({
  assignDeliveryQueue: {
    add: jest.fn().mockResolvedValue({ id: 'assign-delivery-job' }),
  },
  assignDeliveryWorker: {},
}));

jest.mock('../../services/cashfree.js', () => ({
  refundPayment: jest.fn().mockResolvedValue({ refund_id: 'refund-123' }),
}));

jest.mock('../../socket/ioRegistry.js', () => ({
  emitOrderEvent: jest.fn(),
  setRealtimeServer: jest.fn(),
  getRealtimeServer: jest.fn(),
}));

describe('Orders Routes', () => {
  const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440101';
  const SHOP_OWNER_ID = '550e8400-e29b-41d4-a716-446655440102';
  const SHOP_ID = '550e8400-e29b-41d4-a716-446655440103';
  const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440104';
  const OTHER_PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440105';

  let customerToken;
  let ownerToken;
  let mockSupabase;
  let mockNotifyShopQueue;
  let mockAutoCancelQueue;
  let mockNotifyCustomerQueue;
  let mockAssignDeliveryQueue;
  let mockEmitOrderEvent;
  let mockRefundPayment;
  const ORDER_ID = '550e8400-e29b-41d4-a716-446655440106';
  const ORDER_ITEM_ID = '550e8400-e29b-41d4-a716-446655440107';

  beforeAll(async () => {
    customerToken = generateToken({
      userId: CUSTOMER_ID,
      phone: '9000000010',
      role: 'customer',
    });

    ownerToken = generateToken({
      userId: SHOP_OWNER_ID,
      phone: '9000000011',
      role: 'shop_owner',
      shopId: SHOP_ID,
    });

    ({ supabase: mockSupabase } = await import('../../services/supabase.js'));
    ({ notifyShopQueue: mockNotifyShopQueue } = await import('../../jobs/notifyShop.js'));
    ({ autoCancelQueue: mockAutoCancelQueue } = await import('../../jobs/autoCancel.js'));
    ({ notifyCustomerQueue: mockNotifyCustomerQueue } = await import('../../jobs/notifyCustomer.js'));
    ({ assignDeliveryQueue: mockAssignDeliveryQueue } = await import('../../jobs/assignDelivery.js'));
    ({ emitOrderEvent: mockEmitOrderEvent } = await import('../../socket/ioRegistry.js'));
    ({ refundPayment: mockRefundPayment } = await import('../../services/cashfree.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();
  });

  const makeShopRow = (overrides = {}) => ({
    id: SHOP_ID,
    owner_id: SHOP_OWNER_ID,
    is_open: true,
    is_verified: true,
    ...overrides,
  });

  const makeProductRow = (overrides = {}) => ({
    id: PRODUCT_ID,
    shop_id: SHOP_ID,
    name: 'Fresh Milk',
    price: 6500,
    stock_quantity: 10,
    is_available: true,
    deleted_at: null,
    ...overrides,
  });

  const mockSuccessfulOrderFlow = ({
    shop = makeShopRow(),
    products = [makeProductRow()],
  } = {}) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: shop, error: null }),
        };
      }

      if (table === 'products') {
        const chain = {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: products, error: null }),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
        return chain;
      }

      if (table === 'orders') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: uuidv4(),
              customer_id: CUSTOMER_ID,
              shop_id: SHOP_ID,
              status: 'pending',
              total_paise: 13000,
              payment_method: 'cod',
              payment_status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        };
      }

      if (table === 'order_items') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: uuidv4(),
                order_id: ORDER_ID,
                product_id: PRODUCT_ID,
                quantity: 2,
                unit_price_paise: 6500,
                total_paise: 13000,
              },
            ],
            error: null,
          }),
        };
      }

      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  };

  const mockOrderLifecycleFlow = ({ orderOverrides = {}, orderItems = null } = {}) => {
    const baseOrder = {
      id: ORDER_ID,
      customer_id: CUSTOMER_ID,
      shop_id: SHOP_ID,
      status: 'pending',
      total_paise: 13000,
      payment_method: 'cod',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...orderOverrides,
    };

    let mutableItems = orderItems || [
      {
        id: ORDER_ITEM_ID,
        order_id: ORDER_ID,
        product_id: PRODUCT_ID,
        quantity: 2,
        unit_price_paise: 6500,
        total_paise: 13000,
        cancelled_quantity: 0,
        cancelled_total_paise: 0,
        cancellation_reason: null,
        cancelled_at: null,
      },
    ];
    let mutableProducts = [
      {
        id: PRODUCT_ID,
        stock_quantity: 4,
        is_available: true,
      },
    ];

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        let updatedOrder = { ...baseOrder };
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          update: jest.fn((patch) => {
            updatedOrder = { ...updatedOrder, ...patch };
            return {
              eq: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: updatedOrder, error: null }),
            };
          }),
          order: jest.fn().mockResolvedValue({ data: [baseOrder], error: null }),
          single: jest.fn().mockResolvedValue({ data: baseOrder, error: null }),
        };
      }

      if (table === 'order_items') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((column, value) => Promise.resolve({
            data: mutableItems.filter((item) => item[column] === value),
            error: null,
          })),
          update: jest.fn((patch) => ({
            eq: jest.fn((column, value) => {
              mutableItems = mutableItems.map((item) => (
                item[column] === value ? { ...item, ...patch } : item
              ));
              return Promise.resolve({ data: null, error: null });
            }),
          })),
        };
      }

      if (table === 'products') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn((_column, values) => Promise.resolve({
            data: mutableProducts.filter((product) => values.includes(product.id)),
            error: null,
          })),
          update: jest.fn((patch) => ({
            eq: jest.fn((column, value) => {
              mutableProducts = mutableProducts.map((product) => (
                product[column] === value ? { ...product, ...patch } : product
              ));
              return Promise.resolve({ data: null, error: null });
            }),
          })),
        };
      }

      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  };

  it('creates an order with server-side total calculation and stock reservation', async () => {
    mockSuccessfulOrderFlow();

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shop_id: SHOP_ID,
        payment_method: 'cod',
        items: [{ product_id: PRODUCT_ID, qty: 2, price: 1 }],
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.shopId).toBe(SHOP_ID);
    expect(response.body.data.totalPaise).toBe(13000);
    expect(response.body.data.items[0].unitPricePaise).toBe(6500);
    expect(mockNotifyShopQueue.add).toHaveBeenCalled();
    expect(mockAutoCancelQueue.add).toHaveBeenCalled();
    expect(mockEmitOrderEvent).toHaveBeenCalledWith(
      expect.any(String),
      'order:created',
      expect.objectContaining({ order: expect.objectContaining({ shopId: SHOP_ID }) })
    );
  });

  it('returns cached order for a repeated idempotency key', async () => {
    mockSuccessfulOrderFlow();
    const idempotencyKey = '550e8400-e29b-41d4-a716-446655440199';

    const firstResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('idempotency-key', idempotencyKey)
      .send({
        shop_id: SHOP_ID,
        payment_method: 'cod',
        items: [{ product_id: PRODUCT_ID, qty: 2 }],
      })
      .expect(201);

    const secondResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('idempotency-key', idempotencyKey)
      .send({
        shop_id: SHOP_ID,
        payment_method: 'cod',
        items: [{ product_id: PRODUCT_ID, qty: 2 }],
      })
      .expect(200);

    expect(secondResponse.body.data.id).toBe(firstResponse.body.data.id);
    expect(mockSupabase.from).toHaveBeenCalledTimes(mockSupabase.from.mock.calls.length);
    expect(mockNotifyShopQueue.add).toHaveBeenCalledTimes(1);
    expect(mockAutoCancelQueue.add).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for an invalid idempotency-key header', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('idempotency-key', 'not-a-uuid')
      .send({
        shop_id: SHOP_ID,
        items: [{ product_id: PRODUCT_ID, qty: 1 }],
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when auth header is missing', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .send({
        shop_id: SHOP_ID,
        items: [{ product_id: PRODUCT_ID, qty: 1 }],
      })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('returns 403 when a non-customer tries to create an order', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        shop_id: SHOP_ID,
        items: [{ product_id: PRODUCT_ID, qty: 1 }],
      })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 when items array is empty', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shop_id: SHOP_ID,
        items: [],
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when requested quantity exceeds stock', async () => {
    mockSuccessfulOrderFlow({
      products: [makeProductRow({ stock_quantity: 1 })],
    });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shop_id: SHOP_ID,
        items: [{ product_id: PRODUCT_ID, qty: 2 }],
      })
      .expect(409);

    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('returns 404 when one of the products does not exist', async () => {
    mockSuccessfulOrderFlow({
      products: [makeProductRow()],
    });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shop_id: SHOP_ID,
        items: [
          { product_id: PRODUCT_ID, qty: 1 },
          { product_id: OTHER_PRODUCT_ID, qty: 1 },
        ],
      })
      .expect(404);

    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns 409 when the shop is closed', async () => {
    mockSuccessfulOrderFlow({
      shop: makeShopRow({ is_open: false }),
      products: [makeProductRow()],
    });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shop_id: SHOP_ID,
        items: [{ product_id: PRODUCT_ID, qty: 1 }],
      })
      .expect(409);

    expect(response.body.error.code).toBe('SHOP_CLOSED');
  });

  it('lists orders for the authenticated customer', async () => {
    mockOrderLifecycleFlow();

    const response = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(ORDER_ID);
  });

  it('returns a single order detail for the authenticated customer', async () => {
    mockOrderLifecycleFlow();

    const response = await request(app)
      .get(`/api/v1/orders/${ORDER_ID}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(response.body.data.id).toBe(ORDER_ID);
    expect(response.body.data.items).toHaveLength(1);
  });

  it('allows the shop owner to accept a pending order', async () => {
    mockOrderLifecycleFlow();

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.data.status).toBe('accepted');
    expect(mockAssignDeliveryQueue.add).toHaveBeenCalled();
    expect(mockAutoCancelQueue.remove).toHaveBeenCalledWith(`auto-cancel:${ORDER_ID}`);
    expect(mockNotifyCustomerQueue.add).toHaveBeenCalledWith(
      'notify-customer',
      expect.objectContaining({ orderId: ORDER_ID, status: 'accepted' })
    );
    expect(mockEmitOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      'order:status_updated',
      expect.objectContaining({ order: expect.objectContaining({ status: 'accepted' }) })
    );
  });

  it('allows the shop owner to reject a pending order', async () => {
    mockOrderLifecycleFlow();

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('cancelled');
    expect(mockNotifyCustomerQueue.add).toHaveBeenCalledWith(
      'notify-customer',
      expect.objectContaining({ orderId: ORDER_ID, status: 'cancelled' })
    );
    expect(mockEmitOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      'order:status_updated',
      expect.objectContaining({ order: expect.objectContaining({ status: 'cancelled' }) })
    );
  });

  it('refunds non-cod orders when the shop rejects them', async () => {
    mockOrderLifecycleFlow({
      orderOverrides: {
        payment_method: 'upi',
        payment_id: 'pay_123',
      },
    });

    await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(mockRefundPayment).toHaveBeenCalledWith('pay_123', 13000, 'shop_rejected');
  });

  it('allows the shop owner to mark an accepted order ready', async () => {
    mockOrderLifecycleFlow({ orderOverrides: { status: 'accepted' } });

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/ready`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ready');
    expect(mockNotifyCustomerQueue.add).toHaveBeenCalledWith(
      'notify-customer',
      expect.objectContaining({ orderId: ORDER_ID, status: 'ready' })
    );
    expect(mockEmitOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      'order:status_updated',
      expect.objectContaining({ order: expect.objectContaining({ status: 'ready' }) })
    );
  });

  it('allows the customer to cancel a pending order', async () => {
    mockOrderLifecycleFlow();

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('cancelled');
    expect(mockEmitOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      'order:status_updated',
      expect.objectContaining({ order: expect.objectContaining({ status: 'cancelled' }) })
    );
  });

  it('refunds non-cod orders when the customer cancels them', async () => {
    mockOrderLifecycleFlow({
      orderOverrides: {
        payment_method: 'upi',
        payment_id: 'pay_456',
      },
    });

    await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(mockRefundPayment).toHaveBeenCalledWith('pay_456', 13000, 'customer_cancelled');
  });

  it('allows the shop owner to partially cancel unavailable items', async () => {
    mockOrderLifecycleFlow({ orderOverrides: { total_paise: 13000, status: 'accepted' } });

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/partial-cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        reason: 'Tomatoes were damaged',
        items: [{ item_id: ORDER_ITEM_ID, cancel_quantity: 1 }],
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.totalPaise).toBe(6500);
    expect(response.body.data.items[0].remainingQuantity).toBe(1);
    expect(response.body.data.items[0].cancelledQuantity).toBe(1);
    expect(mockNotifyCustomerQueue.add).toHaveBeenCalledWith(
      'notify-customer',
      expect.objectContaining({ orderId: ORDER_ID, status: 'updated' })
    );
    expect(mockEmitOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      'order:items_updated',
      expect.objectContaining({
        order: expect.objectContaining({ totalPaise: 6500 }),
        reason: 'Tomatoes were damaged',
        totalReductionPaise: 6500,
      })
    );
  });

  it('refunds the removed amount for partial cancellation on prepaid orders', async () => {
    mockOrderLifecycleFlow({
      orderOverrides: {
        total_paise: 13000,
        status: 'accepted',
        payment_method: 'upi',
        payment_id: 'pay_partial',
      },
    });

    await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/partial-cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        reason: 'One item unavailable',
        items: [{ item_id: ORDER_ITEM_ID, cancel_quantity: 1 }],
      })
      .expect(200);

    expect(mockRefundPayment).toHaveBeenCalledWith('pay_partial', 6500, 'partial_cancel_items');
  });

  it('cancels the full order when partial cancellation removes all remaining items', async () => {
    mockOrderLifecycleFlow({ orderOverrides: { total_paise: 13000, status: 'pending' } });

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/partial-cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        reason: 'Entire order unavailable',
        items: [{ item_id: ORDER_ITEM_ID, cancel_quantity: 2 }],
      })
      .expect(200);

    expect(response.body.data.status).toBe('cancelled');
    expect(response.body.data.totalPaise).toBe(0);
  });

  it('returns 409 when partial cancel exceeds remaining quantity', async () => {
    mockOrderLifecycleFlow({
      orderItems: [
        {
          id: ORDER_ITEM_ID,
          order_id: ORDER_ID,
          product_id: PRODUCT_ID,
          quantity: 2,
          unit_price_paise: 6500,
          total_paise: 13000,
          cancelled_quantity: 1,
          cancelled_total_paise: 6500,
          cancellation_reason: 'Previous adjustment',
          cancelled_at: new Date().toISOString(),
        },
      ],
    });

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/partial-cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        reason: 'Need more removal',
        items: [{ item_id: ORDER_ITEM_ID, cancel_quantity: 2 }],
      })
      .expect(409);

    expect(response.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
  });
});
