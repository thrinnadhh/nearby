/**
 * Unit tests for assignment service
 */

import {
  listDeliveryOrders,
  acceptAssignment,
  rejectAssignment,
  markPickedUp,
  markDelivered,
} from '@/services/assignment';
import { client } from '@/services/api';
import { AppErrorClass } from '@/types/common';

jest.mock('@/services/api');
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockClient = client as jest.Mocked<typeof client>;

describe('Assignment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listDeliveryOrders', () => {
    it('should fetch delivery orders', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          shopName: 'Shop 1',
          status: 'assigned',
          totalAmount: 50000,
        },
      ];

      mockClient.get.mockResolvedValue({
        data: { success: true, data: mockOrders },
      });

      const result = await listDeliveryOrders();

      expect(result).toEqual(mockOrders);
      expect(mockClient.get).toHaveBeenCalledWith('/delivery/orders', {
        params: undefined,
      });
    });

    it('should fetch orders with status filter', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          shopName: 'Shop 1',
          status: 'assigned',
          totalAmount: 50000,
        },
      ];

      mockClient.get.mockResolvedValue({
        data: { success: true, data: mockOrders },
      });

      const result = await listDeliveryOrders('assigned');

      expect(result).toEqual(mockOrders);
      expect(mockClient.get).toHaveBeenCalledWith('/delivery/orders', {
        params: { status: 'assigned' },
      });
    });

    it('should handle authentication error', async () => {
      const error = {
        response: { status: 401, data: { error: { message: 'Unauthorized' } } },
        message: 'Request failed',
        isAxiosError: true,
      };
      mockClient.get.mockRejectedValue(error);

      await expect(listDeliveryOrders()).rejects.toThrow(AppErrorClass);
    });

    it('should handle rate limit error', async () => {
      const error = {
        response: { status: 429, data: { error: { message: 'Too many requests' } } },
        message: 'Request failed',
        isAxiosError: true,
      };
      mockClient.get.mockRejectedValue(error);

      await expect(listDeliveryOrders()).rejects.toThrow(AppErrorClass);
    });
  });

  describe('acceptAssignment', () => {
    it('should accept assignment', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'assigned',
        shopName: 'Shop 1',
      };

      mockClient.patch.mockResolvedValue({
        data: { success: true, data: mockOrder },
      });

      const result = await acceptAssignment('order-1');

      expect(result).toEqual(mockOrder);
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/delivery/orders/order-1/accept',
        {}
      );
    });

    it('should handle order not found error', async () => {
      const error = {
        response: { status: 404, data: { error: { message: 'Order not found' } } },
        message: 'Request failed',
        isAxiosError: true,
      };
      mockClient.patch.mockRejectedValue(error);

      await expect(acceptAssignment('order-1')).rejects.toThrow(AppErrorClass);
    });

    it('should handle duplicate assignment error', async () => {
      const error = {
        response: {
          status: 409,
          data: { error: { message: 'Already assigned' } },
        },
        message: 'Request failed',
        isAxiosError: true,
      };
      mockClient.patch.mockRejectedValue(error);

      await expect(acceptAssignment('order-1')).rejects.toThrow(AppErrorClass);
    });
  });

  describe('rejectAssignment', () => {
    it('should reject assignment', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'ready',
        shopName: 'Shop 1',
      };

      mockClient.patch.mockResolvedValue({
        data: { success: true, data: mockOrder },
      });

      const result = await rejectAssignment('order-1');

      expect(result).toEqual(mockOrder);
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/delivery/orders/order-1/reject',
        {}
      );
    });

    it('should handle order not found error', async () => {
      const error = {
        response: { status: 404, data: { error: { message: 'Order not found' } } },
        message: 'Request failed',
        isAxiosError: true,
      };
      mockClient.patch.mockRejectedValue(error);

      await expect(rejectAssignment('order-1')).rejects.toThrow(AppErrorClass);
    });
  });

  describe('markPickedUp', () => {
    it('should mark order as picked up', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'picked_up',
        shopName: 'Shop 1',
      };

      mockClient.patch.mockResolvedValue({
        data: { success: true, data: mockOrder },
      });

      const result = await markPickedUp('order-1');

      expect(result).toEqual(mockOrder);
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/delivery/orders/order-1/pickup',
        {}
      );
    });

    it('should handle invalid status error', async () => {
      const error = {
        response: {
          status: 400,
          data: { error: { message: 'Invalid status' } },
        },
        message: 'Request failed',
        isAxiosError: true,
      };
      mockClient.patch.mockRejectedValue(error);

      await expect(markPickedUp('order-1')).rejects.toThrow(AppErrorClass);
    });
  });

  describe('markDelivered', () => {
    it('should mark order as delivered', async () => {
      const mockOrder = {
        id: 'order-1',
        status: 'delivered',
        shopName: 'Shop 1',
      };

      mockClient.patch.mockResolvedValue({
        data: { success: true, data: mockOrder },
      });

      const result = await markDelivered('order-1');

      expect(result).toEqual(mockOrder);
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/delivery/orders/order-1/deliver',
        {}
      );
    });

    it('should handle invalid status error', async () => {
      const error = {
        response: {
          status: 400,
          data: { error: { message: 'Invalid status' } },
        },
        message: 'Request failed',
        isAxiosError: true,
      };
      mockClient.patch.mockRejectedValue(error);

      await expect(markDelivered('order-1')).rejects.toThrow(AppErrorClass);
    });
  });
});
