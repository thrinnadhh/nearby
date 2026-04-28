import { useState } from 'react';
import { KYCSubmission } from '@/types/admin';
import { X, Loader } from 'lucide-react';

interface KycDetailModalProps {
  kyc: KYCSubmission;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
}

export default function KycDetailModal({
  kyc,
  onClose,
  onApprove,
  onReject,
  isApprovePending,
  isRejectPending,
}: KycDetailModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleReject = () => {
    if (rejectReason.trim().length >= 10) {
      onReject(rejectReason);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh]
        overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6
          border-b border-gray-200 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            KYC Details - {kyc.shop_name}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Shop Name</h3>
              <p className="text-lg font-medium text-gray-900">
                {kyc.shop_name}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Owner Name</h3>
              <p className="text-lg font-medium text-gray-900">
                {kyc.owner_name}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Phone</h3>
              <p className="text-lg font-medium text-gray-900">
                {kyc.owner_phone}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <span className={`inline-flex px-3 py-1 rounded-full
                text-sm font-semibold ${
                  kyc.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : kyc.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                {kyc.status}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Documents</h3>
            <div className="grid grid-cols-1 gap-4">
              <DocumentViewer
                label="Aadhaar"
                url={kyc.documents.aadhaar}
              />
              <DocumentViewer
                label="GST Certificate"
                url={kyc.documents.gst}
              />
              <DocumentViewer
                label="Shop Photo"
                url={kyc.documents.shop_photo}
              />
            </div>
          </div>

          {kyc.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-900">Rejection Reason</h3>
              <p className="text-sm text-red-700 mt-1">
                {kyc.rejection_reason}
              </p>
            </div>
          )}

          {kyc.status === 'pending' && (
            <div className="border-t border-gray-200 pt-6 space-y-4">
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <button
                    onClick={onApprove}
                    disabled={isApprovePending}
                    className="flex-1 bg-green-600 hover:bg-green-700
                      disabled:bg-gray-400 text-white font-medium py-2
                      rounded-md transition-colors flex items-center
                      justify-center gap-2"
                  >
                    {isApprovePending && (
                      <Loader size={20} className="animate-spin" />
                    )}
                    Approve KYC
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white
                      font-medium py-2 rounded-md transition-colors"
                  >
                    Reject KYC
                  </button>
                </div>
              ) : (
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection reason (min 10 characters)"
                    maxLength={500}
                    className="w-full px-4 py-2 border border-gray-300
                      rounded-md focus:outline-none focus:ring-2
                      focus:ring-red-500 h-24 resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    {rejectReason.length}/500 characters
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason('');
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400
                        text-gray-900 font-medium py-2 rounded-md
                        transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={
                        isRejectPending ||
                        rejectReason.trim().length < 10
                      }
                      className="flex-1 bg-red-600 hover:bg-red-700
                        disabled:bg-gray-400 text-white font-medium py-2
                        rounded-md transition-colors flex items-center
                        justify-center gap-2"
                    >
                      {isRejectPending && (
                        <Loader size={20} className="animate-spin" />
                      )}
                      Submit Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DocumentViewerProps {
  label: string;
  url: string;
}

function DocumentViewer({ label, url }: DocumentViewerProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-2">{label}</h4>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 text-sm underline"
        >
          View Document
        </a>
      ) : (
        <p className="text-sm text-gray-500">Not provided</p>
      )}
    </div>
  );
}
