import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import { Dispute, DisputeDetail } from '@/types/admin';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { AlertCircle, Loader, X } from 'lucide-react';

export default function DisputesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [decision, setDecision] = useState<'approve' | 'deny'>('deny');
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
    queryFn: () => adminApi.getDisputeDetail(selectedDisputeId as string),
    enabled: Boolean(selectedDisputeId),
  });

  const resolveMutation = useMutation({
    mutationFn: () =>
      adminApi.resolveDispute(
        selectedDisputeId as string,
        decision,
        refundAmount,
        notes || undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      setSelectedDisputeId(null);
      setDecision('deny');
      setRefundAmount(0);
      setNotes('');
    },
  });

  if (error) {
    return (
      <Layout title="Disputes">
        <ErrorBoundary error={error instanceof Error ? error : new Error('Failed to load')} />
      </Layout>
    );
  }

  const disputes = (data as { disputes: Dispute[] } | undefined)?.disputes;
  const detail = detailData as DisputeDetail | undefined;

  return (
    <Layout title="Disputes & Resolutions">
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex gap-4">
            {(['open', 'resolved', 'escalated'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-md font-medium capitalize transition-colors ${
                  status === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {isLoading ? (
            <LoadingSkeleton count={5} />
          ) : disputes && disputes.length > 0 ? (
            <div className="space-y-4">
              {disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        Dispute #{String(dispute.id).slice(0, 8)}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{String(dispute.reason)}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Created: {new Date(String(dispute.created_at)).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDisputeId(String(dispute.id))}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-500">No disputes found</p>
            </div>
          )}

          {selectedDisputeId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                  <h2 className="text-xl font-semibold text-gray-900">Dispute Details</h2>
                  <button
                    onClick={() => setSelectedDisputeId(null)}
                    className="p-1 hover:bg-gray-100 rounded-md"
                  >
                    <X size={24} className="text-gray-600" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {detailLoading ? (
                    <LoadingSkeleton count={3} />
                  ) : detail ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Order</p>
                          <p className="font-medium text-gray-900">{detail.order_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Shop</p>
                          <p className="font-medium text-gray-900">{detail.shop_name || detail.shop_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Customer</p>
                          <p className="font-medium text-gray-900">
                            {detail.customer_name || detail.customer_phone || detail.customer_id}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Reason</p>
                          <p className="font-medium text-gray-900">{detail.reason}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Order Timeline</h3>
                        <div className="space-y-2">
                          {detail.order_timeline.length > 0 ? detail.order_timeline.map((item, index) => (
                            <div
                              key={`${item.status}-${item.timestamp}-${index}`}
                              className="text-sm text-gray-700 border rounded-md px-3 py-2"
                            >
                              <span className="font-medium capitalize">{item.status}</span>
                              {' · '}
                              {new Date(item.timestamp).toLocaleString()}
                            </div>
                          )) : (
                            <p className="text-sm text-gray-500">No timeline available</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">GPS Trail</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {detail.gps_trail.length > 0 ? detail.gps_trail.map((point, index) => (
                            <div
                              key={`${point.timestamp}-${index}`}
                              className="text-sm text-gray-700 border rounded-md px-3 py-2"
                            >
                              {point.lat}, {point.lng} · {new Date(point.timestamp).toLocaleString()}
                            </div>
                          )) : (
                            <p className="text-sm text-gray-500">No GPS trail available</p>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6 space-y-4">
                        <h3 className="font-semibold text-gray-900">Resolve Dispute</h3>
                        <div className="flex gap-4">
                          <button
                            onClick={() => setDecision('approve')}
                            className={`px-4 py-2 rounded-md font-medium ${
                              decision === 'approve'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            Approve Refund
                          </button>
                          <button
                            onClick={() => setDecision('deny')}
                            className={`px-4 py-2 rounded-md font-medium ${
                              decision === 'deny'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            Deny
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Refund Amount (paise)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(Number(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => resolveMutation.mutate()}
                          disabled={resolveMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2"
                        >
                          {resolveMutation.isPending && <Loader size={18} className="animate-spin" />}
                          Submit Resolution
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">Unable to load dispute details.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Layout>
  );
}
