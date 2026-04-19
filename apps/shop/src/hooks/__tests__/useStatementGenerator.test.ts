/**
 * useStatementGenerator hook tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useStatementGenerator } from '@/hooks/useStatementGenerator';
import { useAuthStore } from '@/store/auth';
import { useStatementStore } from '@/store/statement';
import { getStatementPdf, validateMonthYear } from '@/services/statement';
import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';

jest.mock('@/services/statement');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Share: {
    share: jest.fn(),
  },
}));
jest.mock('expo-file-system');

const mockGetStatementPdf = getStatementPdf as jest.MockedFunction<typeof getStatementPdf>;
const mockShare = Share.share as jest.MockedFunction<typeof Share.share>;

describe('useStatementGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStatementStore.setState({
      pdfUrl: null,
      fileName: null,
      loading: false,
      error: null,
      generatedMonth: null,
      generatedYear: null,
      isOffline: false,
    });
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('should return initial state', () => {
    useAuthStore.setState({ shopId: null });
    const { result } = renderHook(() => useStatementGenerator());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.pdfUrl).toBeNull();
    expect(result.current.fileName).toBeNull();
  });

  it('should validate month/year correctly', () => {
    const validResult = validateMonthYear(4, 2026);
    expect(validResult.valid).toBe(true);
    expect(validResult.error).toBeUndefined();

    const invalidMonthResult = validateMonthYear(13, 2026);
    expect(invalidMonthResult.valid).toBe(false);
    expect(invalidMonthResult.error).toBeDefined();

    const invalidYearResult = validateMonthYear(4, 2019);
    expect(invalidYearResult.valid).toBe(false);
    expect(invalidYearResult.error).toBeDefined();
  });

  it('should generate PDF successfully', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });

    const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    mockGetStatementPdf.mockResolvedValue(mockBlob);

    // Mock FileReader
    global.FileReader = jest.fn(() => ({
      readAsDataURL: jest.fn(function () {
        this.onload?.({
          target: { result: 'data:application/pdf;base64,mockbase64' },
        } as any);
      }),
    })) as any;

    const { result } = renderHook(() => useStatementGenerator());

    await act(async () => {
      await result.current.generatePdf(4, 2026);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetStatementPdf).toHaveBeenCalledWith(shopId, 4, 2026);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
  });

  it('should handle invalid month/year in generatePdf', async () => {
    useAuthStore.setState({ shopId: '123' });

    const { result } = renderHook(() => useStatementGenerator());

    await act(async () => {
      await result.current.generatePdf(13, 2026); // Invalid month
    });

    expect(result.current.error).toBeDefined();
    expect(mockGetStatementPdf).not.toHaveBeenCalled();
  });

  it('should handle future date in generatePdf', async () => {
    useAuthStore.setState({ shopId: '123' });

    const { result } = renderHook(() => useStatementGenerator());
    const futureYear = new Date().getFullYear() + 1;

    await act(async () => {
      await result.current.generatePdf(1, futureYear);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should handle PDF generation error', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });

    const error = new Error('PDF generation failed');
    mockGetStatementPdf.mockRejectedValue(error);

    const { result } = renderHook(() => useStatementGenerator());

    await act(async () => {
      await result.current.generatePdf(4, 2026);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('PDF generation failed');
  });

  it('should download PDF successfully', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });

    const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    mockGetStatementPdf.mockResolvedValue(mockBlob);

    global.FileReader = jest.fn(() => ({
      readAsDataURL: jest.fn(function () {
        this.onload?.({
          target: { result: 'data:application/pdf;base64,mockbase64' },
        } as any);
      }),
    })) as any;

    const { result } = renderHook(() => useStatementGenerator());

    await act(async () => {
      await result.current.downloadPdf(4, 2026);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
  });

  it('should share PDF successfully', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });

    const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    mockGetStatementPdf.mockResolvedValue(mockBlob);
    mockShare.mockResolvedValue({ action: 'shareWithSave' });

    global.FileReader = jest.fn(() => ({
      readAsDataURL: jest.fn(function () {
        this.onload?.({
          target: { result: 'data:application/pdf;base64,mockbase64' },
        } as any);
      }),
    })) as any;

    const { result } = renderHook(() => useStatementGenerator());

    await act(async () => {
      await result.current.sharePdf(4, 2026);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockShare).toHaveBeenCalled();
  });

  it('should handle share cancellation', async () => {
    const shopId = '123';
    useAuthStore.setState({ shopId });

    const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    mockGetStatementPdf.mockResolvedValue(mockBlob);

    const shareError = new Error('User did not share');
    mockShare.mockRejectedValue(shareError);

    global.FileReader = jest.fn(() => ({
      readAsDataURL: jest.fn(function () {
        this.onload?.({
          target: { result: 'data:application/pdf;base64,mockbase64' },
        } as any);
      }),
    })) as any;

    const { result } = renderHook(() => useStatementGenerator());

    await act(async () => {
      await result.current.sharePdf(4, 2026);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not set error for user cancellation
    expect(result.current.loading).toBe(false);
  });

  it('should reset state', () => {
    useAuthStore.setState({ shopId: '123' });
    useStatementStore.setState({
      pdfUrl: 'file://path',
      fileName: 'statement.pdf',
      generatedMonth: 4,
      generatedYear: 2026,
    });

    const { result } = renderHook(() => useStatementGenerator());

    act(() => {
      result.current.reset();
    });

    expect(result.current.pdfUrl).toBeNull();
    expect(result.current.fileName).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle missing shopId', async () => {
    useAuthStore.setState({ shopId: null });

    const { result } = renderHook(() => useStatementGenerator());

    await act(async () => {
      await result.current.generatePdf(4, 2026);
    });

    expect(result.current.error).toBe('Shop ID not found');
  });
});
