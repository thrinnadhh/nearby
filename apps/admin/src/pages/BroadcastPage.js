import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Send, Loader } from 'lucide-react';
export default function BroadcastPage() {
    const [page, setPage] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        body: '',
        target: 'customers',
        scheduled_at: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: ['broadcast-history', page],
        queryFn: () => adminApi.getBroadcastHistory(page, 20),
        staleTime: 30000,
    });
    const createMutation = useMutation({
        mutationFn: () => adminApi.createBroadcast(formData.title, formData.body, formData.target, formData.scheduled_at),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['broadcast-history'] });
            setFormData({
                title: '',
                body: '',
                target: 'customers',
                scheduled_at: '',
            });
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
        },
    });
    const response = data;
    const history = response?.broadcasts;
    const meta = response?.meta;
    if (error) {
        return (_jsx(Layout, { title: "Broadcast", children: _jsx(ErrorBoundary, { error: error instanceof Error ? error : new Error('Failed to load') }) }));
    }
    const isFormValid = formData.title.length >= 5 &&
        formData.body.length >= 10 &&
        formData.target;
    return (_jsx(Layout, { title: "Broadcast Campaigns", children: _jsx(ErrorBoundary, { children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsx("div", { className: "lg:col-span-1", children: _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-6", children: "New Campaign" }), submitted && (_jsx("div", { className: "mb-4 p-4 bg-green-50 border border-green-200\n                  rounded-md", children: _jsx("p", { className: "text-sm text-green-700", children: "Campaign created successfully!" }) })), _jsxs("form", { onSubmit: (e) => {
                                        e.preventDefault();
                                        createMutation.mutate();
                                    }, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Title" }), _jsx("input", { type: "text", value: formData.title, onChange: (e) => setFormData({ ...formData, title: e.target.value }), maxLength: 100, placeholder: "Campaign title", className: "w-full px-4 py-2 border border-gray-300 rounded-md\n                      focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: [formData.title.length, "/100"] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Message" }), _jsx("textarea", { value: formData.body, onChange: (e) => setFormData({ ...formData, body: e.target.value }), maxLength: 500, placeholder: "Campaign message", rows: 5, className: "w-full px-4 py-2 border border-gray-300 rounded-md\n                      focus:outline-none focus:ring-2 focus:ring-blue-500\n                      resize-none" }), _jsxs("p", { className: "text-xs text-gray-500 mt-1", children: [formData.body.length, "/500"] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Target Audience" }), _jsxs("select", { value: formData.target, onChange: (e) => setFormData({
                                                        ...formData,
                                                        target: e.target.value,
                                                    }), className: "w-full px-4 py-2 border border-gray-300 rounded-md\n                      focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "customers", children: "Customers" }), _jsx("option", { value: "shops", children: "Shop Owners" }), _jsx("option", { value: "delivery", children: "Delivery Partners" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Schedule (Optional)" }), _jsx("input", { type: "datetime-local", value: formData.scheduled_at, onChange: (e) => setFormData({
                                                        ...formData,
                                                        scheduled_at: e.target.value,
                                                    }), className: "w-full px-4 py-2 border border-gray-300 rounded-md\n                      focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Leave empty to send immediately" })] }), _jsxs("button", { type: "submit", disabled: !isFormValid || createMutation.isPending, className: "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400\n                    text-white font-medium py-2 rounded-md transition-colors\n                    flex items-center justify-center gap-2", children: [createMutation.isPending && (_jsx(Loader, { size: 20, className: "animate-spin" })), "Send Campaign"] })] }), _jsx("div", { className: "mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md", children: _jsx("p", { className: "text-sm text-yellow-700", children: "Rate limit: 1 campaign per hour" }) })] }) }), _jsx("div", { className: "lg:col-span-2", children: _jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-6", children: "Campaign History" }), isLoading ? (_jsx(LoadingSkeleton, { count: 3 })) : history && history.length > 0 ? (_jsx("div", { className: "space-y-4", children: history.map((campaign) => (_jsx("div", { className: "border border-gray-200 rounded-lg p-4\n                        hover:bg-gray-50 transition-colors", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-medium text-gray-900", children: String(campaign.title) }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["To: ", _jsx("span", { className: "capitalize", children: String(campaign.target) })] }), _jsxs("p", { className: "text-xs text-gray-500 mt-2", children: ["Sent: ", campaign.sent_count, " users"] }), _jsxs("p", { className: "text-xs text-gray-500", children: ["Created: ", new Date(String(campaign.created_at)).toLocaleDateString()] })] }), _jsxs("span", { className: "inline-block px-2 py-1 bg-blue-100\n                          text-blue-800 rounded text-xs font-semibold capitalize", children: [_jsx(Send, { size: 14, className: "inline mr-1" }), campaign.status || 'sent'] })] }) }, campaign.id))) })) : (_jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-500", children: "No campaigns yet" }) })), meta && (_jsxs("div", { className: "mt-6 flex gap-2 justify-between", children: [_jsxs("p", { className: "text-sm text-gray-600", children: ["Showing ", history?.length || 0, " of ", meta.total] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setPage(Math.max(1, page - 1)), disabled: page === 1, className: "px-4 py-2 bg-gray-100 border border-gray-300\n                        rounded-md hover:bg-gray-200 disabled:opacity-50", children: "Previous" }), _jsx("button", { onClick: () => setPage(page + 1), disabled: page === meta.pages, className: "px-4 py-2 bg-gray-100 border border-gray-300\n                        rounded-md hover:bg-gray-200 disabled:opacity-50", children: "Next" })] })] }))] }) })] }) }) }));
}
//# sourceMappingURL=BroadcastPage.js.map