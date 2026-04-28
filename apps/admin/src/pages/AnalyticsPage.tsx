import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import { Analytics, DailyAnalyticsResponse, TopShop } from '@/types/admin';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, ShoppingCart, Users, Store } from 'lucide-react';

export default function AnalyticsPage() {
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => adminApi.getAnalytics(),
    staleTime: 60000,
  });

  const {
    data: dailyData,
    isLoading: dailyLoading,
    error: dailyError,
  } = useQuery({
    queryKey: ['daily-analytics'],
    queryFn: () => adminApi.getDailyAnalytics('7d'),
    staleTime: 60000,
  });

  const {
    data: topShopsData,
    isLoading: topShopsLoading,
  } = useQuery({
    queryKey: ['top-shops'],
    queryFn: () => adminApi.getTopShops(),
    staleTime: 60000,
  });

  const analytics = analyticsData as Analytics | undefined;
  const daily = dailyData as DailyAnalyticsResponse | undefined;
  const topShops = topShopsData as TopShop[] | undefined;

  const error = analyticsError || dailyError;

  if (error) {
    return (
      <Layout title="Analytics">
        <ErrorBoundary error={error instanceof Error ? error : new Error('Failed to load')} />
      </Layout>
    );
  }

  const isLoading = analyticsLoading || dailyLoading || topShopsLoading;

  return (
    <Layout title="Platform Analytics">
      <ErrorBoundary>
        <div className="space-y-6">
          {isLoading ? (
            <LoadingSkeleton count={4} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  icon={<TrendingUp size={24} />}
                  label="Total GMV"
                  value={`₹${(
                    ((analytics?.gmv_total as number) || 0) / 100
                  ).toFixed(2)}`}
                  color="blue"
                />
                <MetricCard
                  icon={<ShoppingCart size={24} />}
                  label="Total Orders"
                  value={String((analytics?.orders_total as number) || 0)}
                  color="green"
                />
                <MetricCard
                  icon={<Users size={24} />}
                  label="Total Customers"
                  value={String((analytics?.customers_total as number) || 0)}
                  color="purple"
                />
                <MetricCard
                  icon={<Store size={24} />}
                  label="Active Shops"
                  value={String((analytics?.shops_active as number) || 0)}
                  color="orange"
                />
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  7-Day Revenue Trend
                </h2>
                {daily?.daily ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={daily.daily}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="daily_revenue"
                        stroke="#3b82f6"
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500">No data available</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Top Shops by Revenue
                </h2>
                {topShops && topShops.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topShops}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="shop_name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500">No data available</p>
                )}
              </div>
            </>
          )}
        </div>
      </ErrorBoundary>
    </Layout>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const bgColors = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
  };

  const textColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };

  return (
    <div className={`${bgColors[color]} rounded-lg p-6`}>
      <div className={`${textColors[color]} mb-2`}>{icon}</div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
