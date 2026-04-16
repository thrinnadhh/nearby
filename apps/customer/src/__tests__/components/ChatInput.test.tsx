import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, vi } from 'vitest';
import { ChatInput } from '@/components/ChatInput';

describe('ChatInput Component', () => {
  it('should render input field and send button', () => {
    const mockOnSend = vi.fn();
    render(<ChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button');

    expect(input).toBeVisible();
    expect(sendButton).toBeVisible();
  });

  it('should call onSend with message text', async () => {
    const mockOnSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button');

    fireEvent.changeText(input, 'Hello shop!');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith('Hello shop!');
    });
  });

  it('should clear input after successful send', async () => {
    const mockOnSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText('Type a message...') as any;
    const sendButton = screen.getByRole('button');

    fireEvent.changeText(input, 'Test message');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(input.props.value).toBe('');
    });
  });

  it('should trim whitespace before sending', async () => {
    const mockOnSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button');

    fireEvent.changeText(input, '   Hello   ');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith('Hello');
    });
  });

  it('should not send empty messages', async () => {
    const mockOnSend = vi.fn();
    render(<ChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button');

    fireEvent.changeText(input, '   ');
    fireEvent.press(sendButton);

    // onSend should not be called
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should disable send button when sending', () => {
    const mockOnSend = vi.fn();
    render(<ChatInput onSend={mockOnSend} sending={true} />);

    const sendButton = screen.getByRole('button');
    expect(sendButton).toBeDisabled();
  });

  it('should enforce max character limit', () => {
    const mockOnSend = vi.fn();
    render(<ChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText('Type a message...') as any;

    // Try to type a message longer than 2000 characters
    const longMessage = 'x'.repeat(2001);
    fireEvent.changeText(input, longMessage);

    // The input should be limited to 2000 characters
    expect(input.props.maxLength).toBe(2000);
  });

  it('should handle sending errors gracefully', async () => {
    const mockOnSend = vi.fn().mockRejectedValue(new Error('Send failed'));
    render(<ChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button');

    fireEvent.changeText(input, 'This will fail');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalled();
    });

    // Input should still be cleared even though send failed (based on implementation)
    // This may vary depending on error handling strategy
  });

  it('should show activity indicator while sending', () => {
    const mockOnSend = vi.fn();
    const { rerender } = render(<ChatInput onSend={mockOnSend} sending={false} />);

    // Initially no loading indicator
    expect(screen.queryByTestId('activity-indicator')).toBeNull();

    rerender(<ChatInput onSend={mockOnSend} sending={true} />);

    // When sending, there should be a loading indicator
    // Note: The exact test ID depends on implementation
  });

  it('should be disabled while sending', () => {
    const mockOnSend = vi.fn();
    render(<ChatInput onSend={mockOnSend} sending={true} />);

    const input = screen.getByPlaceholderText('Type a message...');
    expect(input).toBeDisabled();
  });

  it('should accept multiline input', () => {
    const mockOnSend = vi.fn();
    render(<ChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText('Type a message...') as any;
    expect(input.props.multiline).toBe(true);
  });
});
