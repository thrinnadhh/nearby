/**
 * Unit tests for partner store (Task 13.1)
 */

import { renderHook, act } from '@testing-library/react';
import { usePartnerStore } from '@/store/partner';
import { DeliveryPartner } from '@/types/delivery-partner';

describe('usePartnerStore', () => {
  beforeEach(() => {
    usePartnerStore.getState().reset();
  });

  const mockPartner: DeliveryPartner = {
    id: 'partner-123',
    userId: 'user-123',
    phone: '+919876543210',
    kycStatus: 'approved',
    isOnline: false,
    earningsToday: 500,
    earningsTotal: 5000,
    rating: 4.5,
    completedDeliveries: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('initializes with null profile', () => {
    const state = usePartnerStore.getState();
    expect(state.profile).toBeNull();
    expect(state.isOnline).toBe(false);
  });

  it('sets partner profile', () => {
    const { result } = renderHook(() => usePartnerStore());

    act(() => {
      result.current.setProfile(mockPartner);
    });

    expect(result.current.profile).toEqual(mockPartner);
    expect(result.current.isOnline).toBe(false);
  });

  it('updates online status', () => {
    const { result } = renderHook(() => usePartnerStore());

    act(() => {
      result.current.setProfile(mockPartner);
    });

    act(() => {
      result.current.updateOnlineStatus(true);
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.profile?.isOnline).toBe(true);
  });

  it('resets all data', () => {
    const { result } = renderHook(() => usePartnerStore());

    act(() => {
      result.current.setProfile(mockPartner);
      result.current.setError('Some error');
    });

    expect(result.current.profile).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
