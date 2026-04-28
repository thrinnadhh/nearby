import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Star, Lock, Unlock } from 'lucide-react';
export default function PartnersPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: ['partners', page, search],
        queryFn: () => adminApi.getDeliveryPartners(page, 20, search),
        staleTime: 30000,
    });
    const suspendMutation = useMutation({
        mutationFn: ({ id, reason }) => adminApi.suspendPartner(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
    });
    const reinstateMutation = useMutation({
        mutationFn: (id) => adminApi.reinstatePartner(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
    });
    const response = data;
    const partners = response?.delivery_partners;
    const meta = response?.meta;
    if (error) {
        return (_jsx(Layout, { title: "Delivery Partners", children: _jsx(ErrorBoundary, { error: error instanceof Error ? error : new Error('Failed to load') }) }));
    }
    return (_jsx(Layout, { title: "Delivery Partner Management", children: _jsx(ErrorBoundary, { children: _jsxs("div", { className: "space-y-6", children: [_jsx("input", { type: "text", placeholder: "Search by name or phone", value: search, onChange: (e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }, className: "w-full px-4 py-2 border border-gray-300 rounded-md\n              focus:outline-none focus:ring-2 focus:ring-blue-500" }), isLoading ? (_jsx(LoadingSkeleton, { count: 5 })) : partners && partners.length > 0 ? (_jsx("div", { className: "bg-white rounded-lg shadow overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50 border-b border-gray-200", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium\n                      text-gray-700 uppercase tracking-wider", children: "Name" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium\n                      text-gray-700 uppercase tracking-wider", children: "Phone" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium\n                      text-gray-700 uppercase tracking-wider", children: "Rating" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium\n                      text-gray-700 uppercase tracking-wider", children: "Orders" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium\n                      text-gray-700 uppercase tracking-wider", children: "Earnings" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium\n                      text-gray-700 uppercase tracking-wider", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: partners.map((partner) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4 text-sm font-medium\n                        text-gray-900", children: String(partner.name) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-600", children: String(partner.phone) }), _jsx("td", { className: "px-6 py-4 text-sm", children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Star, { size: 16, className: "text-yellow-500 fill-yellow-500" }), _jsx("span", { className: "font-medium", children: Number(partner.rating).toFixed(1) })] }) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-600", children: partner.orders_completed }), _jsxs("td", { className: "px-6 py-4 text-sm text-gray-900 font-medium", children: ["\u20B9", ((Number(partner.total_earnings) || 0) / 100).toFixed(2)] }), _jsx("td", { className: "px-6 py-4 text-right text-sm", children: partner.status === 'active' ? (_jsxs("button", { onClick: () => {
                                                        const reason = prompt('Enter suspension reason:');
                                                        if (reason && reason.length >= 10) {
                                                            suspendMutation.mutate({
                                                                id: String(partner.id),
                                                                reason,
                                                            });
                                                        }
                                                    }, disabled: suspendMutation.isPending, className: "inline-flex items-center gap-1 px-3 py-1\n                              bg-red-100 text-red-700 rounded\n                              hover:bg-red-200 disabled:opacity-50\n                              transition-colors", children: [_jsx(Lock, { size: 16 }), "Suspend"] })) : (_jsxs("button", { onClick: () => reinstateMutation.mutate(String(partner.id)), disabled: reinstateMutation.isPending, className: "inline-flex items-center gap-1 px-3 py-1\n                              bg-green-100 text-green-700 rounded\n                              hover:bg-green-200 disabled:opacity-50\n                              transition-colors", children: [_jsx(Unlock, { size: 16 }), "Reinstate"] })) })] }, partner.id))) })] }) })) : (_jsx("div", { className: "text-center py-12 bg-white rounded-lg", children: _jsx("p", { className: "text-gray-500", children: "No partners found" }) })), meta && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "text-sm text-gray-600", children: ["Showing ", partners?.length || 0, " of ", meta.total, " results"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setPage(Math.max(1, page - 1)), disabled: page === 1, className: "px-4 py-2 bg-white border border-gray-300 rounded-md\n                    hover:bg-gray-50 disabled:opacity-50", children: "Previous" }), _jsx("button", { onClick: () => setPage(page + 1), disabled: page === meta.pages, className: "px-4 py-2 bg-white border border-gray-300 rounded-md\n                    hover:bg-gray-50 disabled:opacity-50", children: "Next" })] })] }))] }) }) }));
}
//# sourceMappingURL=PartnersPage.js.map