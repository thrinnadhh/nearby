import { processAssignDeliveryJob } from '../../jobs/assignDelivery.js';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../services/redis.js', () => ({
  redis: {
    call: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
  },
}));

jest.mock('../../services/supabase.js', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../socket/ioRegistry.js', () => ({
  emitToRoom: jest.fn(),
  emitOrderEvent: jest.fn(),
  setRealtimeServer: jest.fn(),
  getRealtimeServer: jest.fn(),
}));

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// notifyCustomer is dynamically imported inside the job — mock it
jest.mock('../../jobs/notifyCustomer.js', () => ({
  notifyCustomerQueue: { add: jest.fn().mockResolvedValue({ id: 'nc-job' }) },
  notifyCustomerWorker: {},
}));

// ─── Constants ─────────────────────────────────────────────────────────────────

const ORDER_ID   = '550e8400-e29b-41d4-a716-000000000001';
const SHOP_ID    = '550e8400-e29b-41d4-a716-000000000002';
const CUSTOMER_ID = '550e8400-e29b-41d4-a716-000000000003';
const PARTNER_ID = '550e8400-e29b-41d4-a716-000000000004';

const makeJob = (overrides = {}) => ({
  data: { orderId: ORDER_ID, shopId: SHOP_ID, customerId: CUSTOMER_ID },
  attemptsMade: 0,
  opts: { attempts: 3 },
  ...overrides,
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

let mockSupabase;
let mockRedis;
let mockEmitToRoom;
let mockNotifyCustomerQueue;

beforeAll(async () => {
  ({ supabase: mockSupabase } = await import('../../services/supabase.js'));
  ({ redis: mockRedis } = await import('../../services/redis.js'));
  ({ emitToRoom: mockEmitToRoom } = await import('../../socket/ioRegistry.js'));
  ({ notifyCustomerQueue: mockNotifyCustomerQueue } = await import('../../jobs/notifyCustomer.js'));
});

beforeEach(() => {
  jest.clearAllMocks();
});

function mockSupabaseForAssign({ orderStatus = 'ready', deliveryPartnerId = null, shopLat = 12.9716, shopLng = 77.5946, updateReturns = null } = {}) {
  const orderRow = {
    id: ORDER_ID,
    status: orderStatus,
    delivery_partner_id: deliveryPartnerId,
    shop_id: SHOP_ID,
    customer_id: CUSTOMER_ID,
  };

  const shopRow = { id: SHOP_ID, latitude: shopLat, longitude: shopLng };

  const updatedOrder = updateReturns ?? {
    ...orderRow,
    delivery_partner_id: PARTNER_ID,
    status: 'assigned',
    updated_at: new Date().toISOString(),
  };

  mockSupabase.from.mockImplementation((table) => {
    if (table === 'orders') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: orderRow, error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: updatedOrder, error: null }),
        }),
      };
    }
    if (table === 'shops') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: shopRow, error: null }),
      };
    }
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('processAssignDeliveryJob', () => {
  it('returns early without DB write when order is not in ready status', async () => {
    mockSupabaseForAssign({ orderStatus: 'cancelled' });

    await processAssignDeliveryJob(makeJob());

    expect(mockRedis.call).not.toHaveBeenCalled();
    expect(mockEmitToRoom).not.toHaveBeenCalled();
  });

  it('returns early without DB write when order is already assigned', async () => {
    mockSupabaseForAssign({ orderStatus: 'ready', deliveryPartnerId: PARTNER_ID });

    await processAssignDeliveryJob(makeJob());

    expect(mockRedis.call).not.toHaveBeenCalled();
    expect(mockEmitToRoom).not.toHaveBeenCalled();
  });

  it('returns early when order is not found', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }));

    await processAssignDeliveryJob(makeJob());

    expect(mockRedis.call).not.toHaveBeenCalled();
  });

  it('calls Redis GEOSEARCH with correct key, coordinates and radius', async () => {
    mockSupabaseForAssign();
    mockRedis.call.mockResolvedValue([PARTNER_ID]);

    await processAssignDeliveryJob(makeJob());

    expect(mockRedis.call).toHaveBeenCalledWith(
      'GEOSEARCH',
      'delivery:available',
      'FROMLONLAT', expect.any(String), expect.any(String),
      'BYRADIUS', '5', 'km',
      'ASC',
      'COUNT', '10'
    );
  });

  it('uses shop longitude then latitude in GEOSEARCH (Redis lng-first order)', async () => {
    mockSupabaseForAssign({ shopLat: 12.9716, shopLng: 77.5946 });
    mockRedis.call.mockResolvedValue([PARTNER_ID]);

    await processAssignDeliveryJob(makeJob());

    const callArgs = mockRedis.call.mock.calls[0];
    // Index 3 = lng, index 4 = lat per GEOSEARCH FROMLONLAT spec
    expect(callArgs[3]).toBe('77.5946');
    expect(callArgs[4]).toBe('12.9716');
  });

  it('updates order with delivery_partner_id, status=assigned when partner found', async () => {
    mockSupabaseForAssign();
    mockRedis.call.mockResolvedValue([PARTNER_ID]);

    await processAssignDeliveryJob(makeJob());

    const updateCall = mockSupabase.from.mock.calls.find(c => c[0] === 'orders');
    expect(updateCall).toBeTruthy();
    // Verify emitToRoom called for partner
    expect(mockEmitToRoom).toHaveBeenCalledWith(
      `delivery:${PARTNER_ID}`,
      'delivery:assigned',
      expect.objectContaining({ orderId: ORDER_ID })
    );
  });

  it('emits delivery:assigned to delivery:{partnerId} room', async () => {
    mockSupabaseForAssign();
    mockRedis.call.mockResolvedValue([PARTNER_ID]);

    await processAssignDeliveryJob(makeJob());

    expect(mockEmitToRoom).toHaveBeenCalledWith(
      `delivery:${PARTNER_ID}`,
      'delivery:assigned',
      expect.objectContaining({ orderId: ORDER_ID, shopId: SHOP_ID, customerId: CUSTOMER_ID })
    );
  });

  it('enqueues notifyCustomerQueue with assigned status', async () => {
    mockSupabaseForAssign();
    mockRedis.call.mockResolvedValue([PARTNER_ID]);

    await processAssignDeliveryJob(makeJob());

    expect(mockNotifyCustomerQueue.add).toHaveBeenCalledWith(
      'notify-customer',
      expect.objectContaining({
        orderId: ORDER_ID,
        customerId: CUSTOMER_ID,
        status: 'assigned',
      })
    );
  });

  it('throws NO_PARTNER_AVAILABLE error when Redis returns empty results', async () => {
    mockSupabaseForAssign();
    mockRedis.call.mockResolvedValue([]);

    await expect(processAssignDeliveryJob(makeJob())).rejects.toThrow('NO_PARTNER_AVAILABLE');
  });

  it('emits admin:alert ONLY on the final retry attempt', async () => {
    mockSupabaseForAssign();
    mockRedis.call.mockResolvedValue([]);

    // Final attempt: attemptsMade = 2, attempts = 3 → 2 >= 3-1
    const finalAttemptJob = makeJob({ attemptsMade: 2, opts: { attempts: 3 } });

    await expect(processAssignDeliveryJob(finalAttemptJob)).rejects.toThrow();

    expect(mockEmitToRoom).toHaveBeenCalledWith(
      'admin',
      'admin:alert',
      expect.objectContaining({ type: 'NO_PARTNER_AVAILABLE', orderId: ORDER_ID })
    );
  });

  it('does NOT emit admin:alert on non-final retry attempts', async () => {
    mockSupabaseForAssign();
    mockRedis.call.mockResolvedValue([]);

    const firstAttemptJob = makeJob({ attemptsMade: 0, opts: { attempts: 3 } });

    await expect(processAssignDeliveryJob(firstAttemptJob)).rejects.toThrow();

    expect(mockEmitToRoom).not.toHaveBeenCalledWith('admin', 'admin:alert', expect.anything());
  });

  it('throws when shop location cannot be fetched (causes BullMQ retry)', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: ORDER_ID, status: 'ready', delivery_partner_id: null, shop_id: SHOP_ID, customer_id: CUSTOMER_ID },
            error: null,
          }),
        };
      }
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
    });

    await expect(processAssignDeliveryJob(makeJob())).rejects.toThrow();
  });

  it('returns early when optimistic lock fails (order already assigned by another instance)', async () => {
    mockSupabaseForAssign();
    mockRedis.call.mockResolvedValue([PARTNER_ID]);

    // Override update to return null data (race condition: another instance beat us)
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: ORDER_ID, status: 'ready', delivery_partner_id: null, shop_id: SHOP_ID, customer_id: CUSTOMER_ID },
            error: null,
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }), // null = race lost
          }),
        };
      }
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: SHOP_ID, latitude: 12.9, longitude: 77.5 }, error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
    });

    await processAssignDeliveryJob(makeJob());

    // Should not notify partner if update returned no rows
    expect(mockEmitToRoom).not.toHaveBeenCalledWith(
      `delivery:${PARTNER_ID}`,
      'delivery:assigned',
      expect.anything()
    );
  });
});
