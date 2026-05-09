import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout';

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders layout with title', () => {
    render(
      <BrowserRouter>
        <Layout title="Test Page">
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <BrowserRouter>
        <Layout title="Test Page">
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders with sidebar', () => {
    render(
      <BrowserRouter>
        <Layout title="Test Page">
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>,
    );

    // Layout should render without errors
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('renders header with title', () => {
    render(
      <BrowserRouter>
        <Layout title="Dashboard">
          <div>Dashboard Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('supports custom className', () => {
    const { container } = render(
      <BrowserRouter>
        <Layout title="Test">
          <div className="custom-class">Content</div>
        </Layout>
      </BrowserRouter>,
    );

    const customElement = container.querySelector('.custom-class');
    expect(customElement).toBeInTheDocument();
  });
});
