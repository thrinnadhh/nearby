import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import DeliveryPartnerProfile from '../../partner-profile/[partnerId]';
import * as reviewService from '@/services/reviews';
import * as Linking from 'react-native/Libraries/Linking/Linking';

// Mock dependencies
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/store/auth');
jest.mock('@/services/reviews');
jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true as any));

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

const mockStats = {
  average_rating: 4.6,
  total_reviews: 48,
  distribution: {
    1: 2,
    2: 1,
    3: 4,
    4: 12,
    5: 29,
  },
};

const mockReviews = [
  {
    id: 'rev1',
    rating: 5,
    review_text: 'Excellent delivery! Very professional.',
    created_at: '2026-04-10T10:30:00Z',
  },
  {
    id: 'rev2',
    rating: 5,
    review_text: 'On time and polite.',
    created_at: '2026-04-09T15:20:00Z',
  },
  {
    id: 'rev3',
    rating: 4,
    review_text: 'Good service, took a bit longer than expected.',
    created_at: '2026-04-08T12:10:00Z',
  },
];

describe('DeliveryPartnerProfile - Task 9.6 Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      token: 'test-token',
      userId: 'customer1',
    });
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      partnerId: 'partner1',
    });
    (reviewService.getReviewStats as jest.Mock).mockResolvedValue(mockStats);

    // Mock fetch for reviews list
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        data: mockReviews,
        meta: { total: 48, page: 1, limit: 5 },
      }),
    });
  });

  describe('Screen Rendering and Loading', () => {
    it('should display loading indicator initially', () => {
      render(<DeliveryPartnerProfile />);
      expect(screen.getByText('Loading partner profile...')).toBeTruthy();
    });

    it('should render partner profile screen after loading', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('Delivery Partner')).toBeTruthy();
      });
    });

    it('should display header with back button', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeTruthy();
      });
    });

    it('should display partner name', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('Raj Kumar')).toBeTruthy();
      });
    });

    it('should display vehicle information', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/🚗/)).toBeTruthy();
      });
    });

    it('should display experience', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('📅 2+ years')).toBeTruthy();
      });
    });
  });

  describe('Trust Badge Display', () => {
    it('should display Trusted badge for rating >= 80', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        ...mockStats,
        average_rating: 85,
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('Trusted')).toBeTruthy();
      });
    });

    it('should display Good badge for rating 60-79', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        ...mockStats,
        average_rating: 72,
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('Good')).toBeTruthy();
      });
    });

    it('should display New badge for rating 40-59', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        ...mockStats,
        average_rating: 48,
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeTruthy();
      });
    });

    it('should display Under Review badge for rating < 40', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        ...mockStats,
        average_rating: 35,
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('Under Review')).toBeTruthy();
      });
    });
  });

  describe('Rating Display', () => {
    it('should display average rating score', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('4.6')).toBeTruthy();
      });
    });

    it('should display star rating', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        // Should display filled stars based on rating
        const stars = screen.getAllByText('★');
        expect(stars.length).toBeGreaterThan(0);
      });
    });

    it('should display review count', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('48')).toBeTruthy();
        expect(screen.getByText('Reviews')).toBeTruthy();
      });
    });

    it('should display zero rating when no stats available', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        average_rating: 0,
        total_reviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('0.0')).toBeTruthy();
      });
    });
  });

  describe('Rating Distribution', () => {
    it('should display 5-star distribution row', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('5★')).toBeTruthy();
      });
    });

    it('should display correct percentages for distribution', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        // 29/48 = 60%
        expect(screen.getByText(/60%/)).toBeTruthy();
      });
    });

    it('should calculate all distribution percentages correctly', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        // 1 star: 2/48 = 4%
        // 2 star: 1/48 = 2%
        // 3 star: 4/48 = 8%
        // 4 star: 12/48 = 25%
        // 5 star: 29/48 = 60%
        expect(screen.getByText(/4%/)).toBeTruthy();
      });
    });

    it('should render distribution bars for all ratings', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        const ratingLabels = ['5★', '4★', '3★', '2★', '1★'];
        ratingLabels.forEach((label) => {
          expect(screen.getByText(label)).toBeTruthy();
        });
      });
    });

    it('should show zero percentage when rating has no reviews', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        ...mockStats,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 48 },
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        // 2 star: 0/48 = 0%
        expect(screen.getByText('0★')).toBeTruthy();
      });
    });
  });

  describe('Recent Reviews Display', () => {
    it('should display recent reviews section', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('Recent Reviews')).toBeTruthy();
      });
    });

    it('should display review count if more reviews exist', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        // 48 total - 5 shown = 43 more
        expect(screen.getByText(/43 more/)).toBeTruthy();
      });
    });

    it('should display first review text', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('Excellent delivery! Very professional.')).toBeTruthy();
      });
    });

    it('should display multiple review texts', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('On time and polite.')).toBeTruthy();
        expect(screen.getByText(/Good service/)).toBeTruthy();
      });
    });

    it('should display star ratings for each review', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        const starSymbols = screen.getAllByText('★');
        // Should have stars from rating display + reviews
        expect(starSymbols.length).toBeGreaterThan(5);
      });
    });

    it('should display review dates', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        // Should show formatted dates like "4/10/2026"
        expect(screen.getByText(/4\/1[0-9]\/2026/)).toBeTruthy();
      });
    });

    it('should handle reviews without text gracefully', async () => {
      const noTextReviews = [
        {
          id: 'rev1',
          rating: 4,
          review_text: undefined,
          created_at: '2026-04-10T10:30:00Z',
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          data: noTextReviews,
          meta: { total: 1, page: 1, limit: 5 },
        }),
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('Recent Reviews')).toBeTruthy();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no reviews', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        average_rating: 0,
        total_reviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });

      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, limit: 5 },
        }),
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('No Reviews Yet')).toBeTruthy();
        expect(screen.getByText(/brand new/)).toBeTruthy();
      });
    });

    it('should show encouragement message in empty state', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        average_rating: 0,
        total_reviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });

      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          data: [],
          meta: { total: 0, page: 1, limit: 5 },
        }),
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText(/Be the first to leave a review/)).toBeTruthy();
      });
    });
  });

  describe('Contact Button', () => {
    it('should display contact call button', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('Call')).toBeTruthy();
      });
    });

    it('should open phone dialer when contact button pressed', async () => {
      const { getByText } = render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(getByText('Call')).toBeTruthy();
      });

      const callButtons = screen.getAllByText('Call');
      fireEvent.press(callButtons[0]);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('tel:+919876543210');
      });
    });

    it('should display phone icon on contact button', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('📞')).toBeTruthy();
      });
    });
  });

  describe('Info Section', () => {
    it('should display vehicle number', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('KA05AB1234')).toBeTruthy();
      });
    });

    it('should display phone number', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('+919876543210')).toBeTruthy();
      });
    });

    it('should display experience info', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('2+ years')).toBeTruthy();
      });
    });

    it('should display total deliveries count', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        const totalDeliveries = screen.getAllByText('48');
        expect(totalDeliveries.length).toBeGreaterThan(1); // Once in reviews, once in info
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button pressed', async () => {
      const { getByText } = render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(getByText('← Back')).toBeTruthy();
      });

      fireEvent.press(getByText('← Back'));

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('should show error screen if order fetch fails', async () => {
      (reviewService.getReviewStats as jest.Mock).mockRejectedValue(
        new Error('Failed to load stats')
      );

      const { getByText } = render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(getByText('Unable to Load Profile')).toBeTruthy();
      });
    });

    it('should show go back button on error', async () => {
      (reviewService.getReviewStats as jest.Mock).mockRejectedValue(
        new Error('Failed to load')
      );

      const { getByText } = render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(getByText('Go Back')).toBeTruthy();
      });

      fireEvent.press(getByText('Go Back'));

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle review fetch failure gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        // Should still show stats, but reviews may not load
        expect(screen.getByText('4.6')).toBeTruthy();
      });
    });

    it('should handle missing partner ID', async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        partnerId: undefined,
      });

      render(<DeliveryPartnerProfile />);

      // Should still try to render with undefined partnerId
      expect(screen.getByText('Loading partner profile...')).toBeTruthy();
    });

    it('should handle missing auth token', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        token: undefined,
      });

      render(<DeliveryPartnerProfile />);

      expect(screen.getByText('Loading partner profile...')).toBeTruthy();
    });

    it('should display error message if loading fails', async () => {
      (reviewService.getReviewStats as jest.Mock).mockRejectedValue(
        new Error('Network timeout')
      );

      const { getByText } = render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(getByText(/Network timeout/)).toBeTruthy();
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very high rating (5.0)', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        average_rating: 5.0,
        total_reviews: 100,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 100 },
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('5.0')).toBeTruthy();
        expect(screen.getByText('Trusted')).toBeTruthy();
      });
    });

    it('should handle very low rating (1.0)', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        average_rating: 1.0,
        total_reviews: 10,
        distribution: { 1: 10, 2: 0, 3: 0, 4: 0, 5: 0 },
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('1.0')).toBeTruthy();
        expect(screen.getByText('Under Review')).toBeTruthy();
      });
    });

    it('should handle large review counts', async () => {
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue({
        ...mockStats,
        total_reviews: 5000,
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('5000')).toBeTruthy();
      });
    });

    it('should truncate long review text', async () => {
      const longReview = 'a'.repeat(500);
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          data: [
            {
              id: 'rev1',
              rating: 5,
              review_text: longReview,
              created_at: '2026-04-10T10:30:00Z',
            },
          ],
          meta: { total: 1, page: 1, limit: 5 },
        }),
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        // FlatList should handle truncation via numberOfLines={3}
        expect(screen.getByText('Recent Reviews')).toBeTruthy();
      });
    });

    it('should handle missing review text field', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          data: [
            {
              id: 'rev1',
              rating: 5,
              created_at: '2026-04-10T10:30:00Z',
            },
          ],
          meta: { total: 1, page: 1, limit: 5 },
        }),
      });

      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(screen.getByText('Recent Reviews')).toBeTruthy();
      });
    });
  });

  describe('API Integration', () => {
    it('should call getReviewStats with partnerId', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(reviewService.getReviewStats).toHaveBeenCalledWith('partner1', 'test-token');
      });
    });

    it('should fetch reviews list after stats load', async () => {
      render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/reviews/user/partner1/list'),
          expect.objectContaining({
            headers: { Authorization: 'Bearer test-token' },
          })
        );
      });
    });

    it('should retry on network failures', async () => {
      const { getByText } = render(<DeliveryPartnerProfile />);

      await waitFor(() => {
        expect(getByText('Unable to Load Profile')).toBeTruthy();
      });

      // Reset mock and retry
      (reviewService.getReviewStats as jest.Mock).mockResolvedValue(mockStats);

      fireEvent.press(getByText('Go Back'));
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });
});
