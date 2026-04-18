/**
 * BulkUploadScreen Integration Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import BulkUploadScreen from '../bulk-upload';
import * as uploadService from '@/services/csv-upload';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Mock dependencies
jest.mock('@/services/csv-upload');
jest.mock('@/services/products');
jest.mock('@/store/products');
jest.mock('expo-document-picker');
jest.mock('expo-file-system');
jest.mock('@/utils/logger');

const mockCsvData = `name,category,price,unit,stockQty,description
Basmati Rice,grocery,250,kg,50,Premium rice
Wheat Flour,grocery,80,kg,30,All-purpose flour`;

describe('BulkUploadScreen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render file picker step initially', () => {
    const { getByText } = render(<BulkUploadScreen />);

    expect(getByText('Bulk Upload Products')).toBeDefined();
    expect(getByText('Select a CSV file')).toBeDefined();
  });

  it('should transition to preview step after file selection', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file://test.csv',
          name: 'test.csv',
          size: 1024,
          mimeType: 'text/csv',
        },
      ],
    });

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(
      mockCsvData
    );

    const { getByText, getByTestId } = render(<BulkUploadScreen />);

    // Click select file
    const selectButton = getByText('Select CSV File');
    fireEvent.press(selectButton);

    await waitFor(() => {
      expect(getByText('Preview Data')).toBeDefined();
    });
  });

  it('should show validation errors in preview', async () => {
    const csvWithErrors = `name,category,price,unit,stockQty,description
,grocery,250,kg,50,Missing name
Wheat,invalid_category,80,kg,30,Invalid category`;

    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file://test.csv',
          name: 'test.csv',
          size: 1024,
          mimeType: 'text/csv',
        },
      ],
    });

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(
      csvWithErrors
    );

    const { getByText, getByTestId } = render(<BulkUploadScreen />);

    const selectButton = getByText('Select CSV File');
    fireEvent.press(selectButton);

    await waitFor(() => {
      expect(getByText('Invalid Data')).toBeDefined();
    });
  });

  it('should transition to upload step after confirming preview', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file://test.csv',
          name: 'test.csv',
          size: 1024,
          mimeType: 'text/csv',
        },
      ],
    });

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(
      mockCsvData
    );

    (uploadService.uploadAllBatches as jest.Mock).mockImplementationOnce(
      (products, shopId, onProgress) => {
        setTimeout(() => {
          onProgress({
            currentBatch: 1,
            totalBatches: 1,
            successCount: 2,
            failCount: 0,
          });
        }, 100);

        return Promise.resolve({
          allResults: [],
          totalSuccessful: 2,
          totalFailed: 0,
        });
      }
    );

    const { getByText, queryByText } = render(<BulkUploadScreen />);

    // Select file
    fireEvent.press(getByText('Select CSV File'));

    await waitFor(() => {
      expect(getByText('Preview Data')).toBeDefined();
    });

    // Confirm preview
    const confirmButton = getByText('Proceed to Upload');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(queryByText('Upload Progress')).toBeDefined();
    });
  });

  it('should show results after upload completes', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file://test.csv',
          name: 'test.csv',
          size: 1024,
          mimeType: 'text/csv',
        },
      ],
    });

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(
      mockCsvData
    );

    (uploadService.uploadAllBatches as jest.Mock).mockResolvedValueOnce({
      allResults: [
        {
          rowNumber: 1,
          productId: 'prod-123',
          success: true,
        },
        {
          rowNumber: 2,
          productId: 'prod-456',
          success: true,
        },
      ],
      totalSuccessful: 2,
      totalFailed: 0,
    });

    const { getByText } = render(<BulkUploadScreen />);

    // Select file
    fireEvent.press(getByText('Select CSV File'));

    await waitFor(() => {
      expect(getByText('Preview Data')).toBeDefined();
    });

    // Confirm preview
    fireEvent.press(getByText('Proceed to Upload'));

    // Wait for results
    await waitFor(() => {
      expect(getByText('Upload Complete')).toBeDefined();
      expect(getByText('2 products uploaded')).toBeDefined();
    });
  });

  it('should handle partial upload failures', async () => {
    const csvWithErrors = `name,category,price,unit,stockQty,description
Basmati Rice,grocery,250,kg,50,Premium rice
Wheat,invalid_category,80,kg,30,Invalid category`;

    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file://test.csv',
          name: 'test.csv',
          size: 1024,
          mimeType: 'text/csv',
        },
      ],
    });

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(
      csvWithErrors
    );

    (uploadService.uploadAllBatches as jest.Mock).mockResolvedValueOnce({
      allResults: [
        {
          rowNumber: 1,
          productId: 'prod-123',
          success: true,
        },
        {
          rowNumber: 2,
          error: 'Invalid category',
          success: false,
        },
      ],
      totalSuccessful: 1,
      totalFailed: 1,
    });

    const { getByText } = render(<BulkUploadScreen />);

    // Select file
    fireEvent.press(getByText('Select CSV File'));

    await waitFor(() => {
      expect(getByText('Preview Data')).toBeDefined();
    });

    // Confirm preview
    fireEvent.press(getByText('Proceed to Upload'));

    // Wait for results with failures
    await waitFor(() => {
      expect(getByText('Partial Success')).toBeDefined();
      expect(getByText('1 failed')).toBeDefined();
    });
  });

  it('should allow retry of failed products', async () => {
    // Setup initial upload with failures
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file://test.csv',
          name: 'test.csv',
          size: 1024,
          mimeType: 'text/csv',
        },
      ],
    });

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(
      mockCsvData
    );

    const firstUploadResult = {
      allResults: [
        {
          rowNumber: 1,
          productId: 'prod-123',
          success: true,
        },
        {
          rowNumber: 2,
          error: 'Network timeout',
          success: false,
        },
      ],
      totalSuccessful: 1,
      totalFailed: 1,
    };

    const retryResult = {
      allResults: [
        {
          rowNumber: 2,
          productId: 'prod-456',
          success: true,
        },
      ],
      totalSuccessful: 1,
      totalFailed: 0,
    };

    (uploadService.uploadAllBatches as jest.Mock)
      .mockResolvedValueOnce(firstUploadResult)
      .mockResolvedValueOnce(retryResult);

    const { getByText, getByTestId } = render(<BulkUploadScreen />);

    // Initial flow
    fireEvent.press(getByText('Select CSV File'));

    await waitFor(() => {
      expect(getByText('Preview Data')).toBeDefined();
    });

    fireEvent.press(getByText('Proceed to Upload'));

    // Results with failure
    await waitFor(() => {
      expect(getByText('Partial Success')).toBeDefined();
    });

    // Retry failed products
    const retryButton = getByText('Retry Failed');
    fireEvent.press(retryButton);

    // Should start new upload
    await waitFor(() => {
      expect(uploadService.uploadAllBatches).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle file picker cancellation', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
    });

    const { getByText, queryByText } = render(<BulkUploadScreen />);

    fireEvent.press(getByText('Select CSV File'));

    await waitFor(() => {
      // Should stay on file picker step
      expect(getByText('Select a CSV file')).toBeDefined();
      expect(queryByText('Preview Data')).toBeNull();
    });
  });

  it('should show error for invalid file size', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file://large.csv',
          name: 'large.csv',
          size: 10 * 1024 * 1024, // 10MB, exceeds 5MB limit
          mimeType: 'text/csv',
        },
      ],
    });

    const { getByText } = render(<BulkUploadScreen />);

    fireEvent.press(getByText('Select CSV File'));

    await waitFor(() => {
      expect(getByText('File too large')).toBeDefined();
    });
  });
});
