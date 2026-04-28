import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adminApi } from '@/services/api';
export const useAuthStore = create()(persist((set) => ({
    user: null,
    token: null,
    isLoading: false,
    error: null,
    login: async (phone, otp) => {
        set({ isLoading: true, error: null });
        try {
            const response = await adminApi.verifyOtp(phone, otp);
            const userData = response.data;
            if (!userData.user || userData.user.role !== 'admin') {
                throw new Error('Only admin users can access this dashboard');
            }
            set({
                user: userData.user,
                token: userData.jwt,
                isLoading: false,
            });
            localStorage.setItem('admin_token', userData.jwt);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
            set({ error: message, isLoading: false });
            throw err;
        }
    },
    logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('admin_token');
    },
    setUser: (user) => {
        set({ user });
    },
    setToken: (token) => {
        set({ token });
        localStorage.setItem('admin_token', token);
    },
}), {
    name: 'admin-auth',
    partialize: (state) => ({
        user: state.user,
        token: state.token,
    }),
}));
//# sourceMappingURL=authStore.js.map