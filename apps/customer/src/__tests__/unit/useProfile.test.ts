import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProfile } from '@/hooks/useProfile';
import * as profileService from '@/services/profile';
import { useAuthStore } from '@/store/auth';

jest.mock('@/services/profile');
jest.mock('@/store/auth');

describe('useProfile Hook', () => {
  const mockProfile = {
    id: 'user-123',
    phone: '+919876543210',
    role: 'customer',
    created_at: '2026-04-16',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as jest.Mock).mockReturnValue({
      token: 'mock-token',
    });
  });

  it('fetches profile on mount', async () => {
    (profileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
    
    const { result } = renderHook(() => useProfile());
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.profile).toEqual(mockProfile);
  });

  it('handles profile fetch error', async () => {
    const error = new Error('Failed to fetch');
    (profileService.getProfile as jest.Mock).mockRejectedValue(error);
    
    const { result } = renderHook(() => useProfile());
    
    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
  });

  it('supports manual refetch', async () => {
    (profileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
    
    const { result } = renderHook(() => useProfile());
    
    await waitFor(() => {
      expect(result.current.profile).toBeDefined();
    });
    
    // Trigger refetch
    act(() => {
      result.current.refetch?.();
    });
    
    expect(profileService.getProfile).toHaveBeenCalledTimes(2);
  });

  it('caches profile data', async () => {
    (profileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
    
    const { result: result1 } = renderHook(() => useProfile());
    const { result: result2 } = renderHook(() => useProfile());
    
    await waitFor(() => {
      expect(result1.current.profile).toBeDefined();
      expect(result2.current.profile).toBeDefined();
    });
    
    // Should only call service once due to caching
    expect(profileService.getProfile).toHaveBeenCalledTimes(1);
  });

  it('returns profile data in correct format', async () => {
    (profileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
    
    const { result } = renderHook(() => useProfile());
    
    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
    });
    
    expect(result.current.profile?.phone).toBe('+919876543210');
    expect(result.current.profile?.role).toBe('customer');
  });
});
