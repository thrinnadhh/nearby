import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import { FileText, Check, X } from 'lucide-react';
import KycDetailModal from './KycDetailModal';
export default function KycQueueTable({ data, pagination, onPageChange, }) {
    const [selectedKyc, setSelectedKyc] = useState(null);
    const queryClient = useQueryClient();
    const approveMutation = useMutation({
        mutationFn: (id) => adminApi.approveKyc(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kyc-queue'] });
            setSelectedKyc(null);
        },
    });
    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }) => adminApi.rejectKyc(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kyc-queue'] });
            setSelectedKyc(null);
        },
    });
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "bg-white rounded-lg shadow overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50 border-b border-gray-200", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium\n                text-gray-700 uppercase tracking-wider", children: "Shop Name" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium\n                text-gray-700 uppercase tracking-wider", children: "Owner" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium\n                text-gray-700 uppercase tracking-wider", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium\n                text-gray-700 uppercase tracking-wider", children: "Submitted" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium\n                text-gray-700 uppercase tracking-wider", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: data.map((kyc) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4 text-sm font-medium text-gray-900", children: kyc.shop_name }), _jsxs("td", { className: "px-6 py-4 text-sm text-gray-600", children: [kyc.owner_name, _jsx("br", {}), _jsx("span", { className: "text-xs text-gray-500", children: kyc.owner_phone })] }), _jsx("td", { className: "px-6 py-4 text-sm", children: _jsx("span", { className: `inline-flex px-2 py-1 rounded-full
                    text-xs font-semibold ${kyc.status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : kyc.status === 'approved'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'}`, children: kyc.status }) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-600", children: new Date(kyc.submitted_at).toLocaleDateString() }), _jsxs("td", { className: "px-6 py-4 text-right text-sm space-x-2", children: [_jsxs("button", { onClick: () => setSelectedKyc(kyc), className: "inline-flex items-center gap-1 px-3 py-1\n                      bg-blue-100 text-blue-700 rounded hover:bg-blue-200\n                      transition-colors", children: [_jsx(FileText, { size: 16 }), "View"] }), kyc.status === 'pending' && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => approveMutation.mutate(kyc.id), disabled: approveMutation.isPending, className: "inline-flex items-center gap-1 px-3 py-1\n                          bg-green-100 text-green-700 rounded\n                          hover:bg-green-200 disabled:opacity-50\n                          transition-colors", children: [_jsx(Check, { size: 16 }), "Approve"] }), _jsxs("button", { onClick: () => setSelectedKyc(kyc), className: "inline-flex items-center gap-1 px-3 py-1\n                          bg-red-100 text-red-700 rounded hover:bg-red-200\n                          transition-colors", children: [_jsx(X, { size: 16 }), "Reject"] })] }))] })] }, kyc.id))) })] }) }), _jsxs("div", { className: "flex items-center justify-between mt-6", children: [_jsxs("p", { className: "text-sm text-gray-600", children: ["Showing ", data.length, " of ", pagination.total, " results"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => onPageChange(pagination.page - 1), disabled: pagination.page === 1, className: "px-4 py-2 bg-white border border-gray-300 rounded-md\n              hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed", children: "Previous" }), Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (_jsx("button", { onClick: () => onPageChange(p), className: `px-3 py-2 rounded-md ${pagination.page === p
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-300 hover:bg-gray-50'}`, children: p }, p))), _jsx("button", { onClick: () => onPageChange(pagination.page + 1), disabled: pagination.page === pagination.pages, className: "px-4 py-2 bg-white border border-gray-300 rounded-md\n              hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed", children: "Next" })] })] }), selectedKyc && (_jsx(KycDetailModal, { kyc: selectedKyc, onClose: () => setSelectedKyc(null), onApprove: () => approveMutation.mutate(selectedKyc.id), onReject: (reason) => rejectMutation.mutate({ id: selectedKyc.id, reason }), isApprovePending: approveMutation.isPending, isRejectPending: rejectMutation.isPending }))] }));
}
//# sourceMappingURL=KycQueueTable.js.map