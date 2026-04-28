import { useState } from 'react';
import { Shop, PaginationMeta } from '@/types/admin';
import { Lock, Unlock, Loader } from 'lucide-react';

interface ShopTableProps {
  data: Shop[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onSuspend: (id: string, reason: string) => void;
  onReinstate: (id: string) => void;
  isSuspendPending: boolean;
  isReinstatePending: boolean;
}

export default function ShopTable({
  data,
  pagination,
  onPageChange,
  onSuspend,
  onReinstate,
  isSuspendPending,
  isReinstatePending,
}: ShopTableProps) {
  const [suspendShopId, setSuspendShopId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const handleSuspend = (id: string) => {
    if (suspendReason.trim().length >= 10) {
      onSuspend(id, suspendReason);
      setSuspendShopId(null);
      setSuspendReason('');
    }
  };

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
                KYC Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium
                text-gray-700 uppercase tracking-wider">
                Trust Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium
                text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium
                text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((shop) => (
              <tr key={shop.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {shop.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {shop.owner_name}
                  <br />
                  <span className="text-xs text-gray-500">
                    {shop.owner_phone}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full
                    text-xs font-semibold ${
                      shop.kyc_status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : shop.kyc_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                    {shop.kyc_status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-blue-600 rounded-full"
                        style={{ width: `${shop.trust_score}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {shop.trust_score}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex px-2 py-1 rounded-full
                    text-xs font-semibold ${
                      shop.is_open
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                    {shop.is_open ? 'Open' : 'Closed'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm space-x-2">
                  {shop.is_open ? (
                    <button
                      onClick={() => setSuspendShopId(shop.id)}
                      disabled={isSuspendPending}
                      className="inline-flex items-center gap-1 px-3 py-1
                        bg-red-100 text-red-700 rounded hover:bg-red-200
                        disabled:opacity-50 transition-colors"
                    >
                      <Lock size={16} />
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => onReinstate(shop.id)}
                      disabled={isReinstatePending}
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

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-600">
          Showing {data.length} of {pagination.total} results
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md
              hover:bg-gray-50 disabled:opacity-50"
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
              hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {suspendShopId && (
        <div className="fixed inset-0 bg-black/50 flex items-center
          justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Suspend Shop
            </h3>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter suspension reason (min 10 characters)"
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-red-500 h-24
                resize-none mb-4"
            />
            <p className="text-xs text-gray-500 mb-4">
              {suspendReason.length}/500 characters
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSuspendShopId(null);
                  setSuspendReason('');
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900
                  font-medium py-2 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSuspend(suspendShopId)}
                disabled={
                  isSuspendPending ||
                  suspendReason.trim().length < 10
                }
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400
                  text-white font-medium py-2 rounded-md transition-colors
                  flex items-center justify-center gap-2"
              >
                {isSuspendPending && (
                  <Loader size={20} className="animate-spin" />
                )}
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
