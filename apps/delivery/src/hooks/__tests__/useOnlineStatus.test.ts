/**
 * Unit tests for useOnlineStatus hook (Task 13.3)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import * as partnerService from '@/services/partner';

jest.mock('@/services/partner');
jest.mock('@/store/partner', () => ({
  usePartnerStore: () => ({
    profile: {
      id: 'partner-123',
      isOnline: false,
      kycStatus: 'approved',
    },
    updateOnlineStatus: jest.fn(),
  }),
}));

describe('useOnlineStatus', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with offline status', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('toggles online status successfully', async () => {
    const mockToggle = partnerService.toggleOnlineStatus as jest.Mock;
    mockToggle.mockResolvedValueOnce({
      id: 'partner-123',
      is_online: true,
      last_online_at: new Date().toISOString(),
    });

    const { result } = renderHook(() => useOnlineStatus());

    await act(async () => {
      await result.current.goOnline();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('handles toggle failure', async () => {
    const mockToggle = partnerService.toggleOnlineStatus as jest.Mock;
    mockToggle.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useOnlineStatus());

    await act(async () => {
      try {
        await result.current.goOnline();
      } catch (e) {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
