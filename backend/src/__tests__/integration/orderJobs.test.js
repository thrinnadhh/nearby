jest.mock('../../services/supabase.js', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../jobs/notifyCustomer.js', () => ({
  notifyCustomerQueue: {
    add: jest.fn().mockResolvedValue({ id: 'notify-customer-job' }),
  },
  notifyCustomerWorker: {},
}));

jest.mock('../../services/cashfree.js', () => ({
  refundPayment: jest.fn().mockResolvedValue({ refund_id: 'refund-123' }),
}));

jest.mock('../../services/msg91.js', () => ({
  sendNotification: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../services/fcm.js', () => ({
  sendHighPriorityNotification: jest.fn().mockResolvedValue({ name: 'fcm-message' }),
}));

describe('Order jobs', () => {
  let mockSupabase;
  let processAutoCancelJob;
  let processNotifyShopJob;
  let mockNotifyCustomerQueue;
  let mockRefundPayment;
  let mockSendNotification;
  let mockSendHighPriorityNotification;

  beforeAll(async () => {
    ({ supabase: mockSupabase } = await import('../../services/supabase.js'));
    ({ processAutoCancelJob } = await import('../../jobs/autoCancel.js'));
    ({ processNotifyShopJob } = await import('../../jobs/notifyShop.js'));
    ({ notifyCustomerQueue: mockNotifyCustomerQueue } = await import('../../jobs/notifyCustomer.js'));
    ({ refundPayment: mockRefundPayment } = await import('../../services/cashfree.js'));
    ({ sendNotification: mockSendNotification } = await import('../../services/msg91.js'));
    ({ sendHighPriorityNotification: mockSendHighPriorityNotification } = await import('../../services/fcm.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips auto-cancel when the order was already accepted', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'order-1', status: 'accepted' },
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const result = await processAutoCancelJob({ id: 'job-1', data: { orderId: 'order-1' } });

    expect(result).toEqual({ skipped: true });
    expect(mockNotifyCustomerQueue.add).not.toHaveBeenCalled();
  });

  it('auto-cancels pending orders, restores stock, refunds, and notifies the customer', async () => {
    const order = {
      id: 'order-2',
      status: 'pending',
      customer_id: 'customer-1',
      shop_id: 'shop-1',
      payment_method: 'upi',
      payment_id: 'pay_auto',
      total_paise: 13000,
    };
    const orderItems = [
      { product_id: 'product-1', quantity: 2, cancelled_quantity: 0 },
    ];
    const products = [
      { id: 'product-1', stock_quantity: 3 },
    ];
    const updates = {
      orders: [],
      products: [],
      shops: [],
    };

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: order, error: null }),
          update: jest.fn((patch) => ({
            eq: jest.fn(async () => {
              updates.orders.push(patch);
              return { data: null, error: null };
            }),
          })),
        };
      }

      if (table === 'order_items') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: orderItems, error: null }),
        };
      }

      if (table === 'products') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: products, error: null }),
          update: jest.fn((patch) => ({
            eq: jest.fn(async () => {
              updates.products.push(patch);
              return { data: null, error: null };
            }),
          })),
        };
      }

      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'shop-1', trust_score: 50 },
            error: null,
          }),
          update: jest.fn((patch) => ({
            eq: jest.fn(async () => {
              updates.shops.push(patch);
              return { data: null, error: null };
            }),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const result = await processAutoCancelJob({ id: 'job-2', data: { orderId: 'order-2' } });

    expect(result).toEqual({ skipped: false });
    expect(updates.products[0]).toEqual({ stock_quantity: 5, is_available: true });
    expect(updates.orders[0]).toEqual(
      expect.objectContaining({ status: 'auto_cancelled', payment_status: 'failed' })
    );
    expect(updates.shops[0]).toEqual({ trust_score: 49 });
    expect(mockRefundPayment).toHaveBeenCalledWith('pay_auto', 13000, 'auto_cancelled');
    expect(mockNotifyCustomerQueue.add).toHaveBeenCalledWith(
      'notify-customer',
      expect.objectContaining({ orderId: 'order-2', customerId: 'customer-1', status: 'auto_cancelled' })
    );
  });

  it('uses FCM for shop notifications when a device token is present', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { name: 'Fresh Mart', phone: '+919999999999', owner_id: 'owner-1' },
            error: null,
          }),
        };
      }

      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'owner-1', fcm_token: 'device-token-123' },
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    await processNotifyShopJob({
      id: 'job-3',
      data: { orderId: 'order-3', shopId: 'shop-1', itemCount: 2, total: 13000 },
    });

    expect(mockSendHighPriorityNotification).toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('falls back to SMS when no FCM token is available', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { name: 'Fresh Mart', phone: '+919999999999', owner_id: 'owner-1' },
            error: null,
          }),
        };
      }

      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'owner-1' },
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    await processNotifyShopJob({
      id: 'job-4',
      data: { orderId: 'order-4', shopId: 'shop-1', itemCount: 1, total: 6500 },
    });

    expect(mockSendNotification).toHaveBeenCalledWith(
      '+919999999999',
      expect.stringContaining('Order ID: order-4')
    );
  });
});
