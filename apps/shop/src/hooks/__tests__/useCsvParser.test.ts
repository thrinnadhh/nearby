/**
 * useCsvParser Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCsvParser } from '@/hooks/useCsvParser';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('expo-document-picker');
jest.mock('@/utils/logger');

describe('useCsvParser Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with null state', () => {
    const { result } = renderHook(() => useCsvParser());

    expect(result.current.previewData).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.file).toBeNull();
  });

  it('should clear preview and error state', async () => {
    const { result } = renderHook(() => useCsvParser());

    await act(() => {
      result.current.clearPreview();
    });

    expect(result.current.previewData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle file picker cancellation', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
    });

    const { result } = renderHook(() => useCsvParser());

    await act(async () => {
      await result.current.pickFile();
    });

    expect(result.current.file).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle invalid file extension', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file://test.xlsx',
          name: 'test.xlsx',
          size: 1024,
          mimeType: 'application/vnd.ms-excel',
        },
      ],
    });

    const { result } = renderHook(() => useCsvParser());

    await act(async () => {
      await result.current.pickFile();
    });

    expect(result.current.error).toBeDefined();
  });
});
