import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useReviewSubmit } from '@/hooks/useReviewSubmit';
import * as reviewsService from '@/services/reviews-submit';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';

jest.mock('@/services/reviews-submit');
jest.mock('@/store/auth');
jest.mock('@/store/orders');

describe('useReviewSubmit Hook', () => {
  const mockOrderId = 'order-123';
  const mockToken = 'mock-token';

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as jest.Mock).mockReturnValue({
      token: mockToken,
    });
    (useOrdersStore as jest.Mock).mockReturnValue({
      addReview: jest.fn(),
      removeReview: jest.fn(),
    });
  });

  it('submits review with rating and comment', async () => {
    (reviewsService.submitReview as jest.Mock).mockResolvedValue({
      id: 'review-123',
      rating: 5,
      comment: 'Great product!',
    });

    const { result } = renderHook(() => useReviewSubmit(mockOrderId));

    act(() => {
      result.current.submit(5, 'Great product!');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(reviewsService.submitReview).toHaveBeenCalledWith(
      mockOrderId,
      { rating: 5, comment: 'Great product!' },
      mockToken
    );
    expect(result.current.error).toBeNull();
  });

  it('submits review with rating only', async () => {
    (reviewsService.submitReview as jest.Mock).mockResolvedValue({
      id: 'review-123',
      rating: 4,
    });

    const { result } = renderHook(() => useReviewSubmit(mockOrderId));

    act(() => {
      result.current.submit(4);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(reviewsService.submitReview).toHaveBeenCalledWith(
      mockOrderId,
      { rating: 4, comment: undefined },
      mockToken
    );
  });

  it('handles submission errors', async () => {
    const error = new Error('Network error');
    (reviewsService.submitReview as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useReviewSubmit(mockOrderId));

    act(() => {
      result.current.submit(5, 'Test');
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });

    expect(result.current.loading).toBe(false);
  });

  it('implements optimistic updates', async () => {
    const addReview = jest.fn();
    (useOrdersStore as jest.Mock).mockReturnValue({
      addReview,
      removeReview: jest.fn(),
    });
    (reviewsService.submitReview as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useReviewSubmit(mockOrderId));

    act(() => {
      result.current.submit(5, 'Great!');
    });

    // Should optimistically add review immediately
    expect(addReview).toHaveBeenCalledWith(mockOrderId, {
      rating: 5,
      comment: 'Great!',
    });
  });

  it('shows loading state during submission', () => {
    (reviewsService.submitReview as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useReviewSubmit(mockOrderId));

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.submit(5);
    });

    expect(result.current.loading).toBe(true);
  });

  it('supports retry after error', async () => {
    (reviewsService.submitReview as jest.Mock)
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce({ id: 'review-123', rating: 5 });

    const { result } = renderHook(() => useReviewSubmit(mockOrderId));

    // First attempt fails
    act(() => {
      result.current.submit(5);
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    // Retry succeeds
    act(() => {
      result.current.submit(5);
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(reviewsService.submitReview).toHaveBeenCalledTimes(2);
  });
});
