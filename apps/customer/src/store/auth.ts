import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  phone: string | null;
  token: string | null;
  role: 'customer' | null;
  _hasHydrated: boolean;
}

interface AuthActions {
  login: (payload: { userId: string; phone: string; token: string }) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

const initialState: Omit<AuthState, '_hasHydrated'> = {
  isAuthenticated: false,
  userId: null,
  phone: null,
  token: null,
  role: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,
      _hasHydrated: false,
      login: ({ userId, phone, token }) =>
        set({ isAuthenticated: true, userId, phone, token, role: 'customer' }),
      logout: () => set({ ...initialState }),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'nearby-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist auth fields — never persist transient flags
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        phone: state.phone,
        token: state.token,
        role: state.role,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
