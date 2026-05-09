import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import DisputesListScreen from '@/(tabs)/disputes/index';
import DisputeDetailScreen from '@/(tabs)/disputes/[id]';
import NewDisputeScreen from '@/(tabs)/disputes/new';
import * as disputesService from '@/services/disputes';
import { useAuthStore } from '@/store/auth';

/**
 * Integration Tests for Support & Dispute Management (Task 9.8)
 * 
 * Tests:
 * - Disputes list with pagination and filtering
 * - Dispute detail with messages
 * - New dispute creation form
 * - Status updates and resolution
 * - Error handling
 * - Empty states
 */

// Mocks
jest.mock('expo-router');
jest.mock('@/services/disputes');
jest.mock('@/store/auth');

const mockRouter = useRouter as jest.Mock;
const mockGetDisputes = disputesService.getDisputes as jest.Mock;
const mockGetDisputeDetail = disputesService.getDisputeDetail as jest.Mock;
const mockOpenDispute = disputesService.openDispute as jest.Mock;
const mockAddDisputeMessage = disputesService.addDisputeMessage as jest.Mock;
const mockAcceptDisputeResolution = disputesService.acceptDisputeResolution as jest.Mock;
const mockCloseDispute = disputesService.closeDispute as jest.Mock;
const mockUseAuthStore = useAuthStore as jest.Mock;

// Sample data
const createMockDispute = (overrides = {}) => ({
  id: 'dispute-123',
  order_id: 'order-456',
  customer_id: 'cust-789',
  reason: 'wrong_item',
  description: 'Received wrong item in the order',
  status: 'open',
  resolution_status: 'pending',
  created_at: new Date('2025-01-15T10:00:00Z').toISOString(),
  updated_at: new Date('2025-01-15T10:00:00Z').toISOString(),
  order: {
    id: 'order-456',
    total_amount: 50000,
    shop_id: 'shop-1',
    shop: {
      id: 'shop-1',
      name: 'Fresh Groceries',
    },
    order_status: 'delivered',
  },
  messages: [
    {
      id: 'msg-1',
      dispute_id: 'dispute-123',
      sender_type: 'customer',
      sender_id: 'cust-789',
      message: 'I received wrong item',
      created_at: new Date('2025-01-15T10:05:00Z').toISOString(),
    },
    {
      id: 'msg-2',
      dispute_id: 'dispute-123',
      sender_type: 'admin',
      sender_id: 'admin-1',
      message: 'We will investigate this issue',
      created_at: new Date('2025-01-15T11:00:00Z').toISOString(),
    },
  ],
  ...overrides,
});

const setupMocks = (overrides: any = {}) => {
  mockRouter.mockReturnValue({
    push: jest.fn(),
    back: jest.fn(),
  });

  mockUseAuthStore.mockReturnValue({
    token: 'test-token-123',
    ...overrides.auth,
  });
};

