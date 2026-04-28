import { Shop, PaginationMeta } from '@/types/admin';
interface ShopTableProps {
    data: Shop[];
    pagination: PaginationMeta;
    onPageChange: (page: number) => void;
    onSuspend: (id: string, reason: string) => void;
    onReinstate: (id: string) => void;
    isSuspendPending: boolean;
    isReinstatePending: boolean;
}
export default function ShopTable({ data, pagination, onPageChange, onSuspend, onReinstate, isSuspendPending, isReinstatePending, }: ShopTableProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ShopTable.d.ts.map