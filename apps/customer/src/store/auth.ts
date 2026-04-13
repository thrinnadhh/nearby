import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  // userId is a UUID v4 string when authenticated; null otherwise
  userId: string | null;
  phone: string | null;
  token: string | null;
}

// Full auth actions (setToken, logout, etc.) will be added in Sprint 7.3.
// This minimal store exists solely to power the route guard in app/index.tsx.
export const useAuthStore = create<AuthState>()(() => ({
  isAuthenticated: false,
  userId: null,
  phone: null,
  token: null,
}));
