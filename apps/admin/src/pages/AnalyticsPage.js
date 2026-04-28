import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, } from 'recharts';
import { TrendingUp, ShoppingCart, Users, Store } from 'lucide-react';
export default function AnalyticsPage() {
    const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError, } = useQuery({
        queryKey: ['analytics'],
        queryFn: () => adminApi.getAnalytics(),
        staleTime: 60000,
    });
    const { data: dailyData, isLoading: dailyLoading, error: dailyError, } = useQuery({
        queryKey: ['daily-analytics'],
        queryFn: () => adminApi.getDailyAnalytics('7d'),
        staleTime: 60000,
    });
    const { data: topShopsData, isLoading: topShopsLoading, } = useQuery({
        queryKey: ['top-shops'],
        queryFn: () => adminApi.getTopShops(),
        staleTime: 60000,
    });
    const analytics = analyticsData;
    const daily = dailyData;
    const topShops = topShopsData;
    const error = analyticsError || dailyError;
    if (error) {
        return (_jsx(Layout, { title: "Analytics", children: _jsx(ErrorBoundary, { error: error instanceof Error ? error : new Error('Failed to load') }) }));
    }
    const isLoading = analyticsLoading || dailyLoading || topShopsLoading;
    return (_jsx(Layout, { title: "Platform Analytics", children: _jsx(ErrorBoundary, { children: _jsx("div", { className: "space-y-6", children: isLoading ? (_jsx(LoadingSkeleton, { count: 4 })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(MetricCard, { icon: _jsx(TrendingUp, { size: 24 }), label: "Total GMV", value: `₹${((analytics?.gmv_total || 0) / 100).toFixed(2)}`, color: "blue" }), _jsx(MetricCard, { icon: _jsx(ShoppingCart, { size: 24 }), label: "Total Orders", value: String(analytics?.orders_total || 0), color: "green" }), _jsx(MetricCard, { icon: _jsx(Users, { size: 24 }), label: "Total Customers", value: String(analytics?.customers_total || 0), color: "purple" }), _jsx(MetricCard, { icon: _jsx(Store, { size: 24 }), label: "Active Shops", value: String(analytics?.shops_active || 0), color: "orange" })] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "7-Day Revenue Trend" }), daily?.daily ? (_jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(LineChart, { data: daily.daily, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "date" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "daily_revenue", stroke: "#3b82f6", name: "Revenue" })] }) })) : (_jsx("p", { className: "text-gray-500", children: "No data available" }))] }), _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Top Shops by Revenue" }), topShops && topShops.length > 0 ? (_jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(BarChart, { data: topShops, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "shop_name" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "revenue", fill: "#10b981", name: "Revenue" })] }) })) : (_jsx("p", { className: "text-gray-500", children: "No data available" }))] })] })) }) }) }));
}
function MetricCard({ icon, label, value, color }) {
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
    return (_jsxs("div", { className: `${bgColors[color]} rounded-lg p-6`, children: [_jsx("div", { className: `${textColors[color]} mb-2`, children: icon }), _jsx("p", { className: "text-sm text-gray-600", children: label }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: value })] }));
}
//# sourceMappingURL=AnalyticsPage.js.map