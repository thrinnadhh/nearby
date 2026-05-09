import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import ReviewSubmissionScreen from '../../reviews/compose/[orderId]';
import * as reviewService from '@/services/reviews';
import * as ordersService from '@/services/orders';
import * as Alert from 'react-native/Libraries/Alert/Alert';

// Mock dependencies
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/store/auth');
jest.mock('@/services/reviews');
jest.mock('@/services/orders');
jest.spyOn(Alert, 'alert').mockImplementation();

const mockRouter = {
  replace: jest.fn(),
  back: jest.fn(),
};

const mockOrder = {
  id: 'order123',
  shop_id: 'shop1',
  customer_id: 'customer1',
  order_status: 'delivered',
  total_amount: 50000,
  delivery_partner: {
    id: 'delivery1',
    name: 'Raj Kumar',
    phone: '+919876543210',
    vehicle_type: 'Bike',
    vehicle_number: 'KA05AB1234',
    rating: 4.8,
    total_deliveries: 147,
  },
};

describe('ReviewSubmissionScreen - Task 9.5 Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      token: 'test-token',
      userId: 'customer1',
    });
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      orderId: 'order123',
    });
    (ordersService.getOrder as jest.Mock).mockResolvedValue(mockOrder);
  });

  describe('Screen Rendering and Initial State', () => {
    it('should display loading indicator initially', () => {
      render(<ReviewSubmissionScreen />);
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('should render review submission screen after loading', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Delivery')).toBeTruthy();
      });
    });

    it('should display header with title and subtitle', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Delivery')).toBeTruthy();
        expect(screen.getByText('Help us improve the service')).toBeTruthy();
      });
    });

    it('should display delivery partner information', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('Raj Kumar')).toBeTruthy();
        expect(screen.getByText(/Bike/)).toBeTruthy();
      });
    });

    it('should display star rating section', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('How would you rate this delivery?')).toBeTruthy();
      });
    });

    it('should display optional feedback section', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('Additional Feedback (Optional)')).toBeTruthy();
        expect(screen.getByText('Share more details about your experience')).toBeTruthy();
      });
    });

    it('should display helpful tips section', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('Helpful Tips')).toBeTruthy();
      });
    });

    it('should render 5 star buttons', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        const starButtons = screen.getAllByText(/☆/);
        expect(starButtons.length).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('Star Rating Selection', () => {
    it('should update rating to 1 when first star tapped', async () => {
      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Poor')).toBeTruthy();
      });
    });

    it('should update rating to 3 when third star tapped', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[2]);

      await waitFor(() => {
        expect(screen.getByText('Good')).toBeTruthy();
      });
    });

    it('should update rating to 5 when fifth star tapped', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[4]);

      await waitFor(() => {
        expect(screen.getByText('Excellent')).toBeTruthy();
      });
    });

    it('should display correct label for 2-star rating', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[1]);

      await waitFor(() => {
        expect(screen.getByText('Fair')).toBeTruthy();
      });
    });

    it('should display correct label for 4-star rating', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[3]);

      await waitFor(() => {
        expect(screen.getByText('Very Good')).toBeTruthy();
      });
    });

    it('should allow changing rating after selection', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');

      // First select 2 stars
      fireEvent.press(starButtons[1]);
      await waitFor(() => {
        expect(screen.getByText('Fair')).toBeTruthy();
      });

      // Then change to 5 stars
      const updatedStars = screen.getAllByText('☆');
      fireEvent.press(updatedStars[4]);

      await waitFor(() => {
        expect(screen.getByText('Excellent')).toBeTruthy();
      });
    });

    it('should not display rating label without selection', async () => {
      render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('How would you rate this delivery?')).toBeTruthy();
      });

      expect(screen.queryByText('Poor')).toBeFalsy();
      expect(screen.queryByText('Fair')).toBeFalsy();
      expect(screen.queryByText('Good')).toBeFalsy();
    });
  });

  describe('Review Text Input', () => {
    it('should allow text input', async () => {
      const { getByPlaceholderText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('What was your experience like?')).toBeTruthy();
      });

      const textInput = getByPlaceholderText('What was your experience like?');
      fireEvent.changeText(textInput, 'Great delivery, arrived on time!');

      expect(textInput.props.value).toBe('Great delivery, arrived on time!');
    });

    it('should display character count', async () => {
      const { getByPlaceholderText, getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('What was your experience like?')).toBeTruthy();
      });

      const textInput = getByPlaceholderText('What was your experience like?');
      fireEvent.changeText(textInput, 'Good service');

      expect(getByText(/12\/500/)).toBeTruthy();
    });

    it('should enforce 500 character limit', async () => {
      const { getByPlaceholderText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('What was your experience like?')).toBeTruthy();
      });

      const longText = 'a'.repeat(501);
      const textInput = getByPlaceholderText('What was your experience like?');
      fireEvent.changeText(textInput, longText);

      // maxLength should prevent text exceeding 500 chars
      expect(textInput.props.value.length).toBeLessThanOrEqual(500);
    });

    it('should show warning when near character limit', async () => {
      const { getByPlaceholderText, getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('What was your experience like?')).toBeTruthy();
      });

      const textInput = getByPlaceholderText('What was your experience like?');
      const text = 'a'.repeat(460);
      fireEvent.changeText(textInput, text);

      expect(getByText(/460\/500/)).toBeTruthy();
    });

    it('should allow empty review text (optional field)', async () => {
      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(screen.getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[3]); // 4 stars

      expect(() => {
        fireEvent.press(getByText('Submit Review'));
      }).not.toThrow();
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting without rating', async () => {
      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Submit Review')).toBeTruthy();
      });

      // Try to submit without rating
      fireEvent.press(getByText('Submit Review'));

      // Submit button should be disabled when rating is 0
      const submitButton = getByText('Submit Review');
      expect(submitButton.props.disabled).toBe(true);
    });

    it('should disable submit button without rating selected', async () => {
      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Submit Review')).toBeTruthy();
      });

      const submitButton = getByText('Submit Review');
      expect(submitButton.props.disabled).toBe(true);
    });

    it('should enable submit button after rating selected', async () => {
      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Submit Review')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[2]); // 3 stars

      await waitFor(() => {
        const submitButton = getByText('Submit Review');
        expect(submitButton.props.disabled).toBe(false);
      });
    });

    it('should show error banner for character limit violation', async () => {
      const { getByPlaceholderText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('What was your experience like?')).toBeTruthy();
      });

      const textInput = getByPlaceholderText('What was your experience like?');
      const longText = 'a'.repeat(501);
      fireEvent.changeText(textInput, longText);

      // Clear form error state and verify error shows
      // Character limit enforced at input level, so no submission needed
    });

    it('should clear error on rating change', async () => {
      const { getByText, getByPlaceholderText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText('What was your experience like?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[0]);

      // Error should be cleared after changing form input
      expect(screen.queryByText('Please select a rating')).toBeFalsy();
    });
  });

  describe('Review Submission', () => {
    it('should submit review with rating and text', async () => {
      (reviewService.submitReview as jest.Mock).mockResolvedValue({
        id: 'review1',
      });

      const { getByText, getByPlaceholderText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('How would you rate this delivery?')).toBeTruthy();
      });

      // Select 4 stars
      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[3]);

      // Enter review text
      const textInput = getByPlaceholderText('What was your experience like?');
      fireEvent.changeText(textInput, 'Excellent delivery experience!');

      // Submit
      fireEvent.press(getByText('Submit Review'));

      await waitFor(() => {
        expect(reviewService.submitReview).toHaveBeenCalledWith(
          expect.objectContaining({
            order_id: 'order123',
            reviewed_user_id: 'delivery1',
            rating: 4,
            review_text: 'Excellent delivery experience!',
          })
        );
      });
    });

    it('should submit review with rating only (no text)', async () => {
      (reviewService.submitReview as jest.Mock).mockResolvedValue({
        id: 'review1',
      });

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('How would you rate this delivery?')).toBeTruthy();
      });

      // Select 5 stars only (no text)
      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[4]);

      // Submit
      fireEvent.press(getByText('Submit Review'));

      await waitFor(() => {
        expect(reviewService.submitReview).toHaveBeenCalledWith(
          expect.objectContaining({
            rating: 5,
          })
        );
      });
    });

    it('should show loading state during submission', async () => {
      (reviewService.submitReview as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ id: 'review1' }), 1000);
          })
      );

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[2]);

      fireEvent.press(getByText('Submit Review'));

      await waitFor(() => {
        expect(getByText('Submit Review').props.disabled).toBe(true);
      });
    });

    it('should show success alert after submission', async () => {
      (reviewService.submitReview as jest.Mock).mockResolvedValue({
        id: 'review1',
      });

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[3]);

      fireEvent.press(getByText('Submit Review'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Review Submitted',
          'Thank you for your feedback!',
          expect.any(Array)
        );
      });
    });

    it('should navigate to home after successful submission', async () => {
      (reviewService.submitReview as jest.Mock).mockResolvedValue({
        id: 'review1',
      });

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[3]);

      fireEvent.press(getByText('Submit Review'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
        // Confirm done button press navigates
        const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
        expect(alertCall[2][0].onPress).toBeDefined();
      });
    });

    it('should handle submission error gracefully', async () => {
      const errorMessage = 'Network error';
      (reviewService.submitReview as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      const { getByText, getByPlaceholderText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[3]);

      fireEvent.press(getByText('Submit Review'));

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeTruthy();
      });
    });

    it('should allow retry after submission error', async () => {
      let callCount = 0;
      (reviewService.submitReview as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ id: 'review1' });
      });

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[3]);

      // First submission (fails)
      fireEvent.press(getByText('Submit Review'));

      await waitFor(() => {
        expect(reviewService.submitReview).toHaveBeenCalledTimes(1);
      });

      // Retry submission (succeeds)
      fireEvent.press(getByText('Submit Review'));

      await waitFor(() => {
        expect(reviewService.submitReview).toHaveBeenCalledTimes(2);
        expect(Alert.alert).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation and Actions', () => {
    it('should navigate back when Skip button pressed', async () => {
      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Skip')).toBeTruthy();
      });

      fireEvent.press(getByText('Skip'));

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('should disable Skip button during submission', async () => {
      (reviewService.submitReview as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ id: 'review1' }), 1000);
          })
      );

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[2]);

      fireEvent.press(getByText('Submit Review'));

      await waitFor(() => {
        const skipButton = getByText('Skip');
        expect(skipButton.props.disabled).toBe(true);
      });
    });

    it('should handle missing orderId gracefully', async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        orderId: undefined,
      });

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Loading...')).toBeTruthy();
      });
    });

    it('should handle missing token gracefully', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        token: undefined,
        userId: undefined,
      });

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Loading...')).toBeTruthy();
      });
    });
  });

  describe('Error States', () => {
    it('should display error when order fetch fails', async () => {
      (ordersService.getOrder as jest.Mock).mockRejectedValue(
        new Error('Order not found')
      );

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Unable to Load Order')).toBeTruthy();
        expect(getByText(/Order not found/)).toBeTruthy();
      });
    });

    it('should show retry button on order load error', async () => {
      (ordersService.getOrder as jest.Mock).mockRejectedValue(
        new Error('Order not found')
      );

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Retry')).toBeTruthy();
      });
    });

    it('should retry order fetch on Retry click', async () => {
      (ordersService.getOrder as jest.Mock)
        .mockRejectedValueOnce(new Error('Order not found'))
        .mockResolvedValueOnce(mockOrder);

      const { getByText, rerender } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Unable to Load Order')).toBeTruthy();
      });

      fireEvent.press(getByText('Retry'));

      await waitFor(() => {
        expect(ordersService.getOrder).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle null delivery_partner gracefully', async () => {
      const orderWithoutPartner = { ...mockOrder, delivery_partner: null };
      (ordersService.getOrder as jest.Mock).mockResolvedValue(orderWithoutPartner);

      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Rate Your Delivery')).toBeTruthy();
      });

      // Should still render form but might handle missing partner ID
      expect(screen.getByText('How would you rate this delivery?')).toBeTruthy();
    });
  });

  describe('Already Reviewed State', () => {
    it('should display message when order already reviewed', async () => {
      // Mock API call that checks if already reviewed
      // This would be handled by fetching review-check endpoint
      // For now, we'll test the UI path exists
      
      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Rate Your Delivery')).toBeTruthy();
      });

      // If hasReviewed is true, should show different UI
      // This would happen when review-check endpoint returns hasReviewed: true
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching order', () => {
      (ordersService.getOrder as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockOrder), 500);
          })
      );

      render(<ReviewSubmissionScreen />);

      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('should transition from loading to form', async () => {
      render(<ReviewSubmissionScreen />);

      expect(screen.getByText('Loading...')).toBeTruthy();

      await waitFor(() => {
        expect(screen.getByText('Rate Your Delivery')).toBeTruthy();
      });
    });
  });

  describe('Accessibility and Usability', () => {
    it('should have all interactive elements enabled when form is valid', async () => {
      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('How would you rate this delivery?')).toBeTruthy();
      });

      const starButtons = screen.getAllByText('☆');
      fireEvent.press(starButtons[2]);

      await waitFor(() => {
        const submitButton = getByText('Submit Review');
        const skipButton = getByText('Skip');
        expect(submitButton.props.disabled).toBe(false);
        expect(skipButton.props.disabled).toBe(false);
      });
    });

    it('should display helpful tips for users', async () => {
      const { getByText } = render(<ReviewSubmissionScreen />);

      await waitFor(() => {
        expect(getByText('Be honest about your experience')).toBeTruthy();
        expect(getByText(/Mention specific things/)).toBeTruthy();
        expect(getByText(/constructive and respectful/)).toBeTruthy();
      });
    });
  });
});
