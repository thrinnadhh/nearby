import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState Component', () => {
  const defaultProps = {
    icon: 'inbox',
    title: 'No items',
    subtitle: 'You have no items to display',
    ctaLabel: 'Get started',
    onCtaPress: jest.fn(),
  };

  it('renders with all required props', () => {
    const { getByText } = render(<EmptyState {...defaultProps} />);
    
    expect(getByText('No items')).toBeDefined();
    expect(getByText('You have no items to display')).toBeDefined();
    expect(getByText('Get started')).toBeDefined();
  });

  it('calls onCtaPress when CTA button is pressed', () => {
    const onCtaPress = jest.fn();
    const { getByText } = render(
      <EmptyState {...defaultProps} onCtaPress={onCtaPress} />
    );
    
    fireEvent.press(getByText('Get started'));
    expect(onCtaPress).toHaveBeenCalledTimes(1);
  });

  it('renders custom CTA label', () => {
    const { getByText } = render(
      <EmptyState {...defaultProps} ctaLabel="Browse now" />
    );
    
    expect(getByText('Browse now')).toBeDefined();
  });

  it('renders custom title and subtitle', () => {
    const { getByText } = render(
      <EmptyState
        {...defaultProps}
        title="Cart is empty"
        subtitle="Add items to your cart to checkout"
      />
    );
    
    expect(getByText('Cart is empty')).toBeDefined();
    expect(getByText('Add items to your cart to checkout')).toBeDefined();
  });

  it('renders different icons', () => {
    const icons = ['inbox', 'cart', 'search', 'alert-circle'];
    
    icons.forEach((icon) => {
      const { getByTestId, unmount } = render(
        <EmptyState {...defaultProps} icon={icon} />
      );
      expect(getByTestId(`icon-${icon}`)).toBeDefined();
      unmount();
    });
  });

  it('handles optional subtitle', () => {
    const { queryByText } = render(
      <EmptyState
        {...defaultProps}
        subtitle={undefined}
      />
    );
    
    expect(queryByText('You have no items to display')).toBeNull();
  });

  it('applies correct styling', () => {
    const { getByTestId } = render(
      <EmptyState {...defaultProps} />
    );
    
    const container = getByTestId('empty-state-container');
    expect(container.props.style).toBeDefined();
  });
});
