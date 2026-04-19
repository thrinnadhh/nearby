/**
 * Integration tests for products service
 * Coverage: getShopProducts, getProductDetail, deleteProduct, updateProduct,
 *           updateProductAvailability
 */

import axios from 'axios';
import {
  getShopProducts,
  getProductDetail,
  deleteProduct,
  updateProduct,
  updateProductAvailability,
} from '@/services/products';
import { client } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { AppError } from '@/types/common';
import { Product, ProductsListResponse } from '@/types/products';

jest.mock('@/services/api', () => ({
  client: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/store/auth', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/utils/logger');

const SHOP_ID = 'shop-abc-123';
const PRODUCT_ID = 'prod-xyz-456';

const MOCK_PRODUCT: Product = {
  id: PRODUCT_ID,
  shopId: SHOP_ID,
  name: 'Test Product',
  description: 'A test product',
  category: 'grocery',
  price: 5000,
  stockQty: 10,
  images: [],
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  isActive: true,
};

const MOCK_PRODUCTS_LIST: ProductsListResponse = {
  success: true,
  data: [MOCK_PRODUCT],
  meta: { page: 1, total: 1, pages: 1 },
};

describe('products service — integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore.getState as jest.Mock).mockReturnValue({ shopId: SHOP_ID });
  });

  // ─── getShopProducts ───────────────────────────────────────────────
  describe('getShopProducts', () => {
    it('fetches products successfully with default params', async () => {
      (client.get as jest.Mock).mockResolvedValue({ data: MOCK_PRODUCTS_LIST });

      const result = await getShopProducts();

      expect(client.get).toHaveBeenCalledWith(
        expect.stringContaining(SHOP_ID),
        { params: { page: 1, limit: 50 } }
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(PRODUCT_ID);
    });

    it('passes custom page and limit params', async () => {
      (client.get as jest.Mock).mockResolvedValue({ data: MOCK_PRODUCTS_LIST });

      await getShopProducts(2, 20);

      expect(client.get).toHaveBeenCalledWith(
        expect.any(String),
        { params: { page: 2, limit: 20 } }
      );
    });

    it('throws AppError when shopId is missing', async () => {
      (useAuthStore.getState as jest.Mock).mockReturnValue({ shopId: null });

      await expect(getShopProducts()).rejects.toThrow(AppError);
      await expect(getShopProducts()).rejects.toMatchObject({ code: 'SHOP_ID_MISSING' });
    });

    it('throws AppError when API call fails', async () => {
      (client.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(getShopProducts()).rejects.toThrow(AppError);
    });

    it('handles axios errors with response message', async () => {
      const axiosError = Object.assign(new Error('Request failed'), {
        isAxiosError: true,
        response: {
          status: 500,
          data: { error: { message: 'Internal server error' } },
        },
      });
      Object.defineProperty(axiosError, 'isAxiosError', { value: true });
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.get as jest.Mock).mockRejectedValue(axiosError);

      await expect(getShopProducts()).rejects.toMatchObject({
        code: 'PRODUCTS_FETCH_FAILED',
      });
    });
  });

  // ─── getProductDetail ──────────────────────────────────────────────
  describe('getProductDetail', () => {
    it('fetches product detail successfully', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: MOCK_PRODUCT },
      });

      const result = await getProductDetail(PRODUCT_ID);

      expect(result).toEqual(MOCK_PRODUCT);
      expect(client.get).toHaveBeenCalledWith(
        expect.stringContaining(PRODUCT_ID)
      );
    });

    it('throws PRODUCT_NOT_FOUND on 404', async () => {
      const err = { isAxiosError: true, response: { status: 404 } };
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.get as jest.Mock).mockRejectedValue(err);

      await expect(getProductDetail(PRODUCT_ID)).rejects.toMatchObject({
        code: 'PRODUCT_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('throws PRODUCT_DETAIL_FETCH_FAILED on generic error', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
      (client.get as jest.Mock).mockRejectedValue(new Error('timeout'));

      await expect(getProductDetail(PRODUCT_ID)).rejects.toMatchObject({
        code: 'PRODUCT_DETAIL_FETCH_FAILED',
      });
    });
  });

  // ─── deleteProduct ─────────────────────────────────────────────────
  describe('deleteProduct', () => {
    it('soft-deletes a product successfully', async () => {
      (client.delete as jest.Mock).mockResolvedValue({});

      await expect(deleteProduct(PRODUCT_ID)).resolves.toBeUndefined();
      expect(client.delete).toHaveBeenCalledWith(
        expect.stringContaining(PRODUCT_ID)
      );
    });

    it('throws PRODUCT_NOT_FOUND on 404', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.delete as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(deleteProduct(PRODUCT_ID)).rejects.toMatchObject({
        code: 'PRODUCT_NOT_FOUND',
      });
    });

    it('throws PRODUCT_NOT_AUTHORIZED on 403', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.delete as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 403 },
        message: 'Forbidden',
      });

      await expect(deleteProduct(PRODUCT_ID)).rejects.toMatchObject({
        code: 'PRODUCT_NOT_AUTHORIZED',
      });
    });

    it('throws PRODUCT_DELETE_FAILED on generic error', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
      (client.delete as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(deleteProduct(PRODUCT_ID)).rejects.toMatchObject({
        code: 'PRODUCT_DELETE_FAILED',
      });
    });
  });

  // ─── updateProduct ─────────────────────────────────────────────────
  describe('updateProduct', () => {
    it('updates price and stock successfully', async () => {
      const updatedProduct = { ...MOCK_PRODUCT, price: 6000, stockQty: 20 };
      (client.patch as jest.Mock).mockResolvedValue({
        data: { success: true, data: updatedProduct },
      });

      const result = await updateProduct(PRODUCT_ID, {
        price: 6000,
        stock_quantity: 20,
      });

      expect(result.price).toBe(6000);
      expect(result.stockQty).toBe(20);
    });

    it('throws VALIDATION_ERROR on 400', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.patch as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: { message: 'Invalid price' } },
        },
        message: 'Bad request',
      });

      await expect(
        updateProduct(PRODUCT_ID, { price: -1 })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    });

    it('throws UNAUTHORIZED on 401', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.patch as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 401 },
        message: 'Unauthorized',
      });

      await expect(
        updateProduct(PRODUCT_ID, { price: 5000 })
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 401 });
    });

    it('throws FORBIDDEN on 403', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.patch as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 403 },
        message: 'Forbidden',
      });

      await expect(
        updateProduct(PRODUCT_ID, { price: 5000 })
      ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    });

    it('throws PRODUCT_NOT_FOUND on 404', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.patch as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(
        updateProduct(PRODUCT_ID, { price: 5000 })
      ).rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND', statusCode: 404 });
    });
  });

  // ─── updateProductAvailability ─────────────────────────────────────
  describe('updateProductAvailability', () => {
    it('toggles availability to true', async () => {
      const updatedProduct = { ...MOCK_PRODUCT, isAvailable: true };
      (client.patch as jest.Mock).mockResolvedValue({
        data: { success: true, data: updatedProduct },
      });

      const result = await updateProductAvailability(PRODUCT_ID, true);

      expect(client.patch).toHaveBeenCalledWith(
        expect.stringContaining(PRODUCT_ID),
        { is_available: true }
      );
      expect(result).toBeDefined();
    });

    it('toggles availability to false', async () => {
      const updatedProduct = { ...MOCK_PRODUCT, isAvailable: false };
      (client.patch as jest.Mock).mockResolvedValue({
        data: { success: true, data: updatedProduct },
      });

      await updateProductAvailability(PRODUCT_ID, false);

      expect(client.patch).toHaveBeenCalledWith(
        expect.stringContaining(PRODUCT_ID),
        { is_available: false }
      );
    });

    it('throws PRODUCT_NOT_FOUND on 404', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.patch as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(
        updateProductAvailability(PRODUCT_ID, true)
      ).rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND', statusCode: 404 });
    });

    it('throws FORBIDDEN on 403', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.patch as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 403 },
        message: 'Forbidden',
      });

      await expect(
        updateProductAvailability(PRODUCT_ID, true)
      ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    });

    it('throws UNAUTHORIZED on 401', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.patch as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 401 },
        message: 'Unauthorized',
      });

      await expect(
        updateProductAvailability(PRODUCT_ID, false)
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 401 });
    });

    it('throws SERVICE_UNAVAILABLE on 503', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      (client.patch as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: { status: 503 },
        message: 'Service Unavailable',
      });

      await expect(
        updateProductAvailability(PRODUCT_ID, true)
      ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', statusCode: 503 });
    });

    it('throws PRODUCT_AVAILABILITY_UPDATE_FAILED on generic error', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
      (client.patch as jest.Mock).mockRejectedValue(new Error('Unexpected'));

      await expect(
        updateProductAvailability(PRODUCT_ID, true)
      ).rejects.toMatchObject({ code: 'PRODUCT_AVAILABILITY_UPDATE_FAILED' });
    });
  });
});
