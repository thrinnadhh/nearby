import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OfflineBanner } from '@/components/OfflineBanner';

// Mock the useNetworkStatus hook
jest.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

describe('OfflineBanner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when online', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
    
    const { queryByText } = render(<OfflineBanner />);
    expect(queryByText(/offline/i)).toBeNull();
  });

  it('renders banner when offline', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    
    const { getByText } = render(<OfflineBanner />);
    expect(getByText(/you\'re offline|no internet/i)).toBeDefined();
  });

  it('displays appropriate offline message', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    
    const { getByText } = render(<OfflineBanner />);
    expect(getByText(/check your connection|offline mode/i)).toBeDefined();
  });

  it('uses warning color scheme', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    
    const { getByTestId } = render(<OfflineBanner />);
    const banner = getByTestId('offline-banner');
    
    // Should have warning/error styled background
    expect(banner.props.style.backgroundColor).toBe(expect.any(String));
  });

  it('handles transition from offline to online', () => {
    const { rerender, queryByText } = render(<OfflineBanner />);
    
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    rerender(<OfflineBanner />);
    expect(queryByText(/offline/i)).toBeDefined();
    
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
    rerender(<OfflineBanner />);
    expect(queryByText(/offline/i)).toBeNull();
  });

  it('displays icon along with message', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    
    const { getByTestId } = render(<OfflineBanner />);
    expect(getByTestId('offline-icon')).toBeDefined();
  });

  it('is positioned at top of screen', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    
    const { getByTestId } = render(<OfflineBanner />);
    const banner = getByTestId('offline-banner');
    
    expect(banner.props.style.position).toBe('absolute');
    expect(banner.props.style.top).toBe(0);
  });
});
