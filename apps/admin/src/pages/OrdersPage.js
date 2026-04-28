import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import { useOrderStuckAlerts, useOrderUpdates, useSocket } from '@/hooks/useSocket';
import { useOrdersStore } from '@/store/ordersStore';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { AlertTriangle } from 'lucide-react';
export default function OrdersPage() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('pending');
    const { orders, setOrders, updateOrder } = useOrdersStore();
    const queryClient = useQueryClient();
    useSocket();
    const { data, isLoading, error } = useQuery({
        queryKey: ['orders', page, status],
        queryFn: () => adminApi.getLiveOrders(status, page, 20),
        staleTime: 10000,
    });
    const escalateMutation = useMutation({
        mutationFn: (orderId) => adminApi.escalateOrder(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
    const handleOrderUpdate = useCallback((update) => {
        const orderId = (update.order_id || update.orderId);
        if (!orderId)
            return;
        updateOrder(orderId, {
            id: orderId,
            status: String(update.status || ''),
            customer_id: String(update.customer_id || ''),
            shop_id: String(update.shop_id || ''),
            updated_at: String(update.updated_at || new Date().toISOString()),
        });
    }, [updateOrder]);
    const handleStuckAlert = useCallback((update) => {
        const orderId = (update.order_id || update.orderId);
        if (!orderId)
            return;
        const stuckMinutes = Number(update.stuck_minutes || 0);
        updateOrder(orderId, {
            id: orderId,
            pending_since: new Date(Date.now() - stuckMinutes * 60000).toISOString(),
        });
    }, [updateOrder]);
    useOrderUpdates(handleOrderUpdate);
    useOrderStuckAlerts(handleStuckAlert);
    const response = data;
    useEffect(() => {
        if (response?.orders) {
            setOrders(response.orders);
        }
    }, [response, setOrders]);
    if (error) {
        return (_jsx(Layout, { title: "Live Order Monitor", children: _jsx(ErrorBoundary, { error: error instanceof Error ? error : new Error('Failed to load') }) }));
    }
    const displayOrders = response?.orders || orders;
    return (_jsx(Layout, { title: "Live Order Monitor", children: _jsx(ErrorBoundary, { children: _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "flex gap-4 flex-wrap", children: ['pending', 'accepted', 'packing'].map((s) => (_jsx("button", { onClick: () => {
                                setStatus(s);
                                setPage(1);
                            }, className: `px-4 py-2 rounded-md font-medium capitalize transition-colors ${status === s
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-200'}`, children: s }, s))) }), isLoading ? (_jsx(LoadingSkeleton, { count: 5 })) : displayOrders.length > 0 ? (_jsx("div", { className: "space-y-4", children: displayOrders.map((order) => {
                            const isStuck = Boolean(order.pending_since &&
                                new Date().getTime() - new Date(order.pending_since).getTime() > 180000);
                            return (_jsx("div", { className: `bg-white rounded-lg shadow p-6 border-l-4 ${isStuck
                                    ? 'border-red-500'
                                    : status === 'pending'
                                        ? 'border-yellow-500'
                                        : 'border-blue-500'}`, children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("p", { className: "font-medium text-gray-900", children: ["Order #", order.id.slice(0, 8)] }), isStuck && (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold", children: [_jsx(AlertTriangle, { size: 14 }), "STUCK"] }))] }), _jsxs("p", { className: "text-sm text-gray-600", children: ["Shop: ", order.shop_id] }), _jsxs("p", { className: "text-sm text-gray-600", children: ["Customer: ", order.customer_id] }), _jsxs("p", { className: "text-sm font-medium text-gray-900", children: ["Created: ", new Date(order.created_at).toLocaleString()] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: "text-xs text-gray-500", children: ["Status: ", _jsx("span", { className: "font-medium capitalize", children: order.status })] }), isStuck && (_jsx("button", { onClick: () => escalateMutation.mutate(order.id), disabled: escalateMutation.isPending, className: "mt-2 px-4 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50", children: "Escalate" }))] })] }) }, order.id));
                        }) })) : (_jsx("div", { className: "text-center py-12 bg-white rounded-lg", children: _jsx("p", { className: "text-gray-500", children: "No orders found" }) }))] }) }) }));
}
//# sourceMappingURL=OrdersPage.js.map