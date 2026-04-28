import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import { KYCSubmission, KYCQueueResponse } from '@/types/admin';
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
  const response = data as KYCQueueResponse | undefined;

  if (error) {
    return (
      <Layout title="KYC Review Queue">
        <ErrorBoundary error={error instanceof Error ? error : new Error('Failed to load')} />
      </Layout>
    );
  }

  return (
    <Layout title="KYC Review Queue">
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex gap-4 flex-wrap">
            {(['pending', 'approved', 'rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-md font-medium capitalize
                  transition-colors ${
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
          ) : response?.kyc_queue && response.kyc_queue.length > 0 ? (
            <KycQueueTable
              data={response.kyc_queue as KYCSubmission[]}
              pagination={response.meta}
              onPageChange={setPage}
            />
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">No KYC submissions found</p>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Layout>
  );
}
