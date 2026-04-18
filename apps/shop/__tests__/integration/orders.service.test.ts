/**
 * Integration tests for orders service — getOrders, getOrderDetail, acceptOrder, rejectOrder
 */

jest.mock('@/services/api', () => ({
  client: {
    get: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

import { client } from '@/services/api';
import {
  getOrders,
  getOrderDetail,
  acceptOrder,
  rejectOrder,
} from '@/services/orders';
import { AppError } from '@/types/common';
import { Order } from '@/types/orders';

const mockGet = client.get as jest.MockedFunction<typeof client.get>;
const mockPatch = client.patch as jest.MockedFunction<typeof client.patch>;

const ORDER: Order = {
  id: 'order-1',
  shopId: 'shop-1',
  customerId: 'cust-1',
  customerName: 'Test User',
  customerPhone: '9876543210',
  deliveryAddress: '123 Main St',
  items: [
    { productId: 'p1', productName: 'Apple', quantity: 2, price: 5000, subtotal: 10000 },
  ],
  subtotal: 10000,
  deliveryFee: 2500,
  total: 12500,
  status: 'pending',
  paymentMode: 'upi',
  createdAt: '2026-04-18T08:00:00Z',
  updatedAt: '2026-04-18T08:00:00Z',
  acceptanceDeadline: '2026-04-18T08:03:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getOrders', () => {
  it('returns list of orders on success', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        data: [ORDER],
        meta: { page: 1, total: 1, pages: 1 },
      },
    });

    const result = await getOrders(1, 20);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('order-1');
    expect(result.meta.total).toBe(1);
  });

  it('passes status filter in query params', async () => {
    mockGet.mockResolvedValueOnce({
      data: { success: true, data: [], meta: { page: 1, total: 0, pages: 0 } },
    });

    await getOrders(1, 20, 'pending');

    expect(mockGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ params: { page: 1, limit: 20, status: 'pending' } })
    );
  });

  it('omits status from params when not provided', async () => {
    mockGet.mockResolvedValueOnce({
      data: { success: true, data: [], meta: { page: 1, total: 0, pages: 0 } },
    });

    await getOrders(1, 20);

    const callParams = (mockGet.mock.calls[0][1] as any)?.params;
    expect(callParams).not.toHaveProperty('status');
  });

  it('throws AppError on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    await expect(getOrders()).rejects.toThrow(AppError);
  });
});

describe('getOrderDetail', () => {
  it('returns single order', async () => {
    mockGet.mockResolvedValueOnce({
      data: { success: true, data: ORDER },
    });

    const result = await getOrderDetail('order-1');
    expect(result.id).toBe('order-1');
  });

  it('throws ORDER_NOT_FOUND on 404', async () => {
    const axiosError = Object.assign(new Error('Not Found'), {
      isAxiosError: true,
      response: { status: 404, data: {} },
    });
    mockGet.mockRejectedValueOnce(axiosError);

    const err = await getOrderDetail('order-1').catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('ORDER_NOT_FOUND');
  });

  it('throws ORDER_NOT_AUTHORIZED on 403', async () => {
    const axiosError = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: { status: 403, data: {} },
    });
    mockGet.mockRejectedValueOnce(axiosError);

    const err = await getOrderDetail('order-1').catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('ORDER_NOT_AUTHORIZED');
  });
});

describe('acceptOrder', () => {
  it('returns updated order on success', async () => {
    mockPatch.mockResolvedValueOnce({
      data: { success: true, data: { ...ORDER, status: 'accepted' } },
    });

    const result = await acceptOrder('order-1');
    expect(result.status).toBe('accepted');
  });

  it('throws ORDER_ALREADY_ACCEPTED when server returns that code', async () => {
    const axiosError = Object.assign(new Error('Conflict'), {
      isAxiosError: true,
      response: {
        status: 409,
        data: { error: { code: 'ORDER_ALREADY_ACCEPTED' } },
      },
    });
    mockPatch.mockRejectedValueOnce(axiosError);

    const err = await acceptOrder('order-1').catch((e) => e);
    expect(err.code).toBe('ORDER_ALREADY_ACCEPTED');
  });

  it('throws ORDER_EXPIRED when server returns that code', async () => {
    const axiosError = Object.assign(new Error('Conflict'), {
      isAxiosError: true,
      response: {
        status: 409,
        data: { error: { code: 'ORDER_EXPIRED' } },
      },
    });
    mockPatch.mockRejectedValueOnce(axiosError);

    const err = await acceptOrder('order-1').catch((e) => e);
    expect(err.code).toBe('ORDER_EXPIRED');
  });

  it('throws ORDER_NOT_FOUND on 404', async () => {
    const axiosError = Object.assign(new Error('Not Found'), {
      isAxiosError: true,
      response: { status: 404, data: {} },
    });
    mockPatch.mockRejectedValueOnce(axiosError);

    const err = await acceptOrder('order-1').catch((e) => e);
    expect(err.code).toBe('ORDER_NOT_FOUND');
  });
});

describe('rejectOrder', () => {
  it('returns updated order on success', async () => {
    mockPatch.mockResolvedValueOnce({
      data: { success: true, data: { ...ORDER, status: 'cancelled' } },
    });

    const result = await rejectOrder('order-1', 'Out of stock');
    expect(result.status).toBe('cancelled');
    expect(mockPatch).toHaveBeenCalledWith(
      expect.any(String),
      { status: 'rejected', reason: 'Out of stock' }
    );
  });

  it('throws ORDER_NOT_FOUND on 404', async () => {
    const axiosError = Object.assign(new Error('Not Found'), {
      isAxiosError: true,
      response: { status: 404, data: {} },
    });
    mockPatch.mockRejectedValueOnce(axiosError);

    const err = await rejectOrder('order-1', 'reason').catch((e) => e);
    expect(err.code).toBe('ORDER_NOT_FOUND');
  });

  it('throws ORDER_CANNOT_REJECT on 409', async () => {
    const axiosError = Object.assign(new Error('Conflict'), {
      isAxiosError: true,
      response: { status: 409, data: {} },
    });
    mockPatch.mockRejectedValueOnce(axiosError);

    const err = await rejectOrder('order-1', 'reason').catch((e) => e);
    expect(err.code).toBe('ORDER_CANNOT_REJECT');
  });
});
