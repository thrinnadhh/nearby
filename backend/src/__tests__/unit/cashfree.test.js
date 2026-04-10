import https from 'https';
import { EventEmitter } from 'events';

// Set required env vars before importing the module
process.env.CASHFREE_APP_ID = 'test_app_id';
process.env.CASHFREE_SECRET_KEY = 'test_secret_key';
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

// Dynamic import after env vars set
let createPaymentSession, getPaymentStatus, refundPayment, createPaymentSplit;

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

describe('cashfree.createPaymentSession', () => {
  it('resolves with response on success', async () => {
    const response = { payment_session_id: 'session_abc', order_id: 'order_123' };
    mockHttpsRequest(200, response);

    const result = await createPaymentSession({
      order_id: 'order_123',
      order_amount: 500,
      order_currency: 'INR',
    });

    expect(result).toEqual(response);
  });

  it('rejects when Cashfree returns 4xx', async () => {
    mockHttpsRequest(400, { message: 'Invalid request' });

    await expect(
      createPaymentSession({ order_id: 'bad_order' })
    ).rejects.toThrow('Invalid request');
  });

  it('rejects on network error', async () => {
    mockHttpsRequestError('ECONNREFUSED');

    await expect(
      createPaymentSession({ order_id: 'order_net_err' })
    ).rejects.toThrow('ECONNREFUSED');
  });
});

describe('cashfree.getPaymentStatus', () => {
  it('resolves with payment status on success', async () => {
    const response = { order_id: 'order_123', order_status: 'PAID' };
    mockHttpsRequest(200, response);

    const result = await getPaymentStatus('order_123');

    expect(result).toEqual(response);
  });

  it('rejects when order not found', async () => {
    mockHttpsRequest(404, { message: 'Order not found' });

    await expect(getPaymentStatus('missing_order')).rejects.toThrow('Order not found');
  });

  it('rejects on network error', async () => {
    mockHttpsRequestError('ETIMEDOUT');

    await expect(getPaymentStatus('order_timeout')).rejects.toThrow('ETIMEDOUT');
  });
});

describe('cashfree.refundPayment', () => {
  it('resolves with refund response on success', async () => {
    const response = { refund_id: 'refund_abc', refund_status: 'PENDING' };
    mockHttpsRequest(200, response);

    const result = await refundPayment('pay_123', 5000, 'customer_request');

    expect(result).toEqual(response);
  });

  it('converts paise to rupees for refund_amount', async () => {
    let capturedBody = '';
    const resEmitter = new EventEmitter();
    resEmitter.statusCode = 200;

    const reqEmitter = new EventEmitter();
    reqEmitter.write = jest.fn((body) => { capturedBody = body; });
    reqEmitter.end = jest.fn(() => {
      process.nextTick(() => {
        resEmitter.emit('data', JSON.stringify({ refund_id: 'refund_abc' }));
        resEmitter.emit('end');
      });
    });
    https.request.mockImplementation((_options, callback) => {
      process.nextTick(() => callback(resEmitter));
      return reqEmitter;
    });

    await refundPayment('pay_123', 10000);

    const parsed = JSON.parse(capturedBody);
    expect(parsed.refund_amount).toBe(100);
  });

  it('rejects on Cashfree error', async () => {
    mockHttpsRequest(422, { message: 'Refund not allowed' });

    await expect(refundPayment('pay_bad', 100)).rejects.toThrow('Refund not allowed');
  });
});

describe('cashfree.createPaymentSplit', () => {
  it('resolves with split response on success', async () => {
    const response = { split_id: 'split_abc', status: 'SUCCESS' };
    mockHttpsRequest(200, response);

    const splits = [
      { vendor_id: 'shop_1', amount: 450, percentage: 90 },
    ];
    const result = await createPaymentSplit('pay_123', splits);

    expect(result).toEqual(response);
  });

  it('rejects on Cashfree error', async () => {
    mockHttpsRequest(400, { message: 'Invalid split configuration' });

    await expect(createPaymentSplit('pay_bad', [])).rejects.toThrow(
      'Invalid split configuration'
    );
  });

  it('rejects on network error', async () => {
    mockHttpsRequestError('ENOTFOUND');

    await expect(createPaymentSplit('pay_123', [])).rejects.toThrow('ENOTFOUND');
  });
});
