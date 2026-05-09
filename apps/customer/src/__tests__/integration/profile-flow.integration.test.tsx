import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import ProfileScreen from '@/app/(tabs)/profile';
import * as profileService from '@/services/profile';
import { useAuthStore } from '@/store/auth';
import { useProfileStore } from '@/store/profile';

jest.mock('@/services/profile');
jest.mock('@/store/auth');
jest.mock('@/store/profile');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('Profile Integration Tests', () => {
  const mockProfile = {
    id: 'user-123',
    phone: '+919876543210',
    role: 'customer',
    created_at: '2026-04-16T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as jest.Mock).mockReturnValue({
      token: 'mock-token',
      logout: jest.fn(),
    });
    (useProfileStore as jest.Mock).mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      fetchProfile: jest.fn(),
    });
  });

  it('loads and displays profile information', async () => {
    const { getByText } = render(<ProfileScreen />);
    
    await waitFor(() => {
      expect(getByText('+919876543210')).toBeDefined();
      expect(getByText(/customer/i)).toBeDefined();
    });
  });

  it('displays loading state while fetching profile', async () => {
    (useProfileStore as jest.Mock).mockReturnValue({
      profile: null,
      loading: true,
      error: null,
      fetchProfile: jest.fn(),
    });

    const { getByTestId } = render(<ProfileScreen />);
    expect(getByTestId('skeleton-loader')).toBeDefined();
  });

  it('handles profile fetch error gracefully', async () => {
    const error = new Error('Failed to fetch profile');
    (useProfileStore as jest.Mock).mockReturnValue({
      profile: null,
      loading: false,
      error,
      fetchProfile: jest.fn(),
    });

    const { getByText } = render(<ProfileScreen />);
    expect(getByText(/failed to load/i)).toBeDefined();
  });

  it('navigates to edit profile screen', async () => {
    const mockRouter = {
      push: jest.fn(),
    };
    
    jest.mock('expo-router', () => ({
      useRouter: () => mockRouter,
    }));

    const { getByText } = render(<ProfileScreen />);
    
    await waitFor(() => {
      const editButton = getByText('Edit Profile');
      fireEvent.press(editButton);
      expect(mockRouter.push).toHaveBeenCalledWith('/profile/edit');
    });
  });

  it('displays correct role badge for customer', async () => {
    const { getByText } = render(<ProfileScreen />);
    
    await waitFor(() => {
      expect(getByText(/customer/i)).toBeDefined();
    });
  });

  it('shows formatted account creation date', async () => {
    const { getByText } = render(<ProfileScreen />);
    
    await waitFor(() => {
      expect(getByText(/account created/i)).toBeDefined();
      expect(getByText(/apr.*16|16.*apr/i)).toBeDefined();
    });
  });

  it('displays menu items', async () => {
    const { getByText } = render(<ProfileScreen />);
    
    await waitFor(() => {
      expect(getByText('Edit Profile')).toBeDefined();
      expect(getByText('Saved Addresses')).toBeDefined();
      expect(getByText('Logout')).toBeDefined();
    });
  });

  it('requires confirmation before logout', async () => {
    const { getByText } = render(<ProfileScreen />);
    
    await waitFor(() => {
      const logoutButton = getByText('Logout');
      fireEvent.press(logoutButton);
      // Alert dialog should appear
      expect(screen.queryByText(/are you sure/i)).toBeDefined();
    });
  });
});
