import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function useAdminAuth() {
  const navigate = useNavigate();
  const { user, token, isLoading, error } = useAuthStore();

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
    } else if (user.role !== 'admin') {
      navigate('/login');
    }
  }, [token, user, navigate]);

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated: !!token && user?.role === 'admin',
  };
}
