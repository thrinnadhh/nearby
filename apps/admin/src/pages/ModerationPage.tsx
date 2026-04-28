import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import { ModerationItem, ModerationQueueResponse } from '@/types/admin';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Check, X } from 'lucide-react';

export default function ModerationPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['moderation', page],
    queryFn: () => adminApi.getModerationQueue(page, 20),
    staleTime: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, contentType }: { id: string; contentType: 'review' | 'product' }) =>
      adminApi.approveModerationItem(id, contentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, contentType }: { id: string; contentType: 'review' | 'product' }) =>
      adminApi.removeModerationItem(id, contentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
    },
  });
  const response = data as ModerationQueueResponse | undefined;
  const queue = response?.moderation_queue;
  const meta = response?.meta;

  if (error) {
    return (
      <Layout title="Moderation">
        <ErrorBoundary error={error instanceof Error ? error : new Error('Failed to load')} />
      </Layout>
    );
  }

  return (
    <Layout title="Content Moderation">
      <ErrorBoundary>
        <div className="space-y-6">
          {isLoading ? (
            <LoadingSkeleton count={5} />
          ) : queue && queue.length > 0 ? (
            <div className="space-y-4">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow p-6 border-l-4
                    border-yellow-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 bg-gray-100
                          text-gray-800 rounded text-xs font-semibold
                          capitalize">
                          {String(item.content_type)}
                        </span>
                        <span className="inline-block px-2 py-1 bg-red-100
                          text-red-800 rounded text-xs font-semibold">
                          {item.flag_count} flags
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Reason: {String(item.reason)}
                      </p>
                      {item.content && (
                        <p className="text-sm text-gray-700 mt-2 italic">
                          "{String(item.content).slice(0, 100)}..."
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Created: {new Date(String(item.created_at)).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() =>
                          approveMutation.mutate({
                            id: String(item.id),
                            contentType: item.content_type,
                          })
                        }
                        disabled={approveMutation.isPending}
                        className="inline-flex items-center gap-1 px-4 py-2
                          bg-green-600 text-white rounded hover:bg-green-700
                          disabled:opacity-50 transition-colors text-sm
                          font-medium"
                      >
                        <Check size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          removeMutation.mutate({
                            id: String(item.id),
                            contentType: item.content_type,
                          })
                        }
                        disabled={removeMutation.isPending}
                        className="inline-flex items-center gap-1 px-4 py-2
                          bg-red-600 text-white rounded hover:bg-red-700
                          disabled:opacity-50 transition-colors text-sm
                          font-medium"
                      >
                        <X size={16} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">No flagged content</p>
            </div>
          )}

          {meta && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {queue?.length || 0} of {meta.total} results
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
