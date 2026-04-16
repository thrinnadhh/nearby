import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RefundTimeline } from '@/components/RefundTimeline';

describe('RefundTimeline Component', () => {
  const mockEvents = [
    { status: 'initiated', timestamp: '2026-04-15T10:00:00Z', label: 'Refund initiated' },
    { status: 'processing', timestamp: '2026-04-15T14:30:00Z', label: 'Processing refund' },
    { status: 'credited', timestamp: '2026-04-16T09:00:00Z', label: 'Credited to account' },
  ];

  it('renders timeline with all events', () => {
    const { getByText } = render(
      <RefundTimeline events={mockEvents} />
    );
    
    expect(getByText('Refund initiated')).toBeDefined();
    expect(getByText('Processing refund')).toBeDefined();
    expect(getByText('Credited to account')).toBeDefined();
  });

  it('displays timestamps for each event', () => {
    const { getByText } = render(
      <RefundTimeline events={mockEvents} />
    );
    
    expect(getByText(/Apr 15.*10:00|10:00.*Apr 15/)).toBeDefined();
  });

  it('renders empty timeline when no events', () => {
    const { getByText } = render(
      <RefundTimeline events={[]} />
    );
    
    expect(getByText(/no events|no history/i)).toBeDefined();
  });

  it('visually indicates current status', () => {
    const { getByTestId } = render(
      <RefundTimeline events={mockEvents} currentStatus="credited" />
    );
    
    expect(getByTestId('event-status-credited')).toBeDefined();
  });

  it('handles single event timeline', () => {
    const singleEvent = [mockEvents[0]];
    const { getByText } = render(
      <RefundTimeline events={singleEvent} />
    );
    
    expect(getByText('Refund initiated')).toBeDefined();
  });

  it('supports custom event labels', () => {
    const customEvents = [
      { status: 'pending' as const, timestamp: '2026-04-15T10:00:00Z', label: 'Custom label' },
    ];
    const { getByText } = render(
      <RefundTimeline events={customEvents} />
    );
    
    expect(getByText('Custom label')).toBeDefined();
  });
});
