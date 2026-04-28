import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KYCSubmission, PaginationMeta } from '@/types/admin';
import { adminApi } from '@/services/api';
import { ChevronRight, FileText, Check, X } from 'lucide-react';
import KycDetailModal from './KycDetailModal';

interface KycQueueTableProps {
  data: KYCSubmission[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export default function KycQueueTable({
  data,
  pagination,
  onPageChange,
}: KycQueueTableProps) {
  const [selectedKyc, setSelectedKyc] = useState<KYCSubmission | null>(null);
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveKyc(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-queue'] });
      setSelectedKyc(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectKyc(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-queue'] });
      setSelectedKyc(null);
    },
  });

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium
                text-gray-700 uppercase tracking-wider">
                Shop Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium
                text-gray-700 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium
                text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium
                text-gray-700 uppercase tracking-wider">
                Submitted
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium
                text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((kyc) => (
              <tr key={kyc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {kyc.shop_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {kyc.owner_name}
                  <br />
                  <span className="text-xs text-gray-500">
                    {kyc.owner_phone}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full
                    text-xs font-semibold ${
                      kyc.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : kyc.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                    {kyc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(kyc.submitted_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right text-sm space-x-2">
                  <button
                    onClick={() => setSelectedKyc(kyc)}
                    className="inline-flex items-center gap-1 px-3 py-1
                      bg-blue-100 text-blue-700 rounded hover:bg-blue-200
                      transition-colors"
                  >
                    <FileText size={16} />
                    View
                  </button>
                  {kyc.status === 'pending' && (
                    <>
                      <button
                        onClick={() => approveMutation.mutate(kyc.id)}
                        disabled={approveMutation.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1
                          bg-green-100 text-green-700 rounded
                          hover:bg-green-200 disabled:opacity-50
                          transition-colors"
                      >
                        <Check size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => setSelectedKyc(kyc)}
                        className="inline-flex items-center gap-1 px-3 py-1
                          bg-red-100 text-red-700 rounded hover:bg-red-200
                          transition-colors"
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-600">
          Showing {data.length} of {pagination.total} results
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md
              hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
            (p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 py-2 rounded-md ${
                  pagination.page === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md
              hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {selectedKyc && (
        <KycDetailModal
          kyc={selectedKyc}
          onClose={() => setSelectedKyc(null)}
          onApprove={() => approveMutation.mutate(selectedKyc.id)}
          onReject={(reason) =>
            rejectMutation.mutate({ id: selectedKyc.id, reason })
          }
          isApprovePending={approveMutation.isPending}
          isRejectPending={rejectMutation.isPending}
        />
      )}
    </>
  );
}
