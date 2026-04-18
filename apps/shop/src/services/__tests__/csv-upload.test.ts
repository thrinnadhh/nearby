/**
 * CSV Upload Service Integration Tests
 */

import { uploadProductBatch, uploadAllBatches } from '@/services/csv-upload';
import { client } from '@/services/axios';
import { CsvProductRow } from '@/types/csv';

// Mock axios client
jest.mock('@/services/axios');

describe('csv-upload service', () => {
  const mockProducts: CsvProductRow[] = [
    {
      name: 'Basmati Rice',
      description: 'Premium rice',
      category: 'grocery',
      price: 25000,
      stockQty: 50,
      unit: 'kg',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadProductBatch', () => {
    it('should upload batch with idempotency key', async () => {
      const mockResponse = {
        data: {
          statusCode: 201,
          successful: mockProducts.map((p) => ({ ...p, id: '123' })),
          failed: [],
          totalSuccessful: 1,
          totalFailed: 0,
        },
      };

      (client.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await uploadProductBatch(
        mockProducts,
        'shop-123',
        'key-123'
      );

      expect(result.totalSuccessful).toBe(1);
      expect(result.totalFailed).toBe(0);
      expect(client.post).toHaveBeenCalledWith(
        '/shops/shop-123/products/bulk',
        expect.objectContaining({
          products: mockProducts,
          idempotencyKey: 'key-123',
        })
      );
    });

    it('should handle 207 multi-status response', async () => {
      const mockResponse = {
        status: 207,
        data: {
          successful: [mockProducts[0]],
          failed: [
            {
              rowNumber: 2,
              error: 'Invalid category',
            },
          ],
          totalSuccessful: 1,
          totalFailed: 1,
        },
      };

      (client.post as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await uploadProductBatch(
        [...mockProducts, { ...mockProducts[0], category: 'invalid' }],
        'shop-123',
        'key-123'
      );

      expect(result.totalSuccessful).toBe(1);
      expect(result.totalFailed).toBe(1);
    });

    it('should throw error on request failure', async () => {
      const error = new Error('Network error');
      (client.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        uploadProductBatch(mockProducts, 'shop-123', 'key-123')
      ).rejects.toThrow('Network error');
    });

    it('should reject batch larger than 100 products', async () => {
      const largeBatch = Array(101).fill(mockProducts[0]);

      await expect(
        uploadProductBatch(largeBatch, 'shop-123', 'key-123')
      ).rejects.toThrow();
    });
  });

  describe('uploadAllBatches', () => {
    it('should upload multiple batches sequentially', async () => {
      const largeBatch = Array(150).fill(mockProducts[0]); // 2 batches

      const mockResponse = {
        data: {
          statusCode: 201,
          successful: mockProducts,
          failed: [],
          totalSuccessful: 1,
          totalFailed: 0,
        },
      };

      (client.post as jest.Mock).mockResolvedValue(mockResponse);

      const onProgress = jest.fn();

      const result = await uploadAllBatches(largeBatch, 'shop-123', onProgress);

      expect(client.post).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalled();
    });

    it('should track progress across batches', async () => {
      const largeBatch = Array(150).fill(mockProducts[0]);

      const mockResponse = {
        data: {
          statusCode: 201,
          successful: mockProducts,
          failed: [],
          totalSuccessful: 1,
          totalFailed: 0,
        },
      };

      (client.post as jest.Mock).mockResolvedValue(mockResponse);

      const onProgress = jest.fn();

      await uploadAllBatches(largeBatch, 'shop-123', onProgress);

      // Check progress callback was called with correct structure
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          currentBatch: expect.any(Number),
          totalBatches: 2,
          successCount: expect.any(Number),
          failCount: expect.any(Number),
        })
      );
    });

    it('should stop on first error without completing remaining batches', async () => {
      const largeBatch = Array(150).fill(mockProducts[0]);

      (client.post as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            statusCode: 201,
            successful: mockProducts,
            failed: [],
            totalSuccessful: 1,
            totalFailed: 0,
          },
        })
        .mockRejectedValueOnce(new Error('Upload failed'));

      const onProgress = jest.fn();

      await expect(
        uploadAllBatches(largeBatch, 'shop-123', onProgress)
      ).rejects.toThrow('Upload failed');

      // Should have called once (for first batch only)
      expect(client.post).toHaveBeenCalledTimes(1);
    });

    it('should aggregate results from all batches', async () => {
      const largeBatch = Array(150).fill(mockProducts[0]);

      const response1 = {
        data: {
          statusCode: 201,
          successful: Array(100).fill({ ...mockProducts[0], id: '1' }),
          failed: [],
          totalSuccessful: 100,
          totalFailed: 0,
        },
      };

      const response2 = {
        data: {
          statusCode: 201,
          successful: Array(50).fill({ ...mockProducts[0], id: '2' }),
          failed: [],
          totalSuccessful: 50,
          totalFailed: 0,
        },
      };

      (client.post as jest.Mock)
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      const onProgress = jest.fn();

      const result = await uploadAllBatches(largeBatch, 'shop-123', onProgress);

      expect(result.totalSuccessful).toBe(150);
      expect(result.totalFailed).toBe(0);
    });
  });
});
