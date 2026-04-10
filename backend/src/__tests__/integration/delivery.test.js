import request from 'supertest';
import { app } from '../../index.js';
import { generateToken } from '../../middleware/auth.js';

// ─── Redis mock ────────────────────────────────────────────────────────────────
jest.mock('../../services/redis.js', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    call: jest.fn().mockResolvedValue(null),
    ping: jest.fn().mockResolvedValue('PONG'),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  },
}));

// ─── Supabase mock ─────────────────────────────────────────────────────────────
jest.mock('../../services/supabase.js', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

// ─── R2 mock ───────────────────────────────────────────────────────────────────
jest.mock('../../services/r2.js', () => ({
  uploadFile: jest.fn().mockResolvedValue({ ETag: '"test-etag"' }),
  getSignedFileUrl: jest.fn().mockResolvedValue('https://example.r2.dev/signed'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

// ─── Typesense sync job ────────────────────────────────────────────────────────
jest.mock('../../jobs/typesenseSync.js', () => ({
  typesenseSyncQueue: { add: jest.fn().mockResolvedValue({ id: 'ts-job' }) },
  typesenseSyncWorker: {},
}));

// ─── BullMQ job mocks ──────────────────────────────────────────────────────────
jest.mock('../../jobs/notifyShop.js', () => ({
  notifyShopQueue: { add: jest.fn().mockResolvedValue({ id: 'notify-shop-job' }) },
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
  notifyCustomerQueue: { add: jest.fn().mockResolvedValue({ id: 'notify-customer-job' }) },
  notifyCustomerWorker: {},
}));

jest.mock('../../jobs/assignDelivery.js', () => ({
  assignDeliveryQueue: { add: jest.fn().mockResolvedValue({ id: 'assign-delivery-job' }) },
  assignDeliveryWorker: {},
}));

// ─── Cashfree mock ─────────────────────────────────────────────────────────────
jest.mock('../../services/cashfree.js', () => ({
  refundPayment: jest.fn().mockResolvedValue({ refund_id: 'refund-123' }),
}));

// ─── Socket.IO registry mock ───────────────────────────────────────────────────
jest.mock('../../socket/ioRegistry.js', () => ({
  emitOrderEvent: jest.fn(),
  emitToRoom: jest.fn(),
  setRealtimeServer: jest.fn(),
  getRealtimeServer: jest.fn(),
}));

// ─── Typesense service mock ────────────────────────────────────────────────────
jest.mock('../../services/typesense.js', () => ({
  typesense: {
    collections: {
      retrieve: jest.fn().mockResolvedValue([]),
    },
  },
}));

// ─── Constants ─────────────────────────────────────────────────────────────────
const DELIVERY_PARTNER_ID = '550e8400-e29b-41d4-a716-446655440201';
const OTHER_PARTNER_ID    = '550e8400-e29b-41d4-a716-446655440202';
const CUSTOMER_ID         = '550e8400-e29b-41d4-a716-446655440203';
const SHOP_ID             = '550e8400-e29b-41d4-a716-446655440204';
const ORDER_ID            = '550e8400-e29b-41d4-a716-446655440205';

describe('Delivery Routes', () => {
  let deliveryToken;
  let otherDeliveryToken;
  let customerToken;
  let mockSupabase;
  let mockNotifyCustomerQueue;
  let mockAssignDeliveryQueue;
  let mockEmitOrderEvent;

  beforeAll(async () => {
    deliveryToken = generateToken({
      userId: DELIVERY_PARTNER_ID,
      phone: '9100000001',
      role: 'delivery',
    });

    otherDeliveryToken = generateToken({
      userId: OTHER_PARTNER_ID,
      phone: '9100000002',
      role: 'delivery',
    });

    customerToken = generateToken({
      userId: CUSTOMER_ID,
      phone: '9100000003',
      role: 'customer',
    });

    ({ supabase: mockSupabase } = await import('../../services/supabase.js'));
    ({ notifyCustomerQueue: mockNotifyCustomerQueue } = await import('../../jobs/notifyCustomer.js'));
    ({ assignDeliveryQueue: mockAssignDeliveryQueue } = await import('../../jobs/assignDelivery.js'));
    ({ emitOrderEvent: mockEmitOrderEvent } = await import('../../socket/ioRegistry.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const makeOrderRow = (overrides = {}) => ({
    id: ORDER_ID,
    customer_id: CUSTOMER_ID,
    shop_id: SHOP_ID,
    delivery_partner_id: DELIVERY_PARTNER_ID,
    status: 'assigned',
    total_paise: 15000,
    payment_method: 'cod',
    payment_status: 'pending',
    payment_id: null,
    cashfree_order_id: null,
    idempotency_key: null,
    accepted_at: null,
    delivered_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  const mockOrderSelect = (orderRow) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [orderRow], error: null }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: orderRow, error: null }),
          }),
          single: jest.fn().mockResolvedValue({ data: orderRow, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  };

  const mockOrderTransition = (initialOrder, updatedOrder) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [initialOrder], error: null }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: updatedOrder, error: null }),
          }),
          single: jest.fn().mockResolvedValue({ data: initialOrder, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  };

  // ─── GET /delivery/orders ──────────────────────────────────────────────────

  it('returns 401 when no auth header is provided', async () => {
    const res = await request(app)
      .get('/api/v1/delivery/orders')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('returns 403 when a customer tries to access delivery orders', async () => {
    const res = await request(app)
      .get('/api/v1/delivery/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns an array of orders for the authenticated delivery partner', async () => {
    const orderRow = makeOrderRow();
    mockOrderSelect(orderRow);

    const res = await request(app)
      .get('/api/v1/delivery/orders')
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].id).toBe(ORDER_ID);
    expect(res.body.data[0].deliveryPartnerId).toBe(DELIVERY_PARTNER_ID);
  });

  it('filters orders by status when ?status= is provided', async () => {
    const orderRow = makeOrderRow({ status: 'picked_up' });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .get('/api/v1/delivery/orders?status=picked_up')
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data[0].status).toBe('picked_up');
  });

  // ─── PATCH /delivery/orders/:id/accept ────────────────────────────────────

  it('returns 200 and the order when delivery partner accepts the assignment', async () => {
    const orderRow = makeOrderRow({ status: 'assigned' });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('assigned');
    expect(mockEmitOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      'order:status_updated',
      expect.objectContaining({ orderId: ORDER_ID, status: 'assigned' })
    );
  });

  it('returns 403 when a different delivery partner tries to accept the order', async () => {
    const orderRow = makeOrderRow({ delivery_partner_id: DELIVERY_PARTNER_ID });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${otherDeliveryToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 409 when trying to accept an order that is not in assigned state', async () => {
    const orderRow = makeOrderRow({ status: 'pending' });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(409);

    expect(res.body.error.code).toBe('ORDER_INVALID_TRANSITION');
  });

  it('returns 404 when order does not exist', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  // ─── PATCH /delivery/orders/:id/reject ────────────────────────────────────

  it('returns 200 when delivery partner rejects and order reverts to ready', async () => {
    const initialOrder = makeOrderRow({ status: 'assigned' });
    const rejectedOrder = makeOrderRow({ status: 'ready', delivery_partner_id: null });
    mockOrderTransition(initialOrder, rejectedOrder);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/reject`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ready');
    expect(mockAssignDeliveryQueue.add).toHaveBeenCalledWith(
      'assign-delivery',
      expect.objectContaining({ orderId: ORDER_ID })
    );
    expect(mockEmitOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      'order:status_updated',
      expect.objectContaining({ orderId: ORDER_ID, status: 'ready' })
    );
  });

  it('returns 403 when a different partner tries to reject the order', async () => {
    const orderRow = makeOrderRow({ delivery_partner_id: DELIVERY_PARTNER_ID });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/reject`)
      .set('Authorization', `Bearer ${otherDeliveryToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 409 when trying to reject an order not in assigned state', async () => {
    const orderRow = makeOrderRow({ status: 'picked_up' });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/reject`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(409);

    expect(res.body.error.code).toBe('ORDER_INVALID_TRANSITION');
  });

  // ─── PATCH /delivery/orders/:id/pickup ────────────────────────────────────

  it('transitions order to picked_up and notifies customer', async () => {
    const initialOrder = makeOrderRow({ status: 'assigned' });
    const pickedUpOrder = makeOrderRow({ status: 'picked_up' });
    mockOrderTransition(initialOrder, pickedUpOrder);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/pickup`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('picked_up');
    expect(mockNotifyCustomerQueue.add).toHaveBeenCalledWith(
      'notify-customer',
      expect.objectContaining({ orderId: ORDER_ID, status: 'picked_up' })
    );
    expect(mockEmitOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      'order:status_updated',
      expect.objectContaining({ orderId: ORDER_ID, status: 'picked_up' })
    );
  });

  it('returns 403 when a different partner tries to mark pickup', async () => {
    const orderRow = makeOrderRow({ delivery_partner_id: DELIVERY_PARTNER_ID });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/pickup`)
      .set('Authorization', `Bearer ${otherDeliveryToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 409 when pickup is called on an order not in assigned state', async () => {
    const orderRow = makeOrderRow({ status: 'pending' });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/pickup`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(409);

    expect(res.body.error.code).toBe('ORDER_INVALID_TRANSITION');
  });

  // ─── PATCH /delivery/orders/:id/deliver ───────────────────────────────────

  it('transitions order to delivered from picked_up and notifies customer', async () => {
    const initialOrder = makeOrderRow({ status: 'picked_up' });
    const deliveredOrder = makeOrderRow({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    });
    mockOrderTransition(initialOrder, deliveredOrder);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/deliver`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('delivered');
    expect(res.body.data.deliveredAt).toBeTruthy();
    expect(mockNotifyCustomerQueue.add).toHaveBeenCalledWith(
      'notify-customer',
      expect.objectContaining({ orderId: ORDER_ID, status: 'delivered' })
    );
    expect(mockEmitOrderEvent).toHaveBeenCalledWith(
      ORDER_ID,
      'order:status_updated',
      expect.objectContaining({ orderId: ORDER_ID, status: 'delivered' })
    );
  });

  it('transitions order to delivered from out_for_delivery', async () => {
    const initialOrder = makeOrderRow({ status: 'out_for_delivery' });
    const deliveredOrder = makeOrderRow({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    });
    mockOrderTransition(initialOrder, deliveredOrder);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/deliver`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(200);

    expect(res.body.data.status).toBe('delivered');
  });

  it('returns 403 when a different partner tries to mark delivery', async () => {
    const orderRow = makeOrderRow({
      status: 'picked_up',
      delivery_partner_id: DELIVERY_PARTNER_ID,
    });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/deliver`)
      .set('Authorization', `Bearer ${otherDeliveryToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 409 when deliver is called on an order in wrong state', async () => {
    const orderRow = makeOrderRow({ status: 'assigned' });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/deliver`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(409);

    expect(res.body.error.code).toBe('ORDER_INVALID_TRANSITION');
  });

  it('returns 404 when order does not exist on deliver', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/deliver`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('response shape contains all expected camelCase fields', async () => {
    const orderRow = makeOrderRow({ status: 'assigned' });
    mockOrderSelect(orderRow);

    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/accept`)
      .set('Authorization', `Bearer ${deliveryToken}`)
      .expect(200);

    const { data } = res.body;
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('customerId');
    expect(data).toHaveProperty('shopId');
    expect(data).toHaveProperty('deliveryPartnerId');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('totalPaise');
    expect(data).toHaveProperty('paymentMethod');
    expect(data).toHaveProperty('paymentStatus');
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('updatedAt');
    // DB internals must NOT be exposed
    expect(data).not.toHaveProperty('cashfree_order_id');
    expect(data).not.toHaveProperty('idempotency_key');
  });

  it('returns 401 when no auth is provided on accept route', async () => {
    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/accept`)
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('returns 403 when a customer tries to use delivery routes', async () => {
    const res = await request(app)
      .patch(`/api/v1/delivery/orders/${ORDER_ID}/pickup`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
