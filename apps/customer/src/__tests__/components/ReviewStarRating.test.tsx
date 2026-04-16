import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ReviewStarRating } from '@/components/ReviewStarRating';

describe('ReviewStarRating Component', () => {
  it('renders 5 stars', () => {
    const { getAllByTestId } = render(
      <ReviewStarRating value={0} onChange={() => {}} />
    );
    expect(getAllByTestId(/star/)).toHaveLength(5);
  });

  it('displays filled stars based on rating', () => {
    const { getByTestId } = render(
      <ReviewStarRating value={3} onChange={() => {}} />
    );
    expect(getByTestId('star-3-filled')).toBeDefined();
  });

  it('calls onChange when a star is pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ReviewStarRating value={0} onChange={onChange} />
    );
    
    // Simulate pressing star 4
    const star4 = getByTestId('star-4');
    star4.props.onPress();
    
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('supports all ratings from 1 to 5', () => {
    const onChange = jest.fn();
    const { rerender, getByTestId } = render(
      <ReviewStarRating value={0} onChange={onChange} />
    );

    for (let rating = 1; rating <= 5; rating++) {
      const star = getByTestId(`star-${rating}`);
      star.props.onPress();
      expect(onChange).toHaveBeenCalledWith(rating);
    }
  });

  it('has accessible rating indicator text', () => {
    const { getByText } = render(
      <ReviewStarRating value={4} onChange={() => {}} />
    );
    expect(getByText('Rating: 4 out of 5 stars')).toBeDefined();
  });
});
