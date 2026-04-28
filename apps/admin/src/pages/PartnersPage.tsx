import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import { DeliveryPartner, DeliveryPartnersResponse } from '@/types/admin';
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
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.suspendPartner(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });

  const reinstateMutation = useMutation({
    mutationFn: (id: string) => adminApi.reinstatePartner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
  const response = data as DeliveryPartnersResponse | undefined;
  const partners = response?.delivery_partners;
  const meta = response?.meta;

  if (error) {
    return (
      <Layout title="Delivery Partners">
        <ErrorBoundary error={error instanceof Error ? error : new Error('Failed to load')} />
      </Layout>
    );
  }

  return (
    <Layout title="Delivery Partner Management">
      <ErrorBoundary>
        <div className="space-y-6">
          <input
            type="text"
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {isLoading ? (
            <LoadingSkeleton count={5} />
          ) : partners && partners.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium
                      text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium
                      text-gray-700 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium
                      text-gray-700 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium
                      text-gray-700 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium
                      text-gray-700 uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium
                      text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {partners.map((partner) => (
                    <tr key={partner.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium
                        text-gray-900">
                        {String(partner.name)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {String(partner.phone)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star size={16} className="text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">
                            {Number(partner.rating).toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {partner.orders_completed}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        ₹{((Number(partner.total_earnings) || 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {partner.status === 'active' ? (
                          <button
                            onClick={() => {
                              const reason = prompt('Enter suspension reason:');
                              if (reason && reason.length >= 10) {
                                suspendMutation.mutate({
                                  id: String(partner.id),
                                  reason,
                                });
                              }
                            }}
                            disabled={suspendMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1
                              bg-red-100 text-red-700 rounded
                              hover:bg-red-200 disabled:opacity-50
                              transition-colors"
                          >
                            <Lock size={16} />
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              reinstateMutation.mutate(String(partner.id))
                            }
                            disabled={reinstateMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1
                              bg-green-100 text-green-700 rounded
                              hover:bg-green-200 disabled:opacity-50
                              transition-colors"
                          >
                            <Unlock size={16} />
                            Reinstate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">No partners found</p>
            </div>
          )}

          {meta && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {partners?.length || 0} of {meta.total} results
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md
                    hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === meta.pages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md
                    hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Layout>
  );
}
