/**
 * Unit tests for OTPVerifyScreen
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { OTPVerifyScreen } from '@/screens/auth/OTPVerifyScreen';
import * as authService from '@/services/auth';
import { useAuthStore } from '@/store/auth';
import { AppErrorClass } from '@/types/common';

jest.mock('@/services/auth');
jest.mock('@/store/auth');
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('OTPVerifyScreen', () => {
  const mockOnVerified = jest.fn();
  const mockOnRetry = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render OTP verification screen', () => {
    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Verify OTP')).toBeTruthy();
    expect(
      screen.getByText(/We've sent a 6-digit code/)
    ).toBeTruthy();
  });

  it('should accept only digits in OTP input', () => {
    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );
    const input = screen.getByPlaceholderText('000000');

    fireEvent.changeText(input, '123456A');
    expect(input.props.value).toBe('123456');
  });

  it('should limit OTP input to 6 digits', () => {
    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );
    const input = screen.getByPlaceholderText('000000');

    fireEvent.changeText(input, '1234567');
    expect(input.props.value).toBe('123456');
  });

  it('should disable verify button when OTP is incomplete', () => {
    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );
    const verifyButton = screen.getByText('Verify');

    expect(verifyButton.props.disabled).toBe(true);
  });

  it('should enable verify button when OTP is complete', () => {
    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );
    const input = screen.getByPlaceholderText('000000');
    const verifyButton = screen.getByText('Verify');

    fireEvent.changeText(input, '123456');

    expect(verifyButton.props.disabled).toBe(false);
  });

  it('should show validation error for invalid OTP', () => {
    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );
    const verifyButton = screen.getByText('Verify');

    fireEvent.press(verifyButton);

    expect(screen.getByText(/OTP must be 6 digits/)).toBeTruthy();
  });

  it('should call verifyOTP with valid OTP', async () => {
    mockAuthService.verifyOTP.mockResolvedValue({
      userId: 'user-123',
      partnerId: 'partner-123',
      phone: '9876543210',
      role: 'delivery',
      token: 'jwt-token',
    });

    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );
    const input = screen.getByPlaceholderText('000000');
    const verifyButton = screen.getByText('Verify');

    fireEvent.changeText(input, '123456');
    fireEvent.press(verifyButton);

    await waitFor(() => {
      expect(mockAuthService.verifyOTP).toHaveBeenCalledWith({
        phone: '9876543210',
        otp: '123456',
      });
    });
  });

  it('should call login and onVerified after successful verification', async () => {
    mockAuthService.verifyOTP.mockResolvedValue({
      userId: 'user-123',
      partnerId: 'partner-123',
      phone: '9876543210',
      role: 'delivery',
      token: 'jwt-token',
    });

    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );
    const input = screen.getByPlaceholderText('000000');
    const verifyButton = screen.getByText('Verify');

    fireEvent.changeText(input, '123456');
    fireEvent.press(verifyButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        userId: 'user-123',
        partnerId: 'partner-123',
        phone: '9876543210',
        token: 'jwt-token',
      });
      expect(mockOnVerified).toHaveBeenCalled();
    });
  });

  it('should handle OTP locked error', async () => {
    const error = new AppErrorClass('OTP_LOCKED', 'Too many attempts', 429);
    mockAuthService.verifyOTP.mockRejectedValue(error);

    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );
    const input = screen.getByPlaceholderText('000000');
    const verifyButton = screen.getByText('Verify');

    fireEvent.changeText(input, '123456');
    fireEvent.press(verifyButton);

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  it('should show countdown timer', () => {
    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('5:00')).toBeTruthy();

    jest.advanceTimersByTime(1000);
    expect(screen.getByText('4:59')).toBeTruthy();
  });

  it('should show resend button when OTP expires', () => {
    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );

    jest.advanceTimersByTime(300000);

    expect(screen.getByText('Request New OTP')).toBeTruthy();
  });

  it('should clear error when user changes OTP', () => {
    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );
    const input = screen.getByPlaceholderText('000000');
    const verifyButton = screen.getByText('Verify');

    fireEvent.press(verifyButton);
    expect(screen.getByText(/OTP must be 6 digits/)).toBeTruthy();

    fireEvent.changeText(input, '1');
    expect(screen.queryByText(/OTP must be 6 digits/)).toBeFalsy();
  });

  it('should call onRetry when change phone button is pressed', () => {
    render(
      <OTPVerifyScreen
        phone="9876543210"
        onVerified={mockOnVerified}
        onRetry={mockOnRetry}
      />
    );
    const changePhoneButton = screen.getByText('Change phone number?');

    fireEvent.press(changePhoneButton);

    expect(mockOnRetry).toHaveBeenCalled();
  });
});
