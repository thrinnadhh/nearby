import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ReviewStarRating } from '@/components/ReviewStarRating';

describe('ReviewStarRating Component', () => {
  it('renders 5 stars', () => {
    const { getAllByTestId } = render(
      <ReviewStarRating rating={0} onRatingChange={() => {}} />
    );
    expect(getAllByTestId(/star/)).toHaveLength(5);
  });

  it('displays filled stars based on rating', () => {
    const { getByTestId } = render(
      <ReviewStarRating rating={3} onRatingChange={() => {}} />
    );
    expect(getByTestId('star-3-filled')).toBeDefined();
  });

  it('calls onRatingChange when a star is pressed', () => {
    const onRatingChange = jest.fn();
    const { getByTestId } = render(
      <ReviewStarRating rating={0} onRatingChange={onRatingChange} />
    );
    
    // Simulate pressing star 4
    const star4 = getByTestId('star-4');
    star4.props.onPress();
    
    expect(onRatingChange).toHaveBeenCalledWith(4);
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
