import { registerGpsTracker } from '../../socket/gpsTracker.js';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../services/redis.js', () => ({
  redis: {
    call: jest.fn().mockResolvedValue('OK'),
    expire: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
  },
}));

jest.mock('../../services/supabase.js', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../services/tomTom.js', () => ({
  getETA: jest.fn().mockResolvedValue(420),
  geocode: jest.fn(),
  reverseGeocode: jest.fn(),
  getDistanceMatrix: jest.fn(),
  getRoute: jest.fn(),
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

// ─── Constants ─────────────────────────────────────────────────────────────────

const PARTNER_ID  = '550e8400-e29b-41d4-a716-000000000010';
const ORDER_ID    = '550e8400-e29b-41d4-a716-000000000011';
const SHOP_ID     = '550e8400-e29b-41d4-a716-000000000012';
const CUSTOMER_ID = '550e8400-e29b-41d4-a716-000000000013';

// Valid Hyderabad coordinates
const VALID_LAT = 17.385;
const VALID_LNG = 78.4867;

// ─── Helpers ───────────────────────────────────────────────────────────────────

let mockRedis;
let mockSupabase;
let mockGetETA;

beforeAll(async () => {
  ({ redis: mockRedis } = await import('../../services/redis.js'));
  ({ supabase: mockSupabase } = await import('../../services/supabase.js'));
  ({ getETA: mockGetETA } = await import('../../services/tomTom.js'));
});

beforeEach(() => {
  jest.clearAllMocks();
});

function makeSocket(overrides = {}) {
  return {
    userId: PARTNER_ID,
    role: 'delivery',
    id: 'socket-abc',
    emit: jest.fn(),
    ...overrides,
  };
}

function makeIo() {
  const emitFn = jest.fn();
  return {
    to: jest.fn().mockReturnValue({ emit: emitFn }),
    _emit: emitFn,
  };
}

function mockOrderFor(status, deliveryPartnerId = PARTNER_ID) {
  mockSupabase.from.mockImplementation((table) => {
    if (table === 'orders') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: ORDER_ID, delivery_partner_id: deliveryPartnerId, status, customer_id: CUSTOMER_ID, shop_id: SHOP_ID },
          error: null,
        }),
      };
    }
    if (table === 'shops') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { latitude: 17.39, longitude: 78.49 },
          error: null,
        }),
      };
    }
    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
  });
}

function triggerGpsUpdate(socket, io, payload) {
  return new Promise((resolve) => {
    registerGpsTracker(io, socket);
    // The handler is registered synchronously; trigger it
    const handler = socket._handlers?.['gps:update'];
    if (handler) {
      handler(payload).then(resolve).catch(resolve);
    } else {
      // Use socket.on spy approach — find the registered handler
      resolve();
    }
  });
}

