import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ShopTable from '@/components/ShopTable';
export default function ShopsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [kycStatus, setKycStatus] = useState('');
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: ['shops', page, search, kycStatus],
        queryFn: () => adminApi.getShops(page, 20, search, kycStatus),
        staleTime: 30000,
    });
    const suspendMutation = useMutation({
        mutationFn: ({ id, reason }) => adminApi.suspendShop(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shops'] });
        },
    });
    const reinstateMutation = useMutation({
        mutationFn: (id) => adminApi.reinstateShop(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shops'] });
        },
    });
    const response = data;
    if (error) {
        return (_jsx(Layout, { title: "Shop Management", children: _jsx(ErrorBoundary, { error: error instanceof Error ? error : new Error('Failed to load') }) }));
    }
    return (_jsx(Layout, { title: "Shop Management", children: _jsx(ErrorBoundary, { children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex gap-4 flex-wrap", children: [_jsx("input", { type: "text", placeholder: "Search by name or phone", value: search, onChange: (e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }, className: "px-4 py-2 border border-gray-300 rounded-md\n                focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" }), ['', 'approved', 'rejected'].map((status) => (_jsx("button", { onClick: () => {
                                    setKycStatus(status);
                                    setPage(1);
                                }, className: `px-4 py-2 rounded-md font-medium whitespace-nowrap
                  transition-colors ${kycStatus === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 border border-gray-200'}`, children: status ? `KYC ${status}` : 'All' }, status)))] }), isLoading ? (_jsx(LoadingSkeleton, { count: 5 })) : response?.shops && response.shops.length > 0 ? (_jsx(ShopTable, { data: response.shops, pagination: response.meta, onPageChange: setPage, onSuspend: (id, reason) => suspendMutation.mutate({ id, reason }), onReinstate: (id) => reinstateMutation.mutate(id), isSuspendPending: suspendMutation.isPending, isReinstatePending: reinstateMutation.isPending })) : (_jsx("div", { className: "text-center py-12 bg-white rounded-lg", children: _jsx("p", { className: "text-gray-500", children: "No shops found" }) }))] }) }) }));
}
//# sourceMappingURL=ShopsPage.js.map