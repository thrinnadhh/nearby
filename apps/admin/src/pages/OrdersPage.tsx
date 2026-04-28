import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import { useOrderStuckAlerts, useOrderUpdates, useSocket } from '@/hooks/useSocket';
import { useOrdersStore } from '@/store/ordersStore';
import { OrderStatus, OrdersResponse } from '@/types/admin';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { AlertTriangle } from 'lucide-react';

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const { orders, setOrders, updateOrder } = useOrdersStore();
  const queryClient = useQueryClient();
  useSocket();

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', page, status],
    queryFn: () => adminApi.getLiveOrders(status, page, 20),
    staleTime: 10000,
  });

  const escalateMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.escalateOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const handleOrderUpdate = useCallback((update: Record<string, unknown>) => {
    const orderId = (update.order_id || update.orderId) as string;
    if (!orderId) return;

    updateOrder(orderId, {
      id: orderId,
      status: String(update.status || '') as OrderStatus,
      customer_id: String(update.customer_id || ''),
      shop_id: String(update.shop_id || ''),
      updated_at: String(update.updated_at || new Date().toISOString()),
    });
  }, [updateOrder]);

  const handleStuckAlert = useCallback((update: Record<string, unknown>) => {
    const orderId = (update.order_id || update.orderId) as string;
    if (!orderId) return;

    const stuckMinutes = Number(update.stuck_minutes || 0);
    updateOrder(orderId, {
      id: orderId,
      pending_since: new Date(Date.now() - stuckMinutes * 60_000).toISOString(),
    });
  }, [updateOrder]);

  useOrderUpdates(handleOrderUpdate);
  useOrderStuckAlerts(handleStuckAlert);

  const response = data as OrdersResponse | undefined;

  useEffect(() => {
    if (response?.orders) {
      setOrders(response.orders);
    }
  }, [response, setOrders]);

  if (error) {
    return (
      <Layout title="Live Order Monitor">
        <ErrorBoundary error={error instanceof Error ? error : new Error('Failed to load')} />
      </Layout>
    );
  }

  const displayOrders = response?.orders || orders;

  return (
    <Layout title="Live Order Monitor">
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex gap-4 flex-wrap">
            {(['pending', 'accepted', 'packing'] as const).map((s) => (
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
          ) : displayOrders.length > 0 ? (
            <div className="space-y-4">
              {displayOrders.map((order) => {
                const isStuck = Boolean(
                  order.pending_since &&
                    new Date().getTime() - new Date(order.pending_since).getTime() > 180000,
                );

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                      isStuck
                        ? 'border-red-500'
                        : status === 'pending'
                          ? 'border-yellow-500'
                          : 'border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            Order #{order.id.slice(0, 8)}
                          </p>
                          {isStuck && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                              <AlertTriangle size={14} />
                              STUCK
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Shop: {order.shop_id}</p>
                        <p className="text-sm text-gray-600">Customer: {order.customer_id}</p>
                        <p className="text-sm font-medium text-gray-900">
                          Created: {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          Status: <span className="font-medium capitalize">{order.status}</span>
                        </p>
                        {isStuck && (
                          <button
                            onClick={() => escalateMutation.mutate(order.id)}
                            disabled={escalateMutation.isPending}
                            className="mt-2 px-4 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Escalate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">No orders found</p>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </Layout>
  );
}
