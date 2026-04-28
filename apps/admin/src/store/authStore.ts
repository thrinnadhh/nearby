import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthState } from '@/types/admin';
import { adminApi } from '@/services/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (phone: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await adminApi.verifyOtp(phone, otp);
          const userData = response.data as unknown as {
            jwt: string;
            user: User;
          };

          if (!userData.user || userData.user.role !== 'admin') {
            throw new Error('Only admin users can access this dashboard');
          }

          set({
            user: userData.user,
            token: userData.jwt,
            isLoading: false,
          });

          localStorage.setItem('admin_token', userData.jwt);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Login failed. Please try again.';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('admin_token');
      },

      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string) => {
        set({ token });
        localStorage.setItem('admin_token', token);
      },
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
);
