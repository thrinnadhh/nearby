import { KYCSubmission } from '@/types/admin';
interface KycDetailModalProps {
    kyc: KYCSubmission;
    onClose: () => void;
    onApprove: () => void;
    onReject: (reason: string) => void;
    isApprovePending: boolean;
    isRejectPending: boolean;
}
export default function KycDetailModal({ kyc, onClose, onApprove, onReject, isApprovePending, isRejectPending, }: KycDetailModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=KycDetailModal.d.ts.map