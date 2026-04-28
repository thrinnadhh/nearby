import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import { Shop, ShopsResponse } from '@/types/admin';
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
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.suspendShop(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });

  const reinstateMutation = useMutation({
    mutationFn: (id: string) => adminApi.reinstateShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });
  const response = data as ShopsResponse | undefined;

  if (error) {
    return (
      <Layout title="Shop Management">
        <ErrorBoundary error={error instanceof Error ? error : new Error('Failed to load')} />
      </Layout>
    );
  }

  return (
    <Layout title="Shop Management">
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by name or phone"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
            {(['', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setKycStatus(status);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-md font-medium whitespace-nowrap
                  transition-colors ${
                    kycStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
              >
                {status ? `KYC ${status}` : 'All'}
              </button>
            ))}
          </div>

          {isLoading ? (
            <LoadingSkeleton count={5} />
          ) : response?.shops && response.shops.length > 0 ? (
            <ShopTable
              data={response.shops as Shop[]}
              pagination={response.meta}
              onPageChange={setPage}
              onSuspend={(id, reason) =>
                suspendMutation.mutate({ id, reason })
              }
              onReinstate={(id) => reinstateMutation.mutate(id)}
              isSuspendPending={suspendMutation.isPending}
              isReinstatePending={reinstateMutation.isPending}
            />
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">No shops found</p>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Layout>
  );
}