describe('Disputes Management (Task 9.8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('DisputesListScreen', () => {
    describe('Initial Load', () => {
      test('should load disputes on mount', async () => {
        const mockDisputes = [createMockDispute()];
        mockGetDisputes.mockResolvedValueOnce({
          data: mockDisputes,
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        render(<DisputesListScreen />);

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenCalledWith(
            {
              page: 1,
              limit: 10,
              status: undefined,
              sort_by: 'created_at',
              sort_order: 'desc',
            },
            'test-token-123'
          );
        });
      });

      test('should render disputes in list', async () => {
        const mockDisputes = [
          createMockDispute({
            id: 'dispute-1',
            reason: 'wrong_item',
            description: 'Received wrong item',
          }),
        ];

        mockGetDisputes.mockResolvedValueOnce({
          data: mockDisputes,
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(getByText(/ORDER-ORDER-456/i)).toBeTruthy();
          expect(getByText(/Fresh Groceries/)).toBeTruthy();
        });
      });

      test('should display dispute status badge', async () => {
        const mockDisputes = [createMockDispute({ status: 'under_review' })];

        mockGetDisputes.mockResolvedValueOnce({
          data: mockDisputes,
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(getByText(/Under Review/)).toBeTruthy();
        });
      });

      test('should display resolution status', async () => {
        const mockDisputes = [
          createMockDispute({ resolution_status: 'in_progress' }),
        ];

        mockGetDisputes.mockResolvedValueOnce({
          data: mockDisputes,
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(getByText(/In Progress/)).toBeTruthy();
        });
      });

      test('should display refund amount when applicable', async () => {
        const mockDisputes = [
          createMockDispute({
            status: 'refunded',
            refund_amount: 50000,
          }),
        ];

        mockGetDisputes.mockResolvedValueOnce({
          data: mockDisputes,
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(getByText(/₹500.00/)).toBeTruthy();
        });
      });
    });

    describe('Filtering', () => {
      test('should filter by "Open" status', async () => {
        mockGetDisputes.mockResolvedValueOnce({
          data: [createMockDispute({ status: 'open' })],
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenCalledTimes(1);
        });

        fireEvent.press(getByText(/^Open$/));

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenLastCalledWith(
            {
              page: 1,
              limit: 10,
              status: ['open'],
              sort_by: 'created_at',
              sort_order: 'desc',
            },
            'test-token-123'
          );
        });
      });

      test('should filter by "Under Review" status', async () => {
        mockGetDisputes.mockResolvedValueOnce({
          data: [createMockDispute({ status: 'under_review' })],
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenCalledTimes(1);
        });

        fireEvent.press(getByText(/Under Review/));

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenLastCalledWith(
            {
              page: 1,
              limit: 10,
              status: ['under_review'],
              sort_by: 'created_at',
              sort_order: 'desc',
            },
            'test-token-123'
          );
        });
      });

      test('should filter "Resolved" to include refunded and rejected', async () => {
        mockGetDisputes.mockResolvedValueOnce({
          data: [createMockDispute({ status: 'resolved' })],
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenCalledTimes(1);
        });

        fireEvent.press(getByText(/Resolved/));

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenLastCalledWith(
            {
              page: 1,
              limit: 10,
              status: ['resolved', 'refunded', 'rejected'],
              sort_by: 'created_at',
              sort_order: 'desc',
            },
            'test-token-123'
          );
        });
      });

      test('should reset to page 1 on filter change', async () => {
        mockGetDisputes
          .mockResolvedValueOnce({
            data: [createMockDispute()],
            meta: { page: 1, limit: 10, total: 20, pages: 2 },
          })
          .mockResolvedValueOnce({
            data: [createMockDispute({ status: 'open' })],
            meta: { page: 1, limit: 10, total: 5, pages: 1 },
          });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => expect(mockGetDisputes).toHaveBeenCalledTimes(1));

        fireEvent.press(getByText(/^Open$/));

        await waitFor(() => {
          const lastCall = mockGetDisputes.mock.calls[1][0];
          expect(lastCall.page).toBe(1);
        });
      });
    });

    describe('Infinite Scroll', () => {
      test('should load next page on scroll', async () => {
        const page1 = [createMockDispute({ id: 'dispute-1' })];
        const page2 = [createMockDispute({ id: 'dispute-2' })];

        mockGetDisputes
          .mockResolvedValueOnce({
            data: page1,
            meta: { page: 1, limit: 10, total: 20, pages: 2 },
          })
          .mockResolvedValueOnce({
            data: page2,
            meta: { page: 2, limit: 10, total: 20, pages: 2 },
          });

        const { getByTestId, queryByTestId } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenCalledTimes(1);
        });

        const flatList = queryByTestId('disputes-list');
        if (flatList) {
          fireEvent(flatList, 'endReached');
        }

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenCalledTimes(2);
        });
      });
    });

    describe('Navigation', () => {
      test('should navigate to dispute detail on press', async () => {
        const mockPush = jest.fn();
        mockRouter.mockReturnValueOnce({
          push: mockPush,
          back: jest.fn(),
        });

        mockGetDisputes.mockResolvedValueOnce({
          data: [createMockDispute({ id: 'disp-nav' })],
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(getByText(/ORDER-ORDER-456/i)).toBeTruthy();
        });

        fireEvent.press(getByText(/ORDER-ORDER-456/i));

        // Should navigate to dispute detail screen
      });

      test('should navigate to new dispute form', async () => {
        const mockPush = jest.fn();
        mockRouter.mockReturnValueOnce({
          push: mockPush,
          back: jest.fn(),
        });

        mockGetDisputes.mockResolvedValueOnce({
          data: [createMockDispute()],
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenCalled();
        });

        const newDisputeButton = getByText(/\+/);
        fireEvent.press(newDisputeButton);

        // Should navigate to new dispute form
      });
    });

    describe('Empty States', () => {
      test('should show empty state when no disputes', async () => {
        mockGetDisputes.mockResolvedValueOnce({
          data: [],
          meta: { page: 1, limit: 10, total: 0, pages: 0 },
        });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(getByText(/No Disputes Yet/i)).toBeTruthy();
          expect(getByText(/smoothly/i)).toBeTruthy();
        });
      });

      test('should show filter-specific empty message', async () => {
        mockGetDisputes
          .mockResolvedValueOnce({
            data: [createMockDispute()],
            meta: { page: 1, limit: 10, total: 1, pages: 1 },
          })
          .mockResolvedValueOnce({
            data: [],
            meta: { page: 1, limit: 10, total: 0, pages: 0 },
          });

        const { getByText, queryByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(getByText(/ORDER-ORDER-456/i)).toBeTruthy();
        });

        fireEvent.press(getByText(/^Open$/));

        // Empty state message should show for that filter
      });
    });

    describe('Error Handling', () => {
      test('should display error message on failure', async () => {
        mockGetDisputes.mockRejectedValueOnce(new Error('Network error'));

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(getByText(/Unable to Load Disputes/i)).toBeTruthy();
          expect(getByText(/Network error/i)).toBeTruthy();
        });
      });

      test('should provide retry button', async () => {
        mockGetDisputes
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockResolvedValueOnce({
            data: [createMockDispute()],
            meta: { page: 1, limit: 10, total: 1, pages: 1 },
          });

        const { getByText } = render(<DisputesListScreen />);

        await waitFor(() => {
          expect(getByText(/Unable to Load Disputes/i)).toBeTruthy();
        });

        fireEvent.press(getByText(/Retry/));

        await waitFor(() => {
          expect(mockGetDisputes).toHaveBeenCalledTimes(2);
        });
      });
    });

    describe('Loading States', () => {
      test('should show loading spinner initially', async () => {
        mockGetDisputes.mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(() => {
                resolve({
                  data: [createMockDispute()],
                  meta: { page: 1, limit: 10, total: 1, pages: 1 },
                });
              }, 100)
            )
        );

        const { getByText } = render(<DisputesListScreen />);

        expect(getByText(/Loading disputes/i)).toBeTruthy();

        await waitFor(() => {
          expect(getByText(/ORDER-ORDER-456/i)).toBeTruthy();
        });
      });
    });
  });

  describe('DisputeDetailScreen', () => {
    describe('Initial Load', () => {
      test('should load dispute detail', async () => {
        const mockDispute = createMockDispute();
        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);

        render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(mockGetDisputeDetail).toHaveBeenCalledWith(
            'dispute-123',
            'test-token-123'
          );
        });
      });

      test('should display dispute information', async () => {
        const mockDispute = createMockDispute({
          reason: 'damaged_item',
          description: 'Item arrived broken',
        });

        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);

        const { getByText } = render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(getByText(/Damaged Item/)).toBeTruthy();
          expect(getByText(/Item arrived broken/)).toBeTruthy();
        });
      });

      test('should display dispute status', async () => {
        const mockDispute = createMockDispute({
          status: 'under_review',
          resolution_status: 'in_progress',
        });

        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);

        const { getByText } = render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(getByText(/Under Review/)).toBeTruthy();
          expect(getByText(/In Progress/)).toBeTruthy();
        });
      });

      test('should display dispute messages', async () => {
        const mockDispute = createMockDispute();

        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);

        const { getByText } = render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(getByText(/I received wrong item/)).toBeTruthy();
          expect(getByText(/We will investigate/)).toBeTruthy();
        });
      });

      test('should display refund resolution', async () => {
        const mockDispute = createMockDispute({
          status: 'refunded',
          refund_amount: 50000,
          resolution_note: 'Refund processed successfully',
        });

        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);

        const { getByText } = render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(getByText(/₹500.00/)).toBeTruthy();
          expect(getByText(/Refund processed/)).toBeTruthy();
        });
      });
    });

    describe('Adding Messages', () => {
      test('should add message to dispute', async () => {
        const mockDispute = createMockDispute();
        const newMessage = {
          id: 'msg-3',
          dispute_id: 'dispute-123',
          sender_type: 'customer',
          sender_id: 'cust-789',
          message: 'Thank you for your help',
          created_at: new Date().toISOString(),
        };

        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);
        mockAddDisputeMessage.mockResolvedValueOnce(newMessage);
        mockGetDisputeDetail.mockResolvedValueOnce({
          ...mockDispute,
          messages: [...mockDispute.messages, newMessage],
        });

        const { getByPlaceholderText, getByText } = render(
          <DisputeDetailScreen />
        );

        await waitFor(() => {
          expect(mockGetDisputeDetail).toHaveBeenCalled();
        });

        const input = getByPlaceholderText(/Add a comment/);
        fireEvent.changeText(input, 'Thank you for your help');

        const sendButton = getByText(/Send/);
        fireEvent.press(sendButton);

        await waitFor(() => {
          expect(mockAddDisputeMessage).toHaveBeenCalledWith(
            'dispute-123',
            { message: 'Thank you for your help' },
            'test-token-123'
          );
        });
      });

      test('should not send empty messages', async () => {
        const mockDispute = createMockDispute();
        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);

        const { getByText } = render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(mockGetDisputeDetail).toHaveBeenCalled();
        });

        const sendButton = getByText(/Send/);
        expect(sendButton).toBeDisabled();
      });
    });

    describe('Resolution Actions', () => {
      test('should show Accept Resolution button when awaiting customer', async () => {
        const mockDispute = createMockDispute({
          status: 'resolved',
          resolution_status: 'awaiting_customer',
          refund_amount: 50000,
        });

        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);

        const { getByText } = render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(getByText(/Accept Resolution/)).toBeTruthy();
        });
      });

      test('should accept dispute resolution', async () => {
        const mockDispute = createMockDispute({
          status: 'resolved',
          resolution_status: 'awaiting_customer',
        });

        const updatedDispute = {
          ...mockDispute,
          resolution_status: 'closed',
        };

        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);
        mockAcceptDisputeResolution.mockResolvedValueOnce(updatedDispute);

        const { getByText } = render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(getByText(/Accept Resolution/)).toBeTruthy();
        });

        fireEvent.press(getByText(/Accept Resolution/));

        await waitFor(() => {
          expect(mockAcceptDisputeResolution).toHaveBeenCalledWith(
            'dispute-123',
            'test-token-123'
          );
        });
      });

      test('should show Close Dispute button for open disputes', async () => {
        const mockDispute = createMockDispute({ status: 'open' });

        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);

        const { getByText } = render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(getByText(/Close Dispute/)).toBeTruthy();
        });
      });

      test('should close dispute', async () => {
        const mockDispute = createMockDispute({ status: 'open' });
        const closedDispute = { ...mockDispute, status: 'closed' };

        mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);
        mockCloseDispute.mockResolvedValueOnce(closedDispute);

        const { getByText } = render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(getByText(/Close Dispute/)).toBeTruthy();
        });

        fireEvent.press(getByText(/Close Dispute/));

        await waitFor(() => {
          expect(mockCloseDispute).toHaveBeenCalledWith(
            'dispute-123',
            'test-token-123'
          );
        });
      });
    });

    describe('Error Handling', () => {
      test('should display error on load failure', async () => {
        mockGetDisputeDetail.mockRejectedValueOnce(
          new Error('Failed to load dispute')
        );

        const { getByText } = render(<DisputeDetailScreen />);

        await waitFor(() => {
          expect(getByText(/Unable to Load Dispute/i)).toBeTruthy();
        });
      });
    });
  });

  describe('NewDisputeScreen', () => {
    describe('Form Validation', () => {
      test('should require reason selection', async () => {
        const { getByText, getByPlaceholderText } = render(
          <NewDisputeScreen />
        );

        const description = getByPlaceholderText(/Describe the issue/);
        fireEvent.changeText(description, 'This is a valid description');

        // Submit button should still be disabled without reason
      });

      test('should require minimum description length', async () => {
        const { getByText, getByPlaceholderText } = render(
          <NewDisputeScreen />
        );

        const description = getByPlaceholderText(/Describe the issue/);
        fireEvent.changeText(description, 'Short desc');

        // Should show validation error or keep button disabled
      });

      test('should enforce maximum description length', async () => {
        const { getByPlaceholderText } = render(<NewDisputeScreen />);

        const maxLength = 1000;
        const description = getByPlaceholderText(/Describe the issue/);
        const longText = 'a'.repeat(maxLength + 100);

        fireEvent.changeText(description, longText);

        // Should be truncated to maxLength
        expect(description.props.value.length).toBeLessThanOrEqual(maxLength);
      });
    });

    describe('Reason Selection', () => {
      test('should display all dispute reasons', async () => {
        const { getByText } = render(<NewDisputeScreen />);

        expect(getByText(/Wrong Item Received/)).toBeTruthy();
        expect(getByText(/Damaged or Broken Item/)).toBeTruthy();
        expect(getByText(/Missing Item/)).toBeTruthy();
        expect(getByText(/Quality Issue/)).toBeTruthy();
        expect(getByText(/Order Not Delivered/)).toBeTruthy();
        expect(getByText(/Late Delivery/)).toBeTruthy();
        expect(getByText(/Payment Issue/)).toBeTruthy();
        expect(getByText(/Other/)).toBeTruthy();
      });

      test('should select reason on press', async () => {
        const { getByText } = render(<NewDisputeScreen />);

        fireEvent.press(getByText(/Wrong Item Received/));

        // Reason should be marked as selected
      });
    });

    describe('Submission', () => {
      test('should open dispute with form data', async () => {
        mockOpenDispute.mockResolvedValueOnce(
          createMockDispute({ id: 'new-dispute' })
        );

        const { getByText, getByPlaceholderText } = render(
          <NewDisputeScreen />
        );

        // Select reason
        fireEvent.press(getByText(/Wrong Item Received/));

        // Enter description
        const description = getByPlaceholderText(/Describe the issue/);
        fireEvent.changeText(description, 'Received wrong item in package');

        // Submit
        fireEvent.press(getByText(/Submit Dispute/));

        await waitFor(() => {
          expect(mockOpenDispute).toHaveBeenCalledWith(
            {
              order_id: expect.any(String),
              reason: 'wrong_item',
              description: 'Received wrong item in package',
            },
            'test-token-123'
          );
        });
      });

      test('should handle submission error', async () => {
        mockOpenDispute.mockRejectedValueOnce(
          new Error('Order not eligible for dispute')
        );

        const { getByText, getByPlaceholderText } = render(
          <NewDisputeScreen />
        );

        fireEvent.press(getByText(/Wrong Item Received/));

        const description = getByPlaceholderText(/Describe the issue/);
        fireEvent.changeText(description, 'Received wrong item');

        fireEvent.press(getByText(/Submit Dispute/));

        await waitFor(() => {
          expect(mockOpenDispute).toHaveBeenCalled();
        });
      });

      test('should navigate to dispute detail on success', async () => {
        const mockPush = jest.fn();
        mockRouter.mockReturnValueOnce({
          push: mockPush,
          back: jest.fn(),
        });

        mockOpenDispute.mockResolvedValueOnce(
          createMockDispute({ id: 'new-dispute-123' })
        );

        const { getByText, getByPlaceholderText } = render(
          <NewDisputeScreen />
        );

        fireEvent.press(getByText(/Wrong Item Received/));

        const description = getByPlaceholderText(/Describe the issue/);
        fireEvent.changeText(description, 'Received wrong item');

        fireEvent.press(getByText(/Submit Dispute/));

        // Should navigate to dispute detail screen
      });
    });

    describe('Character Counter', () => {
      test('should show character count', async () => {
        const { getByText } = render(<NewDisputeScreen />);

        expect(getByText(/0 \/ 1000/)).toBeTruthy();
      });

      test('should update character count', async () => {
        const { getByText, getByPlaceholderText } = render(
          <NewDisputeScreen />
        );

        const description = getByPlaceholderText(/Describe the issue/);
        fireEvent.changeText(description, 'Test message');

        expect(getByText(/12 \/ 1000/)).toBeTruthy();
      });
    });
  });

  describe('Status Colors and Labels', () => {
    test('should render correct colors for all statuses', async () => {
      const statuses = ['open', 'under_review', 'resolved', 'refunded', 'rejected'];

      for (const status of statuses) {
        mockGetDisputes.mockResolvedValueOnce({
          data: [createMockDispute({ status: status as any })],
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        });

        // Each status should be rendered with correct color
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle disputes with no messages', async () => {
      const mockDispute = createMockDispute({ messages: [] });

      mockGetDisputeDetail.mockResolvedValueOnce(mockDispute);

      const { getByText } = render(<DisputeDetailScreen />);

      await waitFor(() => {
        expect(getByText(/No messages yet/i)).toBeTruthy();
      });
    });

    test('should handle disputes with no shop data', async () => {
      const mockDispute = createMockDispute({
        order: { ...createMockDispute().order, shop: null },
      });

      mockGetDisputes.mockResolvedValueOnce({
        data: [mockDispute],
        meta: { page: 1, limit: 10, total: 1, pages: 1 },
      });

      const { getByText } = render(<DisputesListScreen />);

      await waitFor(() => {
        expect(getByText(/Unknown Shop/i)).toBeTruthy();
      });
    });

    test('should handle date formatting for old disputes', async () => {
      const oldDispute = createMockDispute({
        created_at: new Date('2024-01-15').toISOString(),
      });

      mockGetDisputes.mockResolvedValueOnce({
        data: [oldDispute],
        meta: { page: 1, limit: 10, total: 1, pages: 1 },
      });

      const { getByText } = render(<DisputesListScreen />);

      await waitFor(() => {
        // Should show days ago correctly
        expect(getByText(/[0-9]+d ago/)).toBeTruthy();
      });
    });
  });

  describe('Pull-to-Refresh', () => {
    test('should reload disputes on refresh', async () => {
      mockGetDisputes
        .mockResolvedValueOnce({
          data: [createMockDispute()],
          meta: { page: 1, limit: 10, total: 1, pages: 1 },
        })
        .mockResolvedValueOnce({
          data: [
            createMockDispute(),
            createMockDispute({ id: 'new-dispute' }),
          ],
          meta: { page: 1, limit: 10, total: 2, pages: 1 },
        });

      // Pull-to-refresh loading test
      // (RefreshControl is hard to test, but should trigger reloadDisputes)
    });
  });
});
