import request from 'supertest';
import { app } from '../../index.js';
import { generateToken } from '../../middleware/auth.js';

jest.mock('../../services/redis.js', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    call: jest.fn().mockResolvedValue(null),
    ping: jest.fn().mockResolvedValue('PONG'),
    del: jest.fn().mockResolvedValue(1),
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
  autoCancelQueue: { add: jest.fn().mockResolvedValue({ id: 'auto-cancel-job' }) },
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

describe('Orders state machine', () => {
  const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440901';
  const SHOP_OWNER_ID = '550e8400-e29b-41d4-a716-446655440902';
  const SHOP_ID = '550e8400-e29b-41d4-a716-446655440903';
  const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440904';
  const ORDER_ID = '550e8400-e29b-41d4-a716-446655440905';
  const ORDER_ITEM_ID = '550e8400-e29b-41d4-a716-446655440906';

  let customerToken;
  let ownerToken;
  let mockSupabase;

  beforeAll(async () => {
    customerToken = generateToken({
      userId: CUSTOMER_ID,
      phone: '9000000090',
      role: 'customer',
    });

    ownerToken = generateToken({
      userId: SHOP_OWNER_ID,
      phone: '9000000091',
      role: 'shop_owner',
      shopId: SHOP_ID,
    });

    ({ supabase: mockSupabase } = await import('../../services/supabase.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockLifecycle = (status) => {
    const order = {
      id: ORDER_ID,
      customer_id: CUSTOMER_ID,
      shop_id: SHOP_ID,
      status,
      total_paise: 13000,
      payment_method: 'cod',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const items = [
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

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        let updatedOrder = { ...order };
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
          single: jest.fn().mockResolvedValue({ data: order, error: null }),
        };
      }

      if (table === 'order_items') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((column, value) => Promise.resolve({
            data: items.filter((item) => item[column] === value),
            error: null,
          })),
          update: jest.fn((patch) => ({
            eq: jest.fn((column, value) => {
              const target = items.find((item) => item[column] === value);
              Object.assign(target, patch);
              return Promise.resolve({ data: null, error: null });
            }),
          })),
        };
      }

      if (table === 'products') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: [{ id: PRODUCT_ID, stock_quantity: 5 }], error: null }),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
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

  it('rejects accepting a non-pending order', async () => {
    mockLifecycle('accepted');

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(409);

    expect(response.body.error.code).toBe('ORDER_ACCEPT_EXPIRED');
  });

  it('rejects marking a pending order as ready', async () => {
    mockLifecycle('pending');

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/ready`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(409);

    expect(response.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('rejects cancelling a ready order from the customer endpoint', async () => {
    mockLifecycle('ready');

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(409);

    expect(response.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('rejects partial cancellation once the order is ready', async () => {
    mockLifecycle('ready');

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/partial-cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        reason: 'No longer available',
        items: [{ item_id: ORDER_ITEM_ID, cancel_quantity: 1 }],
      })
      .expect(409);

    expect(response.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('rejects partial cancellation from a customer account', async () => {
    mockLifecycle('accepted');

    const response = await request(app)
      .patch(`/api/v1/orders/${ORDER_ID}/partial-cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        reason: 'No longer available',
        items: [{ item_id: ORDER_ITEM_ID, cancel_quantity: 1 }],
      })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
