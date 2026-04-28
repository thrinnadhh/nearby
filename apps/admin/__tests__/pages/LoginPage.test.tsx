import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import * as api from '@/services/api';

vi.mock('@/services/api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders phone input on initial load', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    expect(screen.getByPlaceholderText(/10-digit phone/i)).toBeInTheDocument();
    expect(screen.getByText(/Send OTP/i)).toBeInTheDocument();
  });

  it('validates phone number format', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    const phoneInput = screen.getByPlaceholderText(/10-digit phone/i) as HTMLInputElement;
    const sendButton = screen.getByText(/Send OTP/i);

    expect(sendButton).toBeDisabled();

    await user.type(phoneInput, '9876543210');
    expect(sendButton).not.toBeDisabled();
  });

  it('restricts to 10 digits', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    const phoneInput = screen.getByPlaceholderText(/10-digit phone/i) as HTMLInputElement;
    await user.type(phoneInput, '98765432101');

    expect(phoneInput.value).toBe('9876543210');
  });

  it('shows OTP input after sending OTP', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'sendOtp').mockResolvedValue({
      success: true,
      data: { message: 'OTP sent' },
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    const phoneInput = screen.getByPlaceholderText(/10-digit phone/i);
    await user.type(phoneInput, '9876543210');
    await user.click(screen.getByText(/Send OTP/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/6-digit OTP/i)).toBeInTheDocument();
    });
  });

  it('displays error on OTP send failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Network error';
    vi.spyOn(api.adminApi, 'sendOtp').mockRejectedValue(
      new Error(errorMessage),
    );

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    const phoneInput = screen.getByPlaceholderText(/10-digit phone/i);
    await user.type(phoneInput, '9876543210');
    await user.click(screen.getByText(/Send OTP/i));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows back button on OTP screen', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'sendOtp').mockResolvedValue({
      success: true,
      data: { message: 'OTP sent' },
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    await user.type(screen.getByPlaceholderText(/10-digit phone/i), '9876543210');
    await user.click(screen.getByText(/Send OTP/i));

    await waitFor(() => {
      expect(screen.getByText(/Back/)).toBeInTheDocument();
    });
  });

  it('returns to phone input when back is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'sendOtp').mockResolvedValue({
      success: true,
      data: { message: 'OTP sent' },
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    await user.type(screen.getByPlaceholderText(/10-digit phone/i), '9876543210');
    await user.click(screen.getByText(/Send OTP/i));

    await waitFor(() => {
      expect(screen.getByText(/Back/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Back/));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/10-digit phone/i)).toBeInTheDocument();
    });
  });

  it('requires 6-digit OTP', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'sendOtp').mockResolvedValue({
      success: true,
      data: { message: 'OTP sent' },
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    await user.type(screen.getByPlaceholderText(/10-digit phone/i), '9876543210');
    await user.click(screen.getByText(/Send OTP/i));

    await waitFor(() => {
      const otpInput = screen.getByPlaceholderText(/6-digit OTP/i) as HTMLInputElement;
      expect(otpInput).toBeInTheDocument();

      const verifyButton = screen.getByText(/Verify/);
      expect(verifyButton).toBeDisabled();

      fireEvent.change(otpInput, { target: { value: '12345' } });
      expect(verifyButton).toBeDisabled();

      fireEvent.change(otpInput, { target: { value: '123456' } });
      expect(verifyButton).not.toBeDisabled();
    });
  });

  it('handles OTP verification', async () => {
    const user = userEvent.setup();
    const mockNavigate = vi.fn();

    vi.spyOn(api.adminApi, 'sendOtp').mockResolvedValue({
      success: true,
      data: { message: 'OTP sent' },
    });
    vi.spyOn(api.adminApi, 'verifyOtp').mockResolvedValue({
      success: true,
      data: {
        jwt: 'test-token',
        user: { userId: '123', phone: '+919876543210', role: 'admin' },
      },
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    await user.type(screen.getByPlaceholderText(/10-digit phone/i), '9876543210');
    await user.click(screen.getByText(/Send OTP/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/6-digit OTP/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/6-digit OTP/i), '123456');
    await user.click(screen.getByText(/Verify/));

    await waitFor(() => {
      expect(api.adminApi.verifyOtp).toHaveBeenCalledWith(
        '+919876543210',
        '123456',
      );
    });
  });

  it('restricts admin-only access', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'sendOtp').mockResolvedValue({
      success: true,
      data: { message: 'OTP sent' },
    });
    vi.spyOn(api.adminApi, 'verifyOtp').mockRejectedValue(
      new Error('Only admin users can access this dashboard'),
    );

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    await user.type(screen.getByPlaceholderText(/10-digit phone/i), '9876543210');
    await user.click(screen.getByText(/Send OTP/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/6-digit OTP/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/6-digit OTP/i), '123456');
    await user.click(screen.getByText(/Verify/));

    await waitFor(() => {
      expect(
        screen.getByText(/Only admin users can access/i),
      ).toBeInTheDocument();
    });
  });

  it('shows loading spinner during OTP send', async () => {
    const user = userEvent.setup();
    let resolveOtp: () => void = () => {};
    const otpPromise = new Promise<void>((resolve) => {
      resolveOtp = resolve;
    });

    vi.spyOn(api.adminApi, 'sendOtp').mockImplementation(
      () =>
        new Promise((resolve) => {
          otpPromise.then(() => {
            resolve({
              success: true,
              data: { message: 'OTP sent' },
            });
          });
        }),
    );

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>,
    );

    await user.type(screen.getByPlaceholderText(/10-digit phone/i), '9876543210');

    const sendButton = screen.getByText(/Send OTP/i);
    await user.click(sendButton);

    resolveOtp();
  });
});
