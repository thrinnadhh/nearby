import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
export default function ProtectedRoute() {
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    if (!token || !user || user.role !== 'admin') {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(Outlet, {});
}
//# sourceMappingURL=ProtectedRoute.js.map