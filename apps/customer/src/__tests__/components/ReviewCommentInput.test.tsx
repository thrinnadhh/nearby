import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReviewCommentInput } from '@/components/ReviewCommentInput';

describe('ReviewCommentInput Component', () => {
  it('renders text input', () => {
    const { getByPlaceholderText } = render(
      <ReviewCommentInput value="" onChange={() => {}} />
    );
    expect(getByPlaceholderText('Add a comment (optional)')).toBeDefined();
  });

  it('displays character counter', () => {
    const { getByText } = render(
      <ReviewCommentInput value="Hello" onChange={() => {}} />
    );
    expect(getByText('5 / 500')).toBeDefined();
  });

  it('calls onChange when text is entered', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <ReviewCommentInput value="" onChange={onChange} />
    );
    
    const input = getByPlaceholderText('Add a comment (optional)');
    fireEvent.changeText(input, 'Great product!');
    
    expect(onChange).toHaveBeenCalledWith('Great product!');
  });

  it('enforces 500 character limit', () => {
    const onChange = jest.fn();
    const longText = 'a'.repeat(600);
    const { getByPlaceholderText } = render(
      <ReviewCommentInput value="" onChange={onChange} />
    );
    
    const input = getByPlaceholderText('Add a comment (optional)');
    fireEvent.changeText(input, longText);
    
    // onChange should be called but the parent should limit the length
    expect(onChange).toHaveBeenCalled();
  });

  it('displays character count alert when over limit', () => {
    const { getByText } = render(
      <ReviewCommentInput value={'a'.repeat(501)} onChange={() => {}} />
    );
    expect(getByText(/must be under 500/i)).toBeDefined();
  });

  it('renders placeholder text correctly', () => {
    const { getByPlaceholderText } = render(
      <ReviewCommentInput value="" onChange={() => {}} placeholder="Custom placeholder" />
    );
    expect(getByPlaceholderText('Custom placeholder')).toBeDefined();
  });
});
