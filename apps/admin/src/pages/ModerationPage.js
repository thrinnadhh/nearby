import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Check, X } from 'lucide-react';
export default function ModerationPage() {
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: ['moderation', page],
        queryFn: () => adminApi.getModerationQueue(page, 20),
        staleTime: 30000,
    });
    const approveMutation = useMutation({
        mutationFn: ({ id, contentType }) => adminApi.approveModerationItem(id, contentType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moderation'] });
        },
    });
    const removeMutation = useMutation({
        mutationFn: ({ id, contentType }) => adminApi.removeModerationItem(id, contentType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['moderation'] });
        },
    });
    const response = data;
    const queue = response?.moderation_queue;
    const meta = response?.meta;
    if (error) {
        return (_jsx(Layout, { title: "Moderation", children: _jsx(ErrorBoundary, { error: error instanceof Error ? error : new Error('Failed to load') }) }));
    }
    return (_jsx(Layout, { title: "Content Moderation", children: _jsx(ErrorBoundary, { children: _jsxs("div", { className: "space-y-6", children: [isLoading ? (_jsx(LoadingSkeleton, { count: 5 })) : queue && queue.length > 0 ? (_jsx("div", { className: "space-y-4", children: queue.map((item) => (_jsx("div", { className: "bg-white rounded-lg shadow p-6 border-l-4\n                    border-yellow-500", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "inline-block px-2 py-1 bg-gray-100\n                          text-gray-800 rounded text-xs font-semibold\n                          capitalize", children: String(item.content_type) }), _jsxs("span", { className: "inline-block px-2 py-1 bg-red-100\n                          text-red-800 rounded text-xs font-semibold", children: [item.flag_count, " flags"] })] }), _jsxs("p", { className: "text-sm text-gray-600 mt-2", children: ["Reason: ", String(item.reason)] }), item.content && (_jsxs("p", { className: "text-sm text-gray-700 mt-2 italic", children: ["\"", String(item.content).slice(0, 100), "...\""] })), _jsxs("p", { className: "text-xs text-gray-500 mt-2", children: ["Created: ", new Date(String(item.created_at)).toLocaleDateString()] })] }), _jsxs("div", { className: "flex gap-2 ml-4", children: [_jsxs("button", { onClick: () => approveMutation.mutate({
                                                    id: String(item.id),
                                                    contentType: item.content_type,
                                                }), disabled: approveMutation.isPending, className: "inline-flex items-center gap-1 px-4 py-2\n                          bg-green-600 text-white rounded hover:bg-green-700\n                          disabled:opacity-50 transition-colors text-sm\n                          font-medium", children: [_jsx(Check, { size: 16 }), "Approve"] }), _jsxs("button", { onClick: () => removeMutation.mutate({
                                                    id: String(item.id),
                                                    contentType: item.content_type,
                                                }), disabled: removeMutation.isPending, className: "inline-flex items-center gap-1 px-4 py-2\n                          bg-red-600 text-white rounded hover:bg-red-700\n                          disabled:opacity-50 transition-colors text-sm\n                          font-medium", children: [_jsx(X, { size: 16 }), "Remove"] })] })] }) }, item.id))) })) : (_jsx("div", { className: "text-center py-12 bg-white rounded-lg", children: _jsx("p", { className: "text-gray-500", children: "No flagged content" }) })), meta && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "text-sm text-gray-600", children: ["Showing ", queue?.length || 0, " of ", meta.total, " results"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setPage(Math.max(1, page - 1)), disabled: page === 1, className: "px-4 py-2 bg-white border border-gray-300 rounded-md\n                    hover:bg-gray-50 disabled:opacity-50", children: "Previous" }), _jsx("button", { onClick: () => setPage(page + 1), disabled: page === meta.pages, className: "px-4 py-2 bg-white border border-gray-300 rounded-md\n                    hover:bg-gray-50 disabled:opacity-50", children: "Next" })] })] }))] }) }) }));
}
//# sourceMappingURL=ModerationPage.js.map