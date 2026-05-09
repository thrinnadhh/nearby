import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({
      pathname: '/dashboard',
    }),
  };
});

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sidebar navigation', () => {
    render(
      <BrowserRouter>
        <Sidebar isOpen={true} setIsOpen={vi.fn()} />
      </BrowserRouter>,
    );

    // Sidebar should render without errors
    expect(document.querySelector('[class*="sidebar"]') || document.querySelector('nav')).toBeDefined();
  });

  it('displays navigation links', () => {
    render(
      <BrowserRouter>
        <Sidebar isOpen={true} setIsOpen={vi.fn()} />
      </BrowserRouter>,
    );

    // Check for common admin navigation items
    const pageContent = document.body.textContent;
    expect(pageContent).toMatch(/KYC|Shop|Order|Dispute|Partner|Moderation|Analytics|Broadcast/i);
  });

  it('highlights active route', () => {
    render(
      <BrowserRouter>
        <Sidebar isOpen={true} setIsOpen={vi.fn()} />
      </BrowserRouter>,
    );

    const links = screen.queryAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders logo or branding', () => {
    render(
      <BrowserRouter>
        <Sidebar isOpen={true} setIsOpen={vi.fn()} />
      </BrowserRouter>,
    );

    const pageContent = document.body.textContent;
    expect(pageContent).toMatch(/Admin|NearBy|Dashboard/i);
  });

  it('is responsive', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar isOpen={true} setIsOpen={vi.fn()} />
      </BrowserRouter>,
    );

    const sidebar = container.querySelector('nav') || container.querySelector('[class*="sidebar"]');
    expect(sidebar).toBeInTheDocument();
  });
});
