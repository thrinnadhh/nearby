import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { AlertCircle, Loader, X } from 'lucide-react';
export default function DisputesPage() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('open');
    const [selectedDisputeId, setSelectedDisputeId] = useState(null);
    const [decision, setDecision] = useState('deny');
    const [refundAmount, setRefundAmount] = useState(0);
    const [notes, setNotes] = useState('');
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: ['disputes', page, status],
        queryFn: () => adminApi.getDisputes(page, 20, status),
        staleTime: 30000,
    });
    const { data: detailData, isLoading: detailLoading } = useQuery({
        queryKey: ['dispute-detail', selectedDisputeId],
        queryFn: () => adminApi.getDisputeDetail(selectedDisputeId),
        enabled: Boolean(selectedDisputeId),
    });
    const resolveMutation = useMutation({
        mutationFn: () => adminApi.resolveDispute(selectedDisputeId, decision, refundAmount, notes || undefined),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disputes'] });
            setSelectedDisputeId(null);
            setDecision('deny');
            setRefundAmount(0);
            setNotes('');
        },
    });
    if (error) {
        return (_jsx(Layout, { title: "Disputes", children: _jsx(ErrorBoundary, { error: error instanceof Error ? error : new Error('Failed to load') }) }));
    }
    const disputes = data?.disputes;
    const detail = detailData;
    return (_jsx(Layout, { title: "Disputes & Resolutions", children: _jsx(ErrorBoundary, { children: _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "flex gap-4", children: ['open', 'resolved', 'escalated'].map((s) => (_jsx("button", { onClick: () => {
                                setStatus(s);
                                setPage(1);
                            }, className: `px-4 py-2 rounded-md font-medium capitalize transition-colors ${status === s
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-200'}`, children: s }, s))) }), isLoading ? (_jsx(LoadingSkeleton, { count: 5 })) : disputes && disputes.length > 0 ? (_jsx("div", { className: "space-y-4", children: disputes.map((dispute) => (_jsx("div", { className: "bg-white rounded-lg shadow p-6 border-l-4 border-red-500", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("h3", { className: "font-medium text-gray-900", children: ["Dispute #", String(dispute.id).slice(0, 8)] }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: String(dispute.reason) }), _jsxs("p", { className: "text-xs text-gray-500 mt-2", children: ["Created: ", new Date(String(dispute.created_at)).toLocaleDateString()] })] }), _jsx("button", { onClick: () => setSelectedDisputeId(String(dispute.id)), className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium", children: "View Details" })] }) }, dispute.id))) })) : (_jsxs("div", { className: "text-center py-12 bg-white rounded-lg", children: [_jsx(AlertCircle, { className: "mx-auto mb-4 text-gray-400", size: 48 }), _jsx("p", { className: "text-gray-500", children: "No disputes found" })] })), selectedDisputeId && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "Dispute Details" }), _jsx("button", { onClick: () => setSelectedDisputeId(null), className: "p-1 hover:bg-gray-100 rounded-md", children: _jsx(X, { size: 24, className: "text-gray-600" }) })] }), _jsx("div", { className: "p-6 space-y-6", children: detailLoading ? (_jsx(LoadingSkeleton, { count: 3 })) : detail ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Order" }), _jsx("p", { className: "font-medium text-gray-900", children: detail.order_id })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Shop" }), _jsx("p", { className: "font-medium text-gray-900", children: detail.shop_name || detail.shop_id })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Customer" }), _jsx("p", { className: "font-medium text-gray-900", children: detail.customer_name || detail.customer_phone || detail.customer_id })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Reason" }), _jsx("p", { className: "font-medium text-gray-900", children: detail.reason })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-3", children: "Order Timeline" }), _jsx("div", { className: "space-y-2", children: detail.order_timeline.length > 0 ? detail.order_timeline.map((item, index) => (_jsxs("div", { className: "text-sm text-gray-700 border rounded-md px-3 py-2", children: [_jsx("span", { className: "font-medium capitalize", children: item.status }), ' · ', new Date(item.timestamp).toLocaleString()] }, `${item.status}-${item.timestamp}-${index}`))) : (_jsx("p", { className: "text-sm text-gray-500", children: "No timeline available" })) })] }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-3", children: "GPS Trail" }), _jsx("div", { className: "space-y-2 max-h-40 overflow-y-auto", children: detail.gps_trail.length > 0 ? detail.gps_trail.map((point, index) => (_jsxs("div", { className: "text-sm text-gray-700 border rounded-md px-3 py-2", children: [point.lat, ", ", point.lng, " \u00B7 ", new Date(point.timestamp).toLocaleString()] }, `${point.timestamp}-${index}`))) : (_jsx("p", { className: "text-sm text-gray-500", children: "No GPS trail available" })) })] }), _jsxs("div", { className: "border-t border-gray-200 pt-6 space-y-4", children: [_jsx("h3", { className: "font-semibold text-gray-900", children: "Resolve Dispute" }), _jsxs("div", { className: "flex gap-4", children: [_jsx("button", { onClick: () => setDecision('approve'), className: `px-4 py-2 rounded-md font-medium ${decision === 'approve'
                                                                    ? 'bg-green-600 text-white'
                                                                    : 'bg-gray-100 text-gray-700'}`, children: "Approve Refund" }), _jsx("button", { onClick: () => setDecision('deny'), className: `px-4 py-2 rounded-md font-medium ${decision === 'deny'
                                                                    ? 'bg-red-600 text-white'
                                                                    : 'bg-gray-100 text-gray-700'}`, children: "Deny" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Refund Amount (paise)" }), _jsx("input", { type: "number", min: 0, value: refundAmount, onChange: (e) => setRefundAmount(Number(e.target.value) || 0), className: "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Notes" }), _jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), rows: 4, className: "w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("button", { onClick: () => resolveMutation.mutate(), disabled: resolveMutation.isPending, className: "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2", children: [resolveMutation.isPending && _jsx(Loader, { size: 18, className: "animate-spin" }), "Submit Resolution"] })] })] })) : (_jsx("p", { className: "text-gray-500", children: "Unable to load dispute details." })) })] }) }))] }) }) }));
}
//# sourceMappingURL=DisputesPage.js.map