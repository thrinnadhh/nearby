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

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={token ? <Navigate to="/kyc-queue" /> : <LoginPage />}
          />

          <Route element={<ProtectedRoute />}>
            <Route path="/kyc-queue" element={<KycQueuePage />} />
            <Route path="/shops" element={<ShopsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/disputes" element={<DisputesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/moderation" element={<ModerationPage />} />
            <Route path="/broadcast" element={<BroadcastPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/kyc-queue" />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
