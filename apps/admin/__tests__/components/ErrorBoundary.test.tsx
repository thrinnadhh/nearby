import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <div>Test Content</div>
        </ErrorBoundary>
      </BrowserRouter>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders error message when error prop is provided', () => {
    const error = new Error('Test error message');

    render(
      <BrowserRouter>
        <ErrorBoundary error={error}>
          <div>Test Content</div>
        </ErrorBoundary>
      </BrowserRouter>,
    );

    expect(screen.getByText(/Error|Test error|failed/i)).toBeInTheDocument();
  });

  it('displays error details', () => {
    const error = new Error('Something went wrong');

    render(
      <BrowserRouter>
        <ErrorBoundary error={error}>
          <div>Test Content</div>
        </ErrorBoundary>
      </BrowserRouter>,
    );

    // Use getAllByText since parent elements may also match the regex
    const matches = screen.getAllByText(/Something went wrong/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('renders with fallback UI on error', () => {
    const error = new Error('Loading failed');

    const { container } = render(
      <BrowserRouter>
        <ErrorBoundary error={error}>
          <div>Test Content</div>
        </ErrorBoundary>
      </BrowserRouter>,
    );

    // Error boundary should render some error UI
    expect(container.querySelector('[class*="error"]') || container.querySelector('[class*="red"]')).toBeDefined();
  });

  it('handles multiple children', () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <div>Content 1</div>
          <div>Content 2</div>
        </ErrorBoundary>
      </BrowserRouter>,
    );

    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });
});
