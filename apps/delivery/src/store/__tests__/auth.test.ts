/**
 * Unit tests for auth store (Task 13.1)
 */

import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/store/auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.getState().logout();
  });

  it('initializes with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.userId).toBeNull();
  });

  it('logs in user with payload', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.login({
        userId: 'user-123',
        phone: '+919876543210',
        token: 'jwt-token',
        partnerId: 'partner-123',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userId).toBe('user-123');
    expect(result.current.phone).toBe('+919876543210');
    expect(result.current.token).toBe('jwt-token');
    expect(result.current.role).toBe('delivery');
  });

  it('logs out user and clears state', () => {
    const { result } = renderHook(() => useAuthStore());

    // Login first
    act(() => {
      result.current.login({
        userId: 'user-123',
        phone: '+919876543210',
        token: 'jwt-token',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userId).toBeNull();
    expect(result.current.token).toBeNull();
  });
});
