import { KYCSubmission, PaginationMeta } from '@/types/admin';
interface KycQueueTableProps {
    data: KYCSubmission[];
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
}
export default function KycQueueTable({ data, pagination, onPageChange, }: KycQueueTableProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=KycQueueTable.d.ts.map