// Better approach: capture the handler directly
function setupAndTrigger(socketOverrides, io, payload) {
  const socket = makeSocket(socketOverrides);
  const handlers = {};
  socket.on = jest.fn((event, fn) => { handlers[event] = fn; });

  registerGpsTracker(io, socket);

  return handlers['gps:update']?.(payload) ?? Promise.resolve();
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('registerGpsTracker', () => {
  it('registers gps:update handler on socket', () => {
    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();

    registerGpsTracker(io, socket);

    expect(socket.on).toHaveBeenCalledWith('gps:update', expect.any(Function));
  });

  it('emits gps:error FORBIDDEN when socket.role is not delivery', async () => {
    const socket = makeSocket({ role: 'customer' });
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    expect(socket.emit).toHaveBeenCalledWith('gps:error', expect.objectContaining({ code: 'FORBIDDEN' }));
    expect(mockRedis.call).not.toHaveBeenCalled();
  });

  it('emits gps:error VALIDATION_ERROR when orderId is missing', async () => {
    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ lat: VALID_LAT, lng: VALID_LNG }); // no orderId

    expect(socket.emit).toHaveBeenCalledWith('gps:error', expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    expect(mockRedis.call).not.toHaveBeenCalled();
  });

  it('emits gps:error VALIDATION_ERROR when lat is below India lower bound (out of bounds)', async () => {
    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: 0, lng: VALID_LNG }); // lat: 0 is outside India

    expect(socket.emit).toHaveBeenCalledWith('gps:error', expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    expect(mockRedis.call).not.toHaveBeenCalled();
  });

  it('emits gps:error VALIDATION_ERROR when lng is outside India bounds', async () => {
    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: 200 }); // lng: 200 is invalid

    expect(socket.emit).toHaveBeenCalledWith('gps:error', expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    expect(mockRedis.call).not.toHaveBeenCalled();
  });

  it('emits gps:error ORDER_NOT_FOUND when order does not exist', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }));

    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    expect(socket.emit).toHaveBeenCalledWith('gps:error', expect.objectContaining({ code: 'ORDER_NOT_FOUND' }));
  });

  it('emits gps:error FORBIDDEN when socket.userId does not match delivery_partner_id', async () => {
    mockOrderFor('picked_up', 'different-partner-id');

    const socket = makeSocket({ userId: PARTNER_ID }); // PARTNER_ID !== 'different-partner-id'
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    expect(socket.emit).toHaveBeenCalledWith('gps:error', expect.objectContaining({ code: 'FORBIDDEN' }));
    expect(mockRedis.call).not.toHaveBeenCalled();
  });

  it('emits gps:error INVALID_ORDER_STATUS when order is in assigned state', async () => {
    mockOrderFor('assigned');

    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    expect(socket.emit).toHaveBeenCalledWith('gps:error', expect.objectContaining({ code: 'INVALID_ORDER_STATUS' }));
    expect(mockRedis.call).not.toHaveBeenCalled();
  });

  it('emits gps:error INVALID_ORDER_STATUS when order is delivered', async () => {
    mockOrderFor('delivered');

    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    expect(socket.emit).toHaveBeenCalledWith('gps:error', expect.objectContaining({ code: 'INVALID_ORDER_STATUS' }));
  });

  it('calls redis GEOADD with correct key and lng-first order on valid update', async () => {
    mockOrderFor('picked_up');

    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    expect(mockRedis.call).toHaveBeenCalledWith(
      'GEOADD',
      `delivery:${ORDER_ID}`,
      String(VALID_LNG),
      String(VALID_LAT),
      PARTNER_ID
    );
  });

  it('calls redis EXPIRE with 30s TTL after GEOADD', async () => {
    mockOrderFor('picked_up');

    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    expect(mockRedis.expire).toHaveBeenCalledWith(`delivery:${ORDER_ID}`, 30);
  });

  it('broadcasts gps:position to order:{orderId} room with lat, lng, eta, timestamp', async () => {
    mockOrderFor('picked_up');
    mockGetETA.mockResolvedValue(300);

    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    expect(io.to).toHaveBeenCalledWith(`order:${ORDER_ID}`);
    expect(io._emit).toHaveBeenCalledWith(
      'gps:position',
      expect.objectContaining({
        lat: VALID_LAT,
        lng: VALID_LNG,
        eta: 300,
        timestamp: expect.any(Number),
      })
    );
  });

  it('broadcasts gps:position with eta:null when getETA returns null (non-blocking)', async () => {
    mockOrderFor('picked_up');
    mockGetETA.mockResolvedValue(null);

    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    // Broadcast must still happen even though ETA is null
    expect(io.to).toHaveBeenCalledWith(`order:${ORDER_ID}`);
    expect(io._emit).toHaveBeenCalledWith(
      'gps:position',
      expect.objectContaining({ lat: VALID_LAT, lng: VALID_LNG, eta: null })
    );
  });

  it('broadcasts gps:position with eta:null when getETA throws', async () => {
    mockOrderFor('out_for_delivery');
    mockGetETA.mockRejectedValue(new Error('Ola Maps unavailable'));

    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    // GPS broadcast should still go through despite ETA failure
    expect(io.to).toHaveBeenCalledWith(`order:${ORDER_ID}`);
    expect(io._emit).toHaveBeenCalledWith(
      'gps:position',
      expect.objectContaining({ eta: null })
    );
  });

  it('accepts GPS updates when order status is out_for_delivery', async () => {
    mockOrderFor('out_for_delivery');

    const socket = makeSocket();
    socket.on = jest.fn();
    const io = makeIo();
    registerGpsTracker(io, socket);

    const handler = socket.on.mock.calls.find(c => c[0] === 'gps:update')?.[1];
    await handler({ orderId: ORDER_ID, lat: VALID_LAT, lng: VALID_LNG });

    // Should write to Redis and broadcast
    expect(mockRedis.call).toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith(`order:${ORDER_ID}`);
    expect(socket.emit).not.toHaveBeenCalledWith('gps:error', expect.anything());
  });
});
