/**
 * Unit tests for LoginScreen
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import * as authService from '@/services/auth';
import { AppErrorClass } from '@/types/common';

jest.mock('@/services/auth');
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('LoginScreen', () => {
  const mockOnPhoneSubmitted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnPhoneSubmitted.mockClear();
  });

  it('should render login screen with phone input', () => {
    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);

    expect(screen.getByText('Welcome to NearBy')).toBeTruthy();
    expect(screen.getByPlaceholderText('9876543210')).toBeTruthy();
  });

  it('should accept only digits in phone input', () => {
    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);
    const input = screen.getByPlaceholderText('9876543210');

    fireEvent.changeText(input, '9876543210A');
    expect(input.props.value).toBe('9876543210');
  });

  it('should limit phone input to 10 digits', () => {
    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);
    const input = screen.getByPlaceholderText('9876543210');

    fireEvent.changeText(input, '98765432101');
    expect(input.props.value).toBe('9876543210');
  });

  it('should disable submit button when phone is invalid', () => {
    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);
    const submitButton = screen.getByText('Request OTP');

    expect(submitButton.props.disabled).toBe(true);
  });

  it('should enable submit button when phone is valid', () => {
    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);
    const input = screen.getByPlaceholderText('9876543210');
    const submitButton = screen.getByText('Request OTP');

    fireEvent.changeText(input, '9876543210');

    expect(submitButton.props.disabled).toBe(false);
  });

  it('should show validation error for invalid phone', () => {
    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);
    const submitButton = screen.getByText('Request OTP');

    fireEvent.press(submitButton);

    expect(
      screen.getByText('Please enter a valid 10-digit phone number')
    ).toBeTruthy();
  });

  it('should call requestOTP with valid phone', async () => {
    mockAuthService.requestOTP.mockResolvedValue({ status: 'sent', expiresIn: 300 });

    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);
    const input = screen.getByPlaceholderText('9876543210');
    const submitButton = screen.getByText('Request OTP');

    fireEvent.changeText(input, '9876543210');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockAuthService.requestOTP).toHaveBeenCalledWith({
        phone: '9876543210',
      });
    });
  });

  it('should call onPhoneSubmitted after successful OTP request', async () => {
    mockAuthService.requestOTP.mockResolvedValue({ status: 'sent', expiresIn: 300 });

    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);
    const input = screen.getByPlaceholderText('9876543210');
    const submitButton = screen.getByText('Request OTP');

    fireEvent.changeText(input, '9876543210');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnPhoneSubmitted).toHaveBeenCalledWith('9876543210');
    });
  });

  it('should handle OTP request error', async () => {
    const error = new AppErrorClass(
      'OTP_REQUEST_FAILED',
      'Failed to send OTP'
    );
    mockAuthService.requestOTP.mockRejectedValue(error);

    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);
    const input = screen.getByPlaceholderText('9876543210');
    const submitButton = screen.getByText('Request OTP');

    fireEvent.changeText(input, '9876543210');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to send OTP')).toBeTruthy();
    });
  });

  it('should show loading state while sending OTP', async () => {
    mockAuthService.requestOTP.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ status: 'sent', expiresIn: 300 }), 100))
    );

    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);
    const input = screen.getByPlaceholderText('9876543210');
    const submitButton = screen.getByText('Request OTP');

    fireEvent.changeText(input, '9876543210');
    fireEvent.press(submitButton);

    expect(screen.getByText('Sending OTP...')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Request OTP')).toBeTruthy();
    });
  });

  it('should clear error message when user changes phone', () => {
    render(<LoginScreen onPhoneSubmitted={mockOnPhoneSubmitted} />);
    const input = screen.getByPlaceholderText('9876543210');
    const submitButton = screen.getByText('Request OTP');

    fireEvent.press(submitButton);
    expect(
      screen.getByText('Please enter a valid 10-digit phone number')
    ).toBeTruthy();

    fireEvent.changeText(input, '9876');
    expect(
      screen.queryByText('Please enter a valid 10-digit phone number')
    ).toBeFalsy();
  });
});
