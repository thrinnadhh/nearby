import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

describe('LoadingSkeleton Component', () => {
  it('renders skeleton loaders', () => {
    const { container } = render(<LoadingSkeleton count={3} />);

    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders correct number of skeleton items', () => {
    const { container } = render(<LoadingSkeleton count={5} />);

    const skeletons = container.querySelectorAll('[class*="bg-gray"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });

  it('applies animation class', () => {
    const { container } = render(<LoadingSkeleton count={1} />);

    const animatedElement = container.querySelector('[class*="animate"]');
    expect(animatedElement).toBeInTheDocument();
  });

  it('renders with default count of 1', () => {
    const { container } = render(<LoadingSkeleton />);

    const skeletons = container.querySelectorAll('[class*="bg-gray"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders multiple skeleton rows', () => {
    const { container } = render(<LoadingSkeleton count={10} />);

    const rows = container.querySelectorAll('div[class*="h-"]');
    expect(rows.length).toBeGreaterThanOrEqual(10);
  });

  it('uses gray color for skeleton', () => {
    const { container } = render(<LoadingSkeleton count={1} />);

    const grayElement = container.querySelector('[class*="gray"]');
    expect(grayElement).toBeInTheDocument();
  });
});
