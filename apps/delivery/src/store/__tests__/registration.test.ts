/**
 * Unit tests for registration store (Task 13.1)
 */

import { renderHook, act } from '@testing-library/react';
import { useRegistrationStore } from '@/store/registration';

describe('useRegistrationStore', () => {
  beforeEach(() => {
    useRegistrationStore.getState().reset();
  });

  it('initializes with step 1', () => {
    const state = useRegistrationStore.getState();
    expect(state.currentStep).toBe(1);
    expect(state.error).toBeNull();
  });

  it('sets aadhaar data', () => {
    const { result } = renderHook(() => useRegistrationStore());

    act(() => {
      result.current.setAadhaar('1234', 'file:///path/to/image.jpg');
    });

    expect(result.current.aadhaarLast4).toBe('1234');
    expect(result.current.aadhaarImageUri).toBe('file:///path/to/image.jpg');
  });

  it('sets vehicle photo', () => {
    const { result } = renderHook(() => useRegistrationStore());

    act(() => {
      result.current.setVehiclePhoto('file:///path/to/vehicle.jpg');
    });

    expect(result.current.vehiclePhotoUri).toBe('file:///path/to/vehicle.jpg');
  });

  it('sets bank details', () => {
    const { result } = renderHook(() => useRegistrationStore());

    act(() => {
      result.current.setBankDetails('12345678901', 'HDFC0001234', 'John Doe');
    });

    expect(result.current.bankAccountNumber).toBe('12345678901');
    expect(result.current.bankIFSC).toBe('HDFC0001234');
    expect(result.current.bankAccountName).toBe('John Doe');
  });

  it('moves to next step', () => {
    const { result } = renderHook(() => useRegistrationStore());

    act(() => {
      result.current.setCurrentStep(2);
    });

    expect(result.current.currentStep).toBe(2);
  });

  it('resets all data', () => {
    const { result } = renderHook(() => useRegistrationStore());

    act(() => {
      result.current.setAadhaar('1234', 'file:///path');
      result.current.setCurrentStep(3);
      result.current.setError('Some error');
    });

    expect(result.current.currentStep).toBe(3);

    act(() => {
      result.current.reset();
    });

    expect(result.current.currentStep).toBe(1);
    expect(result.current.aadhaarLast4).toBe('');
    expect(result.current.error).toBeNull();
  });
});
