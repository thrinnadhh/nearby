import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
// Pages
import LoginPage from '@/pages/LoginPage';
import KycQueuePage from '@/pages/KycQueuePage';
import ShopsPage from '@/pages/ShopsPage';
import OrdersPage from '@/pages/OrdersPage';
import DisputesPage from '@/pages/DisputesPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import PartnersPage from '@/pages/PartnersPage';
import ModerationPage from '@/pages/ModerationPage';
import BroadcastPage from '@/pages/BroadcastPage';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,
            retry: 1,
        },
    },
});
function App() {
    const token = useAuthStore((state) => state.token);
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: token ? _jsx(Navigate, { to: "/kyc-queue" }) : _jsx(LoginPage, {}) }), _jsxs(Route, { element: _jsx(ProtectedRoute, {}), children: [_jsx(Route, { path: "/kyc-queue", element: _jsx(KycQueuePage, {}) }), _jsx(Route, { path: "/shops", element: _jsx(ShopsPage, {}) }), _jsx(Route, { path: "/orders", element: _jsx(OrdersPage, {}) }), _jsx(Route, { path: "/disputes", element: _jsx(DisputesPage, {}) }), _jsx(Route, { path: "/analytics", element: _jsx(AnalyticsPage, {}) }), _jsx(Route, { path: "/partners", element: _jsx(PartnersPage, {}) }), _jsx(Route, { path: "/moderation", element: _jsx(ModerationPage, {}) }), _jsx(Route, { path: "/broadcast", element: _jsx(BroadcastPage, {}) })] }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/kyc-queue" }) })] }) }) }));
}
export default App;
//# sourceMappingURL=App.js.map