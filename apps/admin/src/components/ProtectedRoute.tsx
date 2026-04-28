import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token || !user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
