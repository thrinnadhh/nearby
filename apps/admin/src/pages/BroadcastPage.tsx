import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import { BroadcastHistoryResponse } from '@/types/admin';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Send, Loader } from 'lucide-react';

export default function BroadcastPage() {
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState<{
    title: string;
    body: string;
    target: 'customers' | 'shops' | 'delivery';
    scheduled_at: string;
  }>({
    title: '',
    body: '',
    target: 'customers',
    scheduled_at: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['broadcast-history', page],
    queryFn: () => adminApi.getBroadcastHistory(page, 20),
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createBroadcast(
        formData.title,
        formData.body,
        formData.target,
        formData.scheduled_at,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-history'] });
      setFormData({
        title: '',
        body: '',
        target: 'customers',
        scheduled_at: '',
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    },
  });
  const response = data as BroadcastHistoryResponse | undefined;
  const history = response?.broadcasts;
  const meta = response?.meta;

  if (error) {
    return (
      <Layout title="Broadcast">
        <ErrorBoundary error={error instanceof Error ? error : new Error('Failed to load')} />
      </Layout>
    );
  }

  const isFormValid =
    formData.title.length >= 5 &&
    formData.body.length >= 10 &&
    formData.target;

  return (
    <Layout title="Broadcast Campaigns">
      <ErrorBoundary>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                New Campaign
              </h2>

              {submitted && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200
                  rounded-md">
                  <p className="text-sm text-green-700">
                    Campaign created successfully!
                  </p>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    maxLength={100}
                    placeholder="Campaign title"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.title.length}/100
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={formData.body}
                    onChange={(e) =>
                      setFormData({ ...formData, body: e.target.value })
                    }
                    maxLength={500}
                    placeholder="Campaign message"
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.body.length}/500
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={formData.target}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target: e.target.value as 'customers' | 'shops' | 'delivery',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="customers">Customers</option>
                    <option value="shops">Shop Owners</option>
                    <option value="delivery">Delivery Partners</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scheduled_at: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to send immediately
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid || createMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                    text-white font-medium py-2 rounded-md transition-colors
                    flex items-center justify-center gap-2"
                >
                  {createMutation.isPending && (
                    <Loader size={20} className="animate-spin" />
                  )}
                  Send Campaign
                </button>
              </form>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700">
                  Rate limit: 1 campaign per hour
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Campaign History
              </h2>

              {isLoading ? (
                <LoadingSkeleton count={3} />
              ) : history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="border border-gray-200 rounded-lg p-4
                        hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {String(campaign.title)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            To: <span className="capitalize">
                              {String(campaign.target)}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Sent: {campaign.sent_count} users
                          </p>
                          <p className="text-xs text-gray-500">
                            Created: {new Date(String(campaign.created_at)).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="inline-block px-2 py-1 bg-blue-100
                          text-blue-800 rounded text-xs font-semibold capitalize">
                          <Send size={14} className="inline mr-1" />
                          {campaign.status || 'sent'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No campaigns yet</p>
                </div>
              )}

              {meta && (
                <div className="mt-6 flex gap-2 justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {history?.length || 0} of {meta.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-gray-100 border border-gray-300
                        rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === meta.pages}
                      className="px-4 py-2 bg-gray-100 border border-gray-300
                        rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </Layout>
  );
}
