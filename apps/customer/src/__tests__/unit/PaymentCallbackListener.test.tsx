import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { PaymentCallbackListener } from '../../components/PaymentCallbackListener';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Linking: {
    addEventListener: jest.fn(),
    getInitialURL: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PaymentCallbackListener', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  let mockAddEventListener: jest.Mock;
  let mockGetInitialURL: jest.Mock;
  let mockOnCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOnCallback = jest.fn();
    mockAddEventListener = jest.fn();
    mockGetInitialURL = jest.fn().mockResolvedValue(null);

    (Linking.addEventListener as jest.Mock).mockImplementation(mockAddEventListener);
    (Linking.getInitialURL as jest.Mock).mockImplementation(mockGetInitialURL);
  });

  it('should render without error', () => {
    const { container } = render(
      <PaymentCallbackListener onPaymentCallback={mockOnCallback} />
    );
    expect(container).toBeTruthy();
  });

  it('should register deep-link listener on mount', () => {
    render(<PaymentCallbackListener onPaymentCallback={mockOnCallback} />);

    expect(mockAddEventListener).toHaveBeenCalledWith('url', expect.any(Function));
  });

  it('should check for initial URL on mount', async () => {
    render(<PaymentCallbackListener onPaymentCallback={mockOnCallback} />);

    await waitFor(() => {
      expect(mockGetInitialURL).toHaveBeenCalled();
    });
  });

  it('should parse and call callback for success payment', async () => {
    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === 'url') {
        callback({
          url: `nearby-customer://payment-callback?orderId=${validUUID}&status=success`,
        });
      }
      return { remove: jest.fn() };
    });

    render(<PaymentCallbackListener onPaymentCallback={mockOnCallback} />);

    await waitFor(() => {
      expect(mockOnCallback).toHaveBeenCalledWith(validUUID, 'success');
    });
  });

  it('should parse and call callback for failed payment', async () => {
    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === 'url') {
        callback({
          url: `nearby-customer://payment-callback?orderId=${validUUID}&status=failed`,
        });
      }
      return { remove: jest.fn() };
    });

    render(<PaymentCallbackListener onPaymentCallback={mockOnCallback} />);

    await waitFor(() => {
      expect(mockOnCallback).toHaveBeenCalledWith(validUUID, 'failed');
    });
  });

  it('should ignore non-payment callbacks', async () => {
    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === 'url') {
        callback({
          url: 'nearby-customer://home',
        });
      }
      return { remove: jest.fn() };
    });

    render(<PaymentCallbackListener onPaymentCallback={mockOnCallback} />);

    await waitFor(() => {
      expect(mockOnCallback).not.toHaveBeenCalled();
    });
  });

  it('should ignore malformed payment callbacks', async () => {
    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === 'url') {
        callback({
          url: 'nearby-customer://payment-callback?orderId=not-a-uuid&status=success',
        });
      }
      return { remove: jest.fn() };
    });

    render(<PaymentCallbackListener onPaymentCallback={mockOnCallback} />);

    await waitFor(() => {
      expect(mockOnCallback).not.toHaveBeenCalled();
    });
  });

  it('should ignore callbacks with invalid status', async () => {
    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === 'url') {
        callback({
          url: `nearby-customer://payment-callback?orderId=${validUUID}&status=pending`,
        });
      }
      return { remove: jest.fn() };
    });

    render(<PaymentCallbackListener onPaymentCallback={mockOnCallback} />);

    await waitFor(() => {
      expect(mockOnCallback).not.toHaveBeenCalled();
    });
  });

  it('should handle initial URL with payment callback', async () => {
    mockGetInitialURL.mockResolvedValue(
      `nearby-customer://payment-callback?orderId=${validUUID}&status=success`
    );

    render(<PaymentCallbackListener onPaymentCallback={mockOnCallback} />);

    await waitFor(() => {
      expect(mockOnCallback).toHaveBeenCalledWith(validUUID, 'success');
    });
  });

  it('should remove listener on unmount', () => {
    const mockRemove = jest.fn();
    mockAddEventListener.mockReturnValue({ remove: mockRemove });

    const { unmount } = render(
      <PaymentCallbackListener onPaymentCallback={mockOnCallback} />
    );

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('should call callback with correct order ID and status', async () => {
    const testCases = [
      { uuid: '550e8400-e29b-41d4-a716-446655440000', status: 'success' },
      { uuid: '6ba7b810-9dad-41d3-80b4-00c04fd430c8', status: 'failed' },
      { uuid: 'ffffffff-ffff-4fff-bfff-ffffffffffff', status: 'success' },
    ];

    for (const { uuid, status } of testCases) {
      mockOnCallback.mockClear();

      mockAddEventListener.mockImplementation((event, callback) => {
        if (event === 'url') {
          callback({
            url: `nearby-customer://payment-callback?orderId=${uuid}&status=${status}`,
          });
        }
        return { remove: jest.fn() };
      });

      const { unmount } = render(
        <PaymentCallbackListener onPaymentCallback={mockOnCallback} />
      );

      await waitFor(() => {
        expect(mockOnCallback).toHaveBeenCalledWith(uuid, status);
      });

      unmount();
    }
  });
});
