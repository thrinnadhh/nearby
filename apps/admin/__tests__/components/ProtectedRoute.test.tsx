import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import ProtectedRoute from '@/components/ProtectedRoute';

// Mock the auth store — ProtectedRoute reads token + user from Zustand, not localStorage
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

import { useAuthStore } from '@/store/authStore';

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const TestPage = () => <div>Protected Content</div>;
const LoginPage = () => <div>Login Page</div>;

const renderWithRoutes = (token: string | null, role: string | null) => {
  (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: { token: string | null; user: { role: string } | null }) => unknown) =>
      selector({ token, user: role ? { role } : null }),
  );

  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<TestPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when token exists and role is admin', () => {
    renderWithRoutes('test-token-123', 'admin');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to login when no token', () => {
    renderWithRoutes(null, null);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content with valid admin token', () => {
    renderWithRoutes('valid-token', 'admin');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects non-admin users to login', () => {
    renderWithRoutes('valid-token', 'customer');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
