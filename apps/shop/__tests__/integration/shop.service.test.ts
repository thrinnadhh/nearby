/**
 * Integration tests for shop service — getShopProfile, toggleShopStatus, getEarningsData
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
import { getShopProfile, toggleShopStatus, getEarningsData } from '@/services/shop';
import { AppError } from '@/types/common';

const mockGet = client.get as jest.MockedFunction<typeof client.get>;
const mockPatch = client.patch as jest.MockedFunction<typeof client.patch>;

const PROFILE = {
  id: 'shop-1',
  name: 'My Kirana',
  category: 'grocery',
  isOpen: true,
  address: '123 Main St',
  phone: '9876543210',
  trustScore: 85,
  kycStatus: 'approved',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getShopProfile', () => {
  it('returns shop profile on success', async () => {
    mockGet.mockResolvedValueOnce({
      data: { success: true, data: PROFILE },
    });

    const result = await getShopProfile('shop-1');
    expect(result.id).toBe('shop-1');
    expect(result.name).toBe('My Kirana');
  });

  it('throws SHOP_NOT_FOUND on 404', async () => {
    const axiosError = Object.assign(new Error('Not Found'), {
      isAxiosError: true,
      response: { status: 404, data: {} },
    });
    mockGet.mockRejectedValueOnce(axiosError);

    const err = await getShopProfile('shop-1').catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('SHOP_NOT_FOUND');
  });

  it('throws SHOP_NOT_AUTHORIZED on 403', async () => {
    const axiosError = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: { status: 403, data: {} },
    });
    mockGet.mockRejectedValueOnce(axiosError);

    const err = await getShopProfile('shop-1').catch((e) => e);
    expect(err.code).toBe('SHOP_NOT_AUTHORIZED');
  });

  it('throws SHOP_FETCH_FAILED on unknown error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const err = await getShopProfile('shop-1').catch((e) => e);
    expect(err.code).toBe('SHOP_FETCH_FAILED');
  });
});

describe('toggleShopStatus', () => {
  it('returns updated isOpen status on success', async () => {
    mockPatch.mockResolvedValueOnce({
      data: { success: true, data: { isOpen: false, updatedAt: '2026-04-18T10:00:00Z' } },
    });

    const result = await toggleShopStatus('shop-1', false);
    expect(result.isOpen).toBe(false);
    expect(mockPatch).toHaveBeenCalledWith(
      expect.any(String),
      { is_open: false }
    );
  });

  it('throws SHOP_NOT_FOUND on 404', async () => {
    const axiosError = Object.assign(new Error('Not Found'), {
      isAxiosError: true,
      response: { status: 404, data: {} },
    });
    mockPatch.mockRejectedValueOnce(axiosError);

    const err = await toggleShopStatus('shop-1', true).catch((e) => e);
    expect(err.code).toBe('SHOP_NOT_FOUND');
  });

  it('throws SHOP_UPDATE_FAILED on other errors', async () => {
    mockPatch.mockRejectedValueOnce(new Error('Server error'));
    const err = await toggleShopStatus('shop-1', true).catch((e) => e);
    expect(err.code).toBe('SHOP_UPDATE_FAILED');
  });
});

describe('getEarningsData', () => {
  it('returns earnings data on success', async () => {
    const earnings = {
      today: { revenue: 50000, orders: 5, completionRate: 100 },
      thisWeek: { revenue: 250000, orders: 25, completionRate: 96 },
    };
    mockGet.mockResolvedValueOnce({
      data: { success: true, data: earnings },
    });

    const result = await getEarningsData('shop-1');
    expect(result.today.orders).toBe(5);
    expect(result.thisWeek.revenue).toBe(250000);
  });

  it('throws SHOP_NOT_FOUND on 404', async () => {
    const axiosError = Object.assign(new Error('Not Found'), {
      isAxiosError: true,
      response: { status: 404, data: {} },
    });
    mockGet.mockRejectedValueOnce(axiosError);

    const err = await getEarningsData('shop-1').catch((e) => e);
    expect(err.code).toBe('SHOP_NOT_FOUND');
  });

  it('throws EARNINGS_FETCH_FAILED on other errors', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const err = await getEarningsData('shop-1').catch((e) => e);
    expect(err.code).toBe('EARNINGS_FETCH_FAILED');
  });
});
