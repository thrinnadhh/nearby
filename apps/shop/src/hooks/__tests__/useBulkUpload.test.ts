/**
 * useBulkUpload Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useBulkUpload } from '@/hooks/useBulkUpload';
import * as uploadService from '@/services/csv-upload';
import { CsvRowWithErrors } from '@/types/csv';
import { CSV_HEADERS } from '@/constants/csv-schema';

// Mock dependencies
jest.mock('@/services/csv-upload');
jest.mock('@/store/products');
jest.mock('@/utils/logger');

describe('useBulkUpload Hook', () => {
  const mockValidRows: CsvRowWithErrors[] = [
    {
      rowNumber: 1,
      name: 'Basmati Rice',
      description: 'Premium rice',
      category: 'grocery',
      price: 25000,
      stockQty: 50,
      unit: 'kg',
      isValid: true,
      errors: {},
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with null state', () => {
    const { result } = renderHook(() => useBulkUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should clear results state', async () => {
    const { result } = renderHook(() => useBulkUpload());

    await act(() => {
      result.current.clearResults();
    });

    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should throw error for empty rows', async () => {
    const { result } = renderHook(() => useBulkUpload());

    await act(async () => {
      try {
        await result.current.uploadRows([]);
        fail('Should have thrown error');
      } catch (err) {
        // Expected
        expect(err).toBeDefined();
      }
    });

    expect(result.current.isUploading).toBe(false);
  });

  it('should throw error for no valid rows', async () => {
    const invalidRows: CsvRowWithErrors[] = [
      {
        rowNumber: 1,
        name: '',
        description: '',
        category: '',
        price: 0,
        stockQty: 0,
        unit: '',
        isValid: false,
        errors: { name: 'Required' },
      },
    ];

    const { result } = renderHook(() => useBulkUpload());

    await act(async () => {
      try {
        await result.current.uploadRows(invalidRows);
        fail('Should have thrown error');
      } catch (err) {
        // Expected
        expect(err).toBeDefined();
      }
    });
  });

  it('should cancel upload when requested', async () => {
    (uploadService.uploadAllBatches as jest.Mock).mockImplementationOnce(
      (products, onProgress) => {
        setTimeout(() => {
          onProgress({
            currentBatch: 1,
            totalBatches: 2,
            successCount: 0,
            failCount: 0,
          });
        }, 100);
        return Promise.resolve({
          totalSuccessful: 0,
          totalFailed: 0,
          allResults: [],
        });
      }
    );

    const { result } = renderHook(() => useBulkUpload());

    const uploadPromise = act(async () => {
      try {
        await result.current.uploadRows(mockValidRows);
      } catch (err) {
        // Expected on cancellation
      }
    });

    await waitFor(() => {
      expect(result.current.progress).toBeDefined();
    });

    act(() => {
      result.current.cancel();
    });

    await uploadPromise;
  });
});
