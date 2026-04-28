import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import Layout from '@/components/Layout';
import KycQueueTable from '@/components/KycQueueTable';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
export default function KycQueuePage() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('pending');
    const { data, isLoading, error } = useQuery({
        queryKey: ['kyc-queue', page, status],
        queryFn: () => adminApi.getKycQueue(page, 20, status),
        staleTime: 30000,
    });
    const response = data;
    if (error) {
        return (_jsx(Layout, { title: "KYC Review Queue", children: _jsx(ErrorBoundary, { error: error instanceof Error ? error : new Error('Failed to load') }) }));
    }
    return (_jsx(Layout, { title: "KYC Review Queue", children: _jsx(ErrorBoundary, { children: _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "flex gap-4 flex-wrap", children: ['pending', 'approved', 'rejected'].map((s) => (_jsx("button", { onClick: () => {
                                setStatus(s);
                                setPage(1);
                            }, className: `px-4 py-2 rounded-md font-medium capitalize
                  transition-colors ${status === s
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-200'}`, children: s }, s))) }), isLoading ? (_jsx(LoadingSkeleton, { count: 5 })) : response?.kyc_queue && response.kyc_queue.length > 0 ? (_jsx(KycQueueTable, { data: response.kyc_queue, pagination: response.meta, onPageChange: setPage })) : (_jsx("div", { className: "text-center py-12 bg-white rounded-lg", children: _jsx("p", { className: "text-gray-500", children: "No KYC submissions found" }) }))] }) }) }));
}
//# sourceMappingURL=KycQueuePage.js.map