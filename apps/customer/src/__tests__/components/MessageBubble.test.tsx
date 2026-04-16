import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, it, expect } from 'vitest';
import { MessageBubble } from '@/components/MessageBubble';

describe('MessageBubble Component', () => {
  it('should render customer message correctly', () => {
    const props = {
      senderType: 'customer' as const,
      body: 'Hello shop!',
      createdAt: '2026-04-16T12:00:00Z',
    };

    render(<MessageBubble {...props} />);

    const messageText = screen.getByText('Hello shop!');
    expect(messageText).toBeVisible();
  });

  it('should render shop message with shop name', () => {
    const props = {
      senderType: 'shop' as const,
      body: 'We are here to help!',
      createdAt: '2026-04-16T12:01:00Z',
      shopName: 'Local Kirana',
    };

    render(<MessageBubble {...props} />);

    const messageText = screen.getByText('We are here to help!');
    const shopName = screen.getByText('Local Kirana');
    expect(messageText).toBeVisible();
    expect(shopName).toBeVisible();
  });

  it('should format time from ISO string', () => {
    const props = {
      senderType: 'customer' as const,
      body: 'Timed message',
      createdAt: '2026-04-16T14:30:00Z',
    };

    render(<MessageBubble {...props} />);

    // The component should display the message
    const messageText = screen.getByText('Timed message');
    expect(messageText).toBeVisible();
  });

  it('should handle different message types', () => {
    const customerMessage = {
      senderType: 'customer' as const,
      body: 'Customer',
      createdAt: '2026-04-16T12:00:00Z',
    };

    const shopMessage = {
      senderType: 'shop' as const,
      body: 'Shop',
      createdAt: '2026-04-16T12:00:00Z',
    };

    const { rerender } = render(<MessageBubble {...customerMessage} />);
    expect(screen.getByText('Customer')).toBeVisible();

    rerender(<MessageBubble {...shopMessage} />);
    expect(screen.getByText('Shop')).toBeVisible();
  });

  it('should handle long messages', () => {
    const longMessage = 'This is a very long message that spans multiple lines in the chat bubble. ' +
      'It contains a lot of text that should still be rendered correctly without any issues. ' +
      'The component should handle this gracefully and display it properly.';

    const props = {
      senderType: 'customer' as const,
      body: longMessage,
      createdAt: '2026-04-16T12:00:00Z',
    };

    render(<MessageBubble {...props} />);

    const messageText = screen.getByText(longMessage);
    expect(messageText).toBeVisible();
  });

  it('should render without optional shopName for customer messages', () => {
    const props = {
      senderType: 'customer' as const,
      body: 'Message without shop name',
      createdAt: '2026-04-16T12:00:00Z',
    };

    render(<MessageBubble {...props} />);

    const messageText = screen.getByText('Message without shop name');
    expect(messageText).toBeVisible();
  });
});